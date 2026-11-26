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

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://fixmate-client-virid.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    // Allow localhost, specific vercel domains, or any *.vercel.app URL
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Keep it flexible for dev
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // PATCH মেথড Allow করা হলো
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-role',
    'x-user-email',
    'x-user-name'
  ], // কাস্টম হেডারগুলো Allow করা হলো
  credentials: true,
  optionsSuccessStatus: 204,
};

// এই একটি লাইনই CORS এবং OPTIONS রিকোয়েস্ট হ্যান্ডেল করার জন্য যথেষ্ট
app.use(cors(corsOptions));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('FixMate Server Running');
});

app.use('/api/services', servicesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);

// ---- Users ----
function idQuery(id: string): any {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { _id: id as any }, { id: id as any }] };
  }
  return { $or: [{ _id: id as any }, { id: id as any }] };
}

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

app.patch('/api/users/:id', async (req: any, res) => {
  try {
    const db = await getDb();
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ message: 'Role is required' });
    const id = req.params.id;
    const q = idQuery(id);
    let r1: any = await db.collection('user').updateOne(q, { $set: { role, updatedAt: new Date() } });
    if (r1.matchedCount === 0) {
      r1 = await db.collection('users').updateOne(q, { $set: { role, updatedAt: new Date() } });
    }
    if (r1.matchedCount === 0) {
      for (const col of ['user', 'users']) {
        const all = await db.collection(col).find({}).toArray();
        const found = all.find((u: any) => String(u._id) === String(id) || String(u.id) === String(id));
        if (found) {
          await db.collection(col).updateOne({ _id: found._id }, { $set: { role, updatedAt: new Date() } });
          r1.matchedCount = 1;
          break;
        }
      }
    }
    if (r1.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User role updated successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
