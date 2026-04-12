# QuizBolt Payment Service

This service manages quiz payments and revenue analytics for QuizBolt.

Status snapshot (April 2026):
- order, verify, and webhook flow is active
- webhook idempotency and split-transfer logic are implemented
- subscription and failed-job workers are env-toggle controlled

## Responsibilities

- Create payment orders
- Compute marketplace split (platform fee + host payout)
- Verify payment signatures
- Track payment status for quiz access
- Process payment webhooks
- Aggregate revenue metrics by quiz/time
- Manage host linked accounts and payout status

## Tech Stack

- Node.js
- Express
- Mongoose (MongoDB)
- Razorpay SDK

## Setup

Uses shared root `.env`.

Required environment variables include:

- `DATABASE_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `WEBHOOK_SECRET`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `PLATFORM_FEE_PERCENT` (default `20`)
- `ROUTE_SPLIT_ENABLED` (`true` or `false`, default `true`)
- `SUBSCRIPTION_JOBS_ENABLED` (`true` to run cron jobs on this instance, default `false`)

## Run

```bash
cd payment-service
npm install
npm run dev
```

For production:

```bash
npm start
```

## Migration Scripts

```bash
npm run migrate:schema:dry
npm run migrate:schema:apply
```

Run dry first, then apply after reviewing output.

## API Routes (high-level)

- `/payment/create-order`
- `/payment/verify`
- `/payment/status/:quizId`
- `/payment/status/batch`
- `/payment/webhook`
- `/payment/host/account`
- `/payment/host/payout-summary`
- `/payment/revenue/*`

## Notes

- Payment records are keyed by `razorpayOrderId` for idempotency.
- Revenue controllers aggregate only completed payments.
- Split logic is config driven using `PLATFORM_FEE_PERCENT`.
- If Route split is enabled and a host has an active linked account, host share is sent via Route transfer instructions at order creation.
- If host linked account is not active, payout mode falls back to manual pending settlement.

## Integration Context (Current)

The main server now enforces strict lifecycle state transitions and ownership checks.
For paid quiz flows, payment status checks should be consumed only after lifecycle status permits participant join.

Recommended staging validations:
- paid quiz access when session is `waiting` or `live`
- webhook idempotency on duplicate delivery
- payout summary integrity under repeated verify callbacks

Deployment reference:
- root EC2 runbook: ../DEPLOYMENT_AWS.md
