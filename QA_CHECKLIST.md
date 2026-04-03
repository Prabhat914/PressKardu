# Final QA Checklist

## Auth

- Signup as customer works
- Signup as shopkeeper works with location fields and shop photo
- Shopkeeper signup requires phone OTP verification
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
- Admin sees OTP provider readiness
- Admin cannot reject or keep pending without a review note
- Admin approval notifies the shopkeeper
- Reported shop stays visible until an admin manually changes its status

## Shop Verification

- New shop stays pending until admin approval
- Approved shop becomes visible in discovery
- Rejected shop shows admin note in shopkeeper dashboard
- Changing shop phone requires OTP verification before save
- Changing phone/address/map/photo does not auto-pend an already approved shop
- Re-approval after shop edits works

## Reliability

- `npm run smoke` passes
- `backend-run.err.log` stays clean during normal flows
- `backend/server.err.log` stays clean during normal flows

## Production Config

- `ALLOW_DEBUG_OTP=false`
- MongoDB production URI set
- JWT secret set
- Razorpay live keys set
- At least one email OTP provider configured, or fallback accepted explicitly
- At least one SMS OTP provider configured, or fallback accepted explicitly
