import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../config/db';
import { AuthRequest, verifyRole, verifyToken } from '../middlewares/auth';

const router = Router();

// Booking koro - customer
router.post('/', verifyToken, verifyRole('customer'), async (req: AuthRequest, res) => {
  const db = await getDb();
  const { serviceId, date, address, phone, note } = req.body;
  const userId = req.user?.sub || req.user?.id;
  const service = await db.collection('services').findOne({ _id: new ObjectId(String(serviceId)) });
  if (!service) return res.status(404).json({ message: 'Service pai nai' });

  const result = await db.collection('bookings').insertOne({
    serviceId: new ObjectId(String(serviceId)),
    serviceTitle: service.title,
    price: service.price,
    customerId: userId,
    customerEmail: req.user?.email,
    date,
    address,
    phone,
    note,
    status: 'pending',
    paymentStatus: 'unpaid',
    createdAt: new Date(),
  });
  res.status(201).json({ insertedId: result.insertedId });
});

// Amar booking - customer
router.get('/my', verifyToken, verifyRole('customer'), async (req: AuthRequest, res) => {
  const db = await getDb();
  const userId = req.user?.sub || req.user?.id;
  const bookings = await db
    .collection('bookings')
    .find({ customerId: userId })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(bookings);
});

// Technician er booking
router.get('/technician', verifyToken, verifyRole('technician'), async (req: AuthRequest, res) => {
  const db = await getDb();
  const userId = req.user?.sub || req.user?.id;
  const bookings = await db
    .collection('bookings')
    .find({ technicianId: userId })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(bookings);
});

// Status change - technician
router.patch('/:id/status', verifyToken, verifyRole('technician'), async (req, res) => {
  const db = await getDb();
  const { status } = req.body;
  const allowed = ['assigned', 'in-progress', 'completed'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Status thik na' });
  await db
    .collection('bookings')
    .updateOne(
      { _id: new ObjectId(String(req.params.id)) },
      { $set: { status, updatedAt: new Date() } },
    );
  res.json({ message: 'Status update hoise' });
});

// Sob booking - admin
router.get('/', verifyToken, verifyRole('admin'), async (req, res) => {
  const db = await getDb();
  const bookings = await db.collection('bookings').find().sort({ createdAt: -1 }).toArray();
  res.json(bookings);
});

export default router;
