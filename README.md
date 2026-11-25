# FixMate Server

Backend API for FixMate - Home Repair & Maintenance Service Booking Platform.

Live API: https://fixmate-server-4w1b.onrender.com
Client: https://fixmate-client-virid.vercel.app

## Tech Stack
- Node.js + 【entity-Express¦canonical_name=Express】
- 【entity-MongoDB¦canonical_name=MongoDB】 + Mongoose
- Better Auth (Google + Email)
- Stripe (Card Payment)
- JWT Auth Middleware

## Main API Endpoints
- GET /api/services - All services
- GET /api/services/:id - Single service
- POST /api/bookings - Create booking
- GET /api/bookings - All bookings
- POST /api/payments - Create payment / Stripe checkout
- POST /api/payments/webhook - Stripe webhook
- GET /api/auth/* - Auth routes

## Run Locally
```bash
npm install
npm run dev
