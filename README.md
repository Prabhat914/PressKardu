# PressKardu

PressKardu is a local press-service marketplace with:

- customer signup/login and password reset
- nearby press shop discovery
- shopkeeper order management
- admin overview metrics
- notifications, reschedule flow, live tracking, and payment verification

## Workspaces

- Frontend: [frontend/package.json](C:\Users\moto g\OneDrive\Desktop\PressKardu\frontend\package.json)
- Backend: [backend/package.json](C:\Users\moto g\OneDrive\Desktop\PressKardu\backend\package.json)

## Local Setup

1. Ensure MongoDB is running locally on `mongodb://127.0.0.1:27017/presskardu`, or update `MONGO_URI` in `backend/.env`.
2. Start the app from the workspace root:

```bat
run-dev.cmd
```

Alternative:

```bat
backend.cmd
cd frontend
npm.cmd run dev -- --host 0.0.0.0
```

## Environment

Backend `.env` supports:

```env
PORT=5000
HOST=127.0.0.1
MONGO_URI=mongodb://127.0.0.1:27017/presskardu
JWT_SECRET=change-me
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_NAME=PressKardu Admin
ALLOW_DEBUG_OTP=false
PAYMENT_PROVIDER=manual-signature
PAYMENT_CURRENCY=INR
PAYMENT_WEBHOOK_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
PHONE_OTP_COOLDOWN_SECONDS=45
PHONE_VERIFICATION_MAX_AGE_MINUTES=10
```

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, a default admin account is bootstrapped automatically on backend startup.
Only that reserved `ADMIN_EMAIL` account can keep the `admin` role; any other admin-role user is downgraded on startup.

Frontend `.env` supports:

```env
VITE_API_BASE_URL=/api
BACKEND_PUBLIC_URL=
```

For Vercel deployments, keep `VITE_API_BASE_URL=/api` and set `BACKEND_PUBLIC_URL` so the built-in `/api` proxy can forward requests to your deployed backend without browser CORS issues.
Use a full `VITE_API_BASE_URL` only if you intentionally want the browser to call the backend directly.

Production examples:

- [backend/.env.production.example](C:\Users\moto g\OneDrive\Desktop\PressKardu\backend\.env.production.example)
- [frontend/.env.production.example](C:\Users\moto g\OneDrive\Desktop\PressKardu\frontend\.env.production.example)
- [frontend/vercel.json](C:\Users\moto g\OneDrive\Desktop\PressKardu\frontend\vercel.json)
- [frontend/api/[...path].js](C:\Users\moto g\OneDrive\Desktop\PressKardu\frontend\api\[...path].js)

## Smoke Test

After the backend is running:

```bat
node scripts\smoke-test.mjs
```

This checks:

- health endpoint
- signup
- login
- authenticated order fetch
- phone OTP request/verify when `ALLOW_DEBUG_OTP=true`
- shopkeeper signup + admin approval when debug OTP and admin credentials are available

## Notes

- OTP delivery falls back to console logs if no provider is configured.
- `/api/health` now reports OTP provider readiness so you can confirm whether email/SMS is using a real provider or console fallback.
- Online payment flow now supports Razorpay order creation plus backend-side signature verification.
- For deployment steps and production env guidance, see [DEPLOYMENT.md](C:\Users\moto g\OneDrive\Desktop\PressKardu\DEPLOYMENT.md).
- Final manual release checks are listed in [QA_CHECKLIST.md](C:\Users\moto g\OneDrive\Desktop\PressKardu\QA_CHECKLIST.md).
