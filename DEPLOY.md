# FixMate Server Deploy - Render

Live: https://fixmate-server-4w1b.onrender.com

## Deploy Steps
1. 【entity-GitHub¦canonical_name=GitHub】 e push koro - main branch
2. Render Dashboard > fixmate-server > Manual Deploy > Deploy latest commit
3. Env Variables Render e bosao:
   - MONGODB_URI
   - BETTER_AUTH_SECRET
   - BETTER_AUTH_URL
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
   - CLIENT_URL=https://fixmate-client-virid.vercel.app

## Stripe Webhook
- Stripe Dashboard > Developers > Webhooks
- Endpoint URL: https://fixmate-server-4w1b.onrender.com/api/payments/webhook
- Event: checkout.session.completed
- Webhook Secret Render er env e bosate hobe
