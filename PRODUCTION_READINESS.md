# PressKardu Production Readiness

This checklist is the path from MVP to a launch that can safely target 10,000 customers and 100+ shopkeepers.

## Current Status

- Feature-complete enough for MVP testing.
- Not yet proven for 10,000 customers.
- Needs production infrastructure, monitoring, and load testing before public scale.

## Required Before Scale

### Hosting

- Use a paid backend instance with no cold-start sleeping.
- Use HTTPS-only frontend and backend URLs.
- Set separate production environment variables.
- Configure `CORS_ORIGIN` to the production frontend URL.
- Use a `JWT_SECRET` with at least 32 characters.

### Database

- Use MongoDB Atlas production cluster, not a local database.
- Enable automated backups.
- Enable slow query monitoring.
- Confirm all indexes are built successfully after deployment.
- Watch query latency for shop listing, order listing, notifications, and admin pages.

### Indexes Added In Code

- Users: phone lookup, role listing, password reset expiry.
- Shops: phone lookup, approval queue, pricing/speed/rating listing, subscription filtering, text search.
- Orders: customer order history, shopkeeper order queue, monthly quota checks, payout/payment admin checks, auto-cancel checks.
- Notifications: unread count and recent notification feed.
- Phone OTP sessions: unique phone lookup plus verification/cooldown queries.

### OTP And Email

- Configure a real SMS provider for production.
- Configure a real email provider for production.
- Verify sender email/domain.
- Keep OTP rate limits enabled.
- Monitor OTP provider failures.
- In production, do not depend on console OTP fallback.

### Payments

- Use Razorpay live keys only after test payments pass.
- Verify payment signatures on backend.
- Verify webhooks before marking paid or settled.
- Add alerts for payment creation and verification failures.

### Monitoring

- Add error tracking for frontend and backend.
- Add uptime checks for `/api/health` and `/api/ready`.
- Track API latency and error rates.
- Track MongoDB slow queries and connection usage.
- Track OTP and payment provider failures.

### Load Testing

Test these flows in stages: 100, 500, 1,000, 5,000, then 10,000 customer traffic pattern.

- Signup and login.
- OTP send and verify.
- Shop listing and nearby search.
- Order creation.
- Customer dashboard.
- Shopkeeper dashboard/orders.
- Admin shop approval queue.

Stop increasing load when p95 API latency is too high, error rate rises, or database CPU/connection usage is unsafe.

### Security

- Keep auth rate limits enabled.
- Keep OTP attempt limits enabled.
- Validate file upload type and size.
- Protect admin routes by role.
- Rotate secrets if leaked.
- Review logs for fake signup/shop spam.

## Useful Endpoints

- `GET /api/health`: service, database, OTP, payment, and config status.
- `GET /api/ready`: returns `503` with blockers if production-critical dependencies are missing.

## Launch Decision

PressKardu can be considered ready for the 10k target only after:

- Production deploy is stable.
- Database indexes are built.
- OTP and payment providers are live.
- Monitoring is active.
- Load testing passes the expected traffic pattern.
- Admin/support process is ready for fake shops, failed payments, and customer complaints.
