# Final QA Checklist

## Auth

- Signup as customer works
- Signup as shopkeeper works with location fields
- Login works for customer
- Login works for shopkeeper
- Forgot password works
- OTP verify works
- Reset password works

## Discovery

- Nearby shops load from live backend
- Shop search/filter works
- Shop details page loads

## Orders

- Customer can create offline order
- Customer can create online order
- Razorpay checkout opens for online order
- Successful online payment marks order as paid
- Shopkeeper sees incoming order
- Shopkeeper can accept/reject order
- Shopkeeper can move order through statuses
- Reschedule request and resolution both work
- Live tracking updates are visible

## Admin

- Admin bootstrap account can login
- Admin overview loads without 403

## Reliability

- `npm run smoke` passes
- `backend-run.err.log` stays clean during normal flows
- `backend/server.err.log` stays clean during normal flows

## Production Config

- `ALLOW_DEBUG_OTP=false`
- MongoDB production URI set
- JWT secret set
- Razorpay live keys set
- Resend sender and API key set
- Twilio account credentials set
