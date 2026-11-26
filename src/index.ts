import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
dotenv.config();

import { ObjectId } from 'mongodb';
import { getDb } from './config/db';
import bookingsRouter from './routes/bookings';
import paymentsRouter from './routes/payments';
import servicesRouter from './routes/services';

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ['http://localhost:3000', process.env.CLIENT_URL || 'http://localhost:3000'],
    credentials: true,
  }),
);
app.use(express.json());

app.get('/', (req, res) => {
  res.send('FixMate Server Running');
});

app.use('/api/services', servicesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);

// ---- Users - chilo na, tai Total Users 0 dekhaito ----
function idQuery(id: string): any {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { _id: id as any }, { id: id as any }] };
  }
  return { $or: [{ _id: id as any }, { id: id as any }] };
}

// GET all users - Better Auth "user" collection theke, na pele "users" theke
app.get('/api/users', async (req, res) => {
  try {
    const db = await getDb();
    let users: any[] = [];
    try {
      users = await db.collection('user').find({}).toArray();
    } catch {}
    if (users.length === 0) {
      try {
        users = await db.collection('users').find({}).toArray();
      } catch {}
    }
    // _id na thakle id ke _id banay dao, client _id chay
    const out = users.map((u: any) => ({
      ...u,
      _id: u._id ? String(u._id) : u.id,
      id: u.id || (u._id ? String(u._id) : undefined),
    }));
    res.json(out);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH user role - admin dashboard theke role change
app.patch('/api/users/:id', async (req: any, res) => {
  try {
    const db = await getDb();
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ message: 'Role is required' });
    const q = idQuery(req.params.id);
    // Dui collection ei try koro
    let r1: any = await db.collection('user').updateOne(q, { $set: { role, updatedAt: new Date() } });
    if (r1.matchedCount === 0) {
      await db.collection('users').updateOne(q, { $set: { role, updatedAt: new Date() } });
    }
    res.json({ message: 'User role updated successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
