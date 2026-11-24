import { Router } from 'express';
import { ObjectId } from 'mongodb';
import Stripe from 'stripe';
import { getDb } from '../config/db';
import { AuthRequest, verifyToken } from '../middlewares/auth';

const router = Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY .env e nai');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any });
}

// Checkout banano - customer
router.post('/create-checkout', verifyToken, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe();
    const db = await getDb();
    const { bookingId } = req.body;
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(bookingId) });
    if (!booking) return res.status(404).json({ message: 'Booking pai nai' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'bdt',
            product_data: { name: booking.serviceTitle || 'FixMate Service' },
            unit_amount: Number(booking.price) * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      metadata: { bookingId: String(bookingId) },
    });
    res.json({ url: session.url });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

// Payment success verify - client theke call hobe
router.get('/verify', async (req, res) => {
  try {
    const stripe = getStripe();
    const { session_id, bookingId } = req.query as any;
    if (!session_id || !bookingId) return res.status(400).json({ message: 'Data nai' });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === 'paid') {
      const db = await getDb();
      await db
        .collection('bookings')
        .updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: { paymentStatus: 'paid', updatedAt: new Date() } },
        );
      return res.json({ paid: true });
    }
    res.json({ paid: false });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
