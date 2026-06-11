# Deployment Guide

This project has two deployable parts:

- `frontend` for the Vite/React client
- `backend` for the Express/MongoDB API

## Important

The backend auto-start logic inside [frontend/vite.config.js](C:\Users\moto g\OneDrive\Desktop\PressKardu\frontend\vite.config.js) is for local development only. In production, deploy frontend and backend as separate services.

## Vercel Setup

Use Vercel for the `frontend` only.

Why:

- the current frontend is a static Vite app and is a good fit for Vercel
- the current backend is a long-running Express + MongoDB API and is not structured as Vercel serverless functions

The frontend is now prepared for Vercel with:

- [frontend/vercel.json](C:\Users\moto g\OneDrive\Desktop\PressKardu\frontend\vercel.json)
- [frontend/.env.production.example](C:\Users\moto g\OneDrive\Desktop\PressKardu\frontend\.env.production.example)
- [frontend/api/[...path].js](C:\Users\moto g\OneDrive\Desktop\PressKardu\frontend\api\[...path].js)

Vercel project settings:

1. Import this repository in Vercel
2. Set the Root Directory to `frontend`
3. Add `BACKEND_PUBLIC_URL` as an environment variable pointing to your backend origin, without `/api`
4. Keep `VITE_API_BASE_URL=/api`
5. Deploy

For React Router, the rewrite in `frontend/vercel.json` sends non-API routes to `index.html`.

## Render Setup

Use Render for the `backend`.

Prepared files:

- [render.yaml](C:\Users\moto g\OneDrive\Desktop\PressKardu\render.yaml)
- [backend/.env.production.example](C:\Users\moto g\OneDrive\Desktop\PressKardu\backend\.env.production.example)

Render setup steps:

1. Create a new Web Service from this repository
2. Set Root Directory to `backend`, or use the included `render.yaml`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Set environment variables from `backend/.env.production.example`
6. Set `CORS_ORIGIN` to your Vercel frontend URL
7. If you use Vercel preview deployments, the backend now also accepts the same project's preview URLs automatically when `CORS_ORIGIN` points at that Vercel project.
8. Deploy and confirm `/api/health` returns `ok`

## Backend Checklist

1. Provision MongoDB and set `MONGO_URI`.
2. Set a strong `JWT_SECRET`.
3. Set `HOST=0.0.0.0` if your hosting platform requires external binding.
4. Configure admin bootstrap if needed:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_NAME`
5. Configure payment verification:
   - `PAYMENT_PROVIDER`
   - `PAYMENT_CURRENCY`
   - `PAYMENT_WEBHOOK_SECRET` or `RAZORPAY_KEY_SECRET`
6. Configure OTP provider if you do not want console fallback:
   - `OTP_SMS_PROVIDER=2factor` and `TWOFACTOR_API_KEY` for India signup phone OTP, or
   - `TWILIO_*` for signup phone OTP, or
   - `RESEND_*` / `BREVO_*` for optional email flows like forgot password, or
   - webhook URLs
   - Signup requires phone OTP only. Resend requires a verified domain before it can send email to normal users.
   - `TWOFACTOR_TEMPLATE_NAME` is optional and defaults to `OTP1`; set it to the exact approved template name from your 2Factor dashboard if you created a custom template.
   - `TWILIO_PHONE_NUMBER` must be a Twilio-owned sender number from your Twilio console, not your personal mobile number.
7. Keep `ALLOW_DEBUG_OTP=false` in production.
8. Set `PHONE_OTP_COOLDOWN_SECONDS` and `PHONE_VERIFICATION_MAX_AGE_MINUTES` to match your verification policy.
9. Set `CORS_ORIGIN` to the frontend domain that should be allowed.
10. Optional: set `ALLOW_VERCEL_PREVIEW_ORIGINS=true` only if you intentionally want to allow any `https://*.vercel.app` preview origin.

Recommended backend start command:

```bash
node server.js
```

## Frontend Checklist

1. Recommended on Vercel: set `BACKEND_PUBLIC_URL` to your backend origin and keep:

```env
VITE_API_BASE_URL=/api
```

This uses the bundled Vercel proxy and avoids browser-side CORS failures.

2. Only if you intentionally want the browser to call the backend directly, set `VITE_API_BASE_URL` to your backend public URL plus `/api`.

## Pre-Deploy QA

1. Run backend and frontend locally.
2. Run:

```bash
node scripts/smoke-test.mjs
```

3. Manually verify:
   - signup
   - shopkeeper phone OTP and pending approval
   - login
   - forgot password
   - nearby shops
   - order create
   - order status update
   - admin overview
   - admin approve/reject/pending with notes

## Suggested Production Env

Backend:

```env
PORT=5000
HOST=0.0.0.0
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<strong-random-secret>
CORS_ORIGIN=https://your-frontend-domain.vercel.app
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong-admin-password>
ADMIN_NAME=PressKardu Admin
ALLOW_DEBUG_OTP=false
PAYMENT_PROVIDER=manual-signature
PAYMENT_CURRENCY=INR
PAYMENT_WEBHOOK_SECRET=<gateway-secret>
PHONE_OTP_COOLDOWN_SECONDS=45
PHONE_VERIFICATION_MAX_AGE_MINUTES=10
OTP_SMS_PROVIDER=2factor
TWOFACTOR_API_KEY=<2factor-api-key>
TWOFACTOR_TEMPLATE_NAME=OTP1
TWILIO_ACCOUNT_SID=<twilio-account-sid>
TWILIO_AUTH_TOKEN=<twilio-auth-token>
TWILIO_PHONE_NUMBER=<twilio-owned-sender-phone>
```

Frontend:

```env
BACKEND_PUBLIC_URL=https://your-backend-domain.example.com
VITE_API_BASE_URL=/api
```
