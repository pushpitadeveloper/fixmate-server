import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../config/db';
import { AuthRequest, verifyRole, verifyToken } from '../middlewares/auth';

const router = Router();

function normalizeStatus(s: string) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}
function toDisplayStatus(s: string) {
  const n = normalizeStatus(s);
  if (n === 'in-progress' || n === 'in_progress') return 'In Progress';
  if (n === 'pending') return 'Pending';
  if (n === 'requested') return 'Requested';
  if (n === 'accepted') return 'Accepted';
  if (n === 'completed') return 'Completed';
  if (n === 'rejected') return 'Rejected';
  if (n === 'cancelled' || n === 'canceled') return 'Cancelled';
  return s;
}
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  requested: ['accepted', 'rejected', 'cancelled'],
  accepted: ['in-progress', 'cancelled', 'rejected'],
  'in-progress': ['completed', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

function getUserId(req: AuthRequest) {
  return req.user?.sub || req.user?.id || req.user?.user?.id || req.user?.user?.sub;
}
function getUserEmail(req: AuthRequest) {
  return req.user?.email || req.user?.user?.email || '';
}

router.post('/', verifyToken, verifyRole('customer'), async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const {
      serviceId,
      date,
      scheduledDate,
      scheduledTime,
      timeSlot,
      address,
      phone,
      note,
      problem,
      serviceMode,
    } = req.body;
    const finalDate = scheduledDate || date;
    const finalTime = scheduledTime || timeSlot || '';
    if (!serviceId || !finalDate || !address || !phone)
      return res.status(400).json({ message: 'Service, date, address and phone are required' });
    if (!ObjectId.isValid(String(serviceId)))
      return res.status(404).json({ message: 'Service not found' });
    const service = await db
      .collection('services')
      .findOne({ _id: new ObjectId(String(serviceId)) });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    const userId = getUserId(req);
    const userEmail = getUserEmail(req);
    const existing = await db.collection('bookings').findOne({
      serviceId: new ObjectId(String(serviceId)),
      $and: [
        { $or: [{ customerId: userId }, { customerEmail: userEmail }] },
        { $or: [{ date: finalDate }, { scheduledDate: finalDate }] },
      ],
      status: {
        $nin: ['Cancelled', 'cancelled', 'Rejected', 'rejected', 'Completed', 'completed'],
      },
    });
    if (existing)
      return res
        .status(409)
        .json({ message: 'You already have a booking for this service on this date.' });
    const result = await db.collection('bookings').insertOne({
      serviceId: new ObjectId(String(serviceId)),
      serviceTitle: service.title,
      price: service.price ?? service.basePrice ?? 0,
      basePrice: service.basePrice ?? service.price ?? 0,
      customerId: userId,
      customerEmail: userEmail,
      customerName: req.user?.name || req.user?.user?.name || '',
      date: finalDate,
      scheduledDate: finalDate,
      scheduledTime: finalTime,
      timeSlot: finalTime,
      address,
      phone,
      problem: problem || note || '',
      note: note || problem || '',
      serviceMode: serviceMode || service.serviceMode || 'Home Visit',
      status: 'Pending',
      paymentStatus: 'Unpaid',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    res.status(201).json({ insertedId: result.insertedId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/my', verifyToken, verifyRole('customer'), async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const userId = getUserId(req);
    const userEmail = getUserEmail(req);
    const bookings = await db
      .collection('bookings')
      .find({ $or: [{ customerId: userId }, { customerEmail: userEmail }] })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/technician', verifyToken, verifyRole('technician'), async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const userId = getUserId(req);
    const userEmail = getUserEmail(req);
    const bookings = await db
      .collection('bookings')
      .find({
        $or: [
          { technicianId: userId },
          { technicianEmail: userEmail },
          { technicianId: { $exists: false } },
          { technicianId: null },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    if (!ObjectId.isValid(String(req.params.id)))
      return res.status(404).json({ message: 'Booking not found' });
    const booking = await db
      .collection('bookings')
      .findOne({ _id: new ObjectId(String(req.params.id)) });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ booking });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.patch(
  '/:id/status',
  verifyToken,
  verifyRole('technician', 'admin'),
  async (req: AuthRequest, res) => {
    try {
      const db = await getDb();
      if (!ObjectId.isValid(String(req.params.id)))
        return res.status(404).json({ message: 'Booking not found' });
      const { status, finalAmount } = req.body;
      if (!status) return res.status(400).json({ message: 'Status is required' });
      const booking: any = await db
        .collection('bookings')
        .findOne({ _id: new ObjectId(String(req.params.id)) });
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      const current = normalizeStatus(booking.status);
      const next = normalizeStatus(status);
      const allowed = ALLOWED_TRANSITIONS[current] || [];
      if (!allowed.includes(next)) {
        return res
          .status(400)
          .json({
            message: `Cannot change status from ${booking.status} to ${toDisplayStatus(status)}. Please follow the correct steps.`,
          });
      }
      const update: any = { status: toDisplayStatus(status), updatedAt: new Date() };
      if (next === 'completed' && finalAmount !== undefined) {
        if (Number(finalAmount) <= 0)
          return res.status(400).json({ message: 'Final amount must be greater than 0' });
        update.finalAmount = Number(finalAmount);
        update.paymentStatus = 'Unpaid';
      }
      if (next === 'accepted') {
        update.technicianId = getUserId(req);
        update.technicianEmail = getUserEmail(req);
      }
      await db
        .collection('bookings')
        .updateOne({ _id: new ObjectId(String(req.params.id)) }, { $set: update });
      res.json({ message: 'Status updated successfully' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
);

router.patch('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    if (!ObjectId.isValid(String(req.params.id)))
      return res.status(404).json({ message: 'Booking not found' });
    const booking: any = await db
      .collection('bookings')
      .findOne({ _id: new ObjectId(String(req.params.id)) });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const { status, finalAmount, cancelReason, paymentStatus } = req.body;
    const update: any = { updatedAt: new Date() };
    if (status) {
      const current = normalizeStatus(booking.status);
      const next = normalizeStatus(status);
      const allowed = ALLOWED_TRANSITIONS[current] || [];
      if (next === 'cancelled' && ['completed', 'rejected', 'cancelled'].includes(current)) {
        return res.status(400).json({ message: `Cannot cancel a ${booking.status} booking.` });
      }
      if (next !== 'cancelled' && !allowed.includes(next) && current !== next) {
        return res
          .status(400)
          .json({
            message: `Cannot change status from ${booking.status} to ${toDisplayStatus(status)}.`,
          });
      }
      update.status = toDisplayStatus(status);
      if (next === 'completed' && finalAmount !== undefined) {
        if (Number(finalAmount) <= 0)
          return res.status(400).json({ message: 'Final amount must be greater than 0' });
        update.finalAmount = Number(finalAmount);
        update.paymentStatus = 'Unpaid';
      }
      if (next === 'cancelled' && cancelReason) update.cancelReason = cancelReason;
    }
    if (finalAmount !== undefined && !status) update.finalAmount = Number(finalAmount);
    if (paymentStatus) update.paymentStatus = paymentStatus;
    await db
      .collection('bookings')
      .updateOne({ _id: new ObjectId(String(req.params.id)) }, { $set: update });
    res.json({ message: 'Booking updated successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', verifyToken, verifyRole('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const bookings = await db.collection('bookings').find().sort({ createdAt: -1 }).toArray();
    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
