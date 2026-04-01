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
```

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, a default admin account is bootstrapped automatically on backend startup.

Frontend `.env` supports:

```env
VITE_API_BASE_URL=/api
```

Use a full backend URL in production if frontend and backend are deployed on different domains.

Production examples:

- [backend/.env.production.example](C:\Users\moto g\OneDrive\Desktop\PressKardu\backend\.env.production.example)
- [frontend/.env.production.example](C:\Users\moto g\OneDrive\Desktop\PressKardu\frontend\.env.production.example)
- [frontend/vercel.json](C:\Users\moto g\OneDrive\Desktop\PressKardu\frontend\vercel.json)

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

## Notes

- OTP delivery falls back to console logs if no provider is configured.
- Online payment flow now supports Razorpay order creation plus backend-side signature verification.
- For deployment steps and production env guidance, see [DEPLOYMENT.md](C:\Users\moto g\OneDrive\Desktop\PressKardu\DEPLOYMENT.md).
- Final manual release checks are listed in [QA_CHECKLIST.md](C:\Users\moto g\OneDrive\Desktop\PressKardu\QA_CHECKLIST.md).
