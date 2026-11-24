import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
dotenv.config();

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
