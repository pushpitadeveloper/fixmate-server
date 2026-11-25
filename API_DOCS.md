# FixMate API Docs

Base URL: https://fixmate-server-4w1b.onrender.com

## Services
- GET /api/services - All services
- GET /api/services/:id - Single service by id / slug
- POST /api/services - Create service (Technician / Admin)
- PATCH /api/services/:id - Update service
- DELETE /api/services/:id - Delete service

## Bookings
- POST /api/bookings - Create booking
  Body: serviceId, name, email, phone, address, date, timeSlot, problem
- GET /api/bookings - All bookings (role wise filtered)
- PATCH /api/bookings/:id - Update status (Accepted / In Progress / Completed)

## Payments
- POST /api/payments - Create Stripe checkout session
- POST /api/payments/webhook - Stripe webhook, updates paymentStatus to Paid
- GET /api/payments - Payment history

## Auth
- POST /api/auth/sign-up - Email sign up
- POST /api/auth/sign-in - Email sign in
- GET /api/auth/session - Current session
