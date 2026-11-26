# FixMate - Server

Express and MongoDB API for FixMate. Handles services, bookings, payments and users. Used by the FixMate client.

**Live Server:** https://fixmate-server-4w1b.onrender.com
**Live Client:** https://fixmate-client-virid.vercel.app
**Client Repo:** https://github.com/pushpitadeveloper/fixmate-client
**Server Repo:** https://github.com/pushpitadeveloper/fixmate-server

## Features

- Services - list with search, category, mode, status filter and sort, get one by ID or slug, create, update, delete
- Bookings - create, list, update status, cancel
- Payments - create payment record, list payments
- Users - list users, update user role
- CORS enabled for localhost and live client
- MongoDB with native driver

## Tech Stack

- Node.js, Express, TypeScript
- MongoDB native driver
- Render for deployment

## API Endpoints

### Services

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/services | List services with filter, search, sort |
| GET | /api/services/:id | Get one service by ID or slug |
| POST | /api/services | Create service |
| PATCH | /api/services/:id | Update service, approve or reject |
| DELETE | /api/services/:id | Delete service |

### Bookings

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/bookings | List bookings |
| POST | /api/bookings | Create booking |
| PATCH | /api/bookings/:id | Update booking status |

### Payments

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/payments | List payments |
| POST | /api/payments | Create payment |

### Users

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/users | List users |
| PATCH | /api/users/:id | Update user role |

## Test Accounts

These accounts exist in the live database:

| Role | Email | Password |
| --- | --- | --- |
| Admin | testadmin@gmail.com | Admin123! |
| Technician | testtech@gmail.com | Tech123! |
| Customer | testlive456@gmail.com | Admin123! |

## Run Locally

```bash
git clone https://github.com/pushpitadeveloper/fixmate-server
cd fixmate-server
npm install
```

Create `.env` in the server root:

```env
PORT=5000
MONGODB_URI=your-mongodb-uri
CLIENT_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-here
```

Then run:

```bash
npm run dev
```

Server runs on http://localhost:5000

Health check: GET / returns `FixMate Server Running`

## Build

```bash
npm run build
```

## Folder Structure

```text
src/
  config/
    db.ts
  middlewares/
    auth.ts
  routes/
    services.ts
    bookings.ts
    payments.ts
  index.ts
```

## Notes

- Services PATCH is used by Admin Dashboard for Approve and Reject.
- Users PATCH is used by Admin Dashboard for role change.
- No manual database change is needed for Approve, Reject or role change.
