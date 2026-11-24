import { Router } from 'express';
import { ObjectId } from 'mongodb';
import Stripe from 'stripe';
import { getDb } from '../config/db';
import { AuthRequest, verifyRole, verifyToken } from '../middlewares/auth';

const router = Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is missing in .env');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any });
}

// All payments - admin - for Transactions + Total Revenue
router.get('/', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const payments = await db.collection('payments').find().sort({ createdAt: -1 }).toArray();
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// My payments - customer
router.get('/my', verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const email = req.user?.email || req.user?.user?.email;
    const userId = req.user?.sub || req.user?.id || req.user?.user?.id;
    const payments = await db.collection('payments').find({ $or: [{ customerEmail: email }, { customerId: userId }] }).sort({ createdAt: -1 }).toArray();
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/create-checkout', verifyToken, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe();
    const db = await getDb();
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'Booking ID is required' });
    if (!ObjectId.isValid(String(bookingId))) return res.status(404).json({ message: 'Booking not found' });
    const booking: any = await db.collection('bookings').findOne({ _id: new ObjectId(String(bookingId)) });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    // Duplicate payment block
    if (String(booking.paymentStatus || "").toLowerCase() === "paid") return res.status(400).json({ message: 'This booking is already paid.' });
    if (["Cancelled", "cancelled", "Rejected", "rejected"].includes(String(booking.status))) return res.status(400).json({ message: 'Cannot pay for a cancelled or rejected booking.' });
    // FIX: finalAmount use koro, na hole technician er set kora dam nibe na
    const amount = Number(booking.finalAmount ?? booking.price ?? booking.basePrice ?? 0);
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid payment amount' });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'bdt',
          product_data: { name: booking.serviceTitle || 'FixMate Service' },
          unit_amount: amount * 100,
        },
        quantity: 1,
      }],
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel?bookingId=${bookingId}`,
      metadata: { bookingId: String(bookingId) },
    } as any);
    res.json({ url: session.url });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const stripe = getStripe();
    const { session_id, bookingId } = req.query as any;
    if (!session_id || !bookingId) return res.status(400).json({ message: 'Session ID and Booking ID are required' });
    if (!ObjectId.isValid(String(bookingId))) return res.status(404).json({ message: 'Booking not found' });
    const db = await getDb();
    // Challenge 4 - Duplicate block: same session already verified?
    const existingPayment: any = await db.collection('payments').findOne({ sessionId: String(session_id) });
    if (existingPayment) {
      const booking: any = await db.collection('bookings').findOne({ _id: new ObjectId(String(bookingId)) });
      return res.json({ paid: true, alreadyVerified: true, transactionId: existingPayment.transactionId, amount: existingPayment.amount, booking });
    }
    const booking: any = await db.collection('bookings').findOne({ _id: new ObjectId(String(bookingId)) });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.paymentStatus || "").toLowerCase() === "paid") {
      return res.json({ paid: true, alreadyVerified: true, transactionId: booking.transactionId || String(session_id), amount: booking.finalAmount ?? booking.price, booking });
    }
    const session: any = await stripe.checkout.sessions.retrieve(session_id as string);
    if (session.payment_status === 'paid') {
      const amount = Number(session.amount_total ? session.amount_total / 100 : (booking.finalAmount ?? booking.price ?? 0));
      const transactionId = session.payment_intent ? String(session.payment_intent) : String(session.id);
      // Double-check before insert - race condition duplicate block
      const raceCheck = await db.collection('payments').findOne({ sessionId: String(session_id) });
      if (!raceCheck) {
        await db.collection('payments').insertOne({
          bookingId: new ObjectId(String(bookingId)),
          serviceTitle: booking.serviceTitle || "",
          customerEmail: booking.customerEmail || "",
          customerId: booking.customerId || "",
          sessionId: String(session_id),
          transactionId,
          amount,
          currency: "BDT",
          status: "Paid",
          paymentStatus: "Paid",
          createdAt: new Date(),
        });
      }
      await db.collection('bookings').updateOne(
        { _id: new ObjectId(String(bookingId)) },
        { $set: { paymentStatus: 'Paid', transactionId, updatedAt: new Date() } },
      );
      const updatedBooking: any = await db.collection('bookings').findOne({ _id: new ObjectId(String(bookingId)) });
      return res.json({ paid: true, transactionId, amount, booking: updatedBooking });
    }
    res.json({ paid: false });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

// Stripe webhook - duplicate block by event ID
router.post('/webhook', async (req, res) => {
  try {
    const db = await getDb();
    const event: any = req.body;
    if (!event?.id) return res.status(400).json({ message: "Invalid webhook event" });
    // Duplicate block - same event already processed?
    const already = await db.collection('payments').findOne({ webhookEventId: String(event.id) });
    if (already) return res.json({ received: true, duplicate: true });
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;
      const bookingId = session?.metadata?.bookingId;
      const sessionId = session?.id;
      if (bookingId && ObjectId.isValid(String(bookingId))) {
        const dupSession = await db.collection('payments').findOne({ sessionId: String(sessionId) });
        if (!dupSession) {
          const booking: any = await db.collection('bookings').findOne({ _id: new ObjectId(String(bookingId)) });
          if (booking) {
            const amount = Number(session.amount_total ? session.amount_total / 100 : (booking.finalAmount ?? booking.price ?? 0));
            await db.collection('payments').insertOne({
              bookingId: new ObjectId(String(bookingId)),
              serviceTitle: booking.serviceTitle || "",
              customerEmail: booking.customerEmail || "",
              sessionId: String(sessionId),
              transactionId: session.payment_intent ? String(session.payment_intent) : String(sessionId),
              webhookEventId: String(event.id),
              amount, currency: "BDT", status: "Paid", paymentStatus: "Paid",
              createdAt: new Date(),
            });
            await db.collection('bookings').updateOne(
              { _id: new ObjectId(String(bookingId)) },
              { $set: { paymentStatus: 'Paid', updatedAt: new Date() } },
            );
          }
        }
      }
    }
    res.json({ received: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
