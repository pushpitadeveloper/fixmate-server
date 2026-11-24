# FixMate - Server

FixMate server - Express + TypeScript + MongoDB

## API
- GET /api/services - Sob service
- POST /api/services - Service banao (Admin)
- GET /api/services/:id - Ekta service
- POST /api/bookings - Booking koro (Customer)
- GET /api/bookings/my - Amar bookings
- GET /api/bookings/technician - Technician er kaj
- PATCH /api/bookings/:id/status - Status update
- POST /api/payments/create-checkout - Stripe checkout
- GET /api/payments/verify - Payment verify

## Tech
- Express + TypeScript
- MongoDB
- Stripe
- JWT / BetterAuth token verify

## Run Locally
```bash
npm install
npm run dev
```
Server: http://localhost:5000

## Env - .env
```
PORT=5000
MONGODB_URI=tomar_mongo_uri
CLIENT_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_tomar_key
JWT_SECRET=tomar_secret
```

## Live
- Server:
