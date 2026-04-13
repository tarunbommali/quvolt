# QuizBolt

QuizBolt is a real-time quiz platform with organizer and participant flows, live session orchestration, analytics, payment support, and AI-assisted quiz generation.

## Repository Layout

- client: React + Vite frontend
- server: main API and realtime orchestration service
- payment-service: payment, subscriptions, and revenue service
- docs: architecture and API references

## Current Project Status (April 2026)

Implemented and active:
- backend-owned session lifecycle state machine with guarded transitions
- resolver-based organizer routing by session status
- realtime session orchestration over Socket.IO
- payment order/verify/webhook flow with idempotent handling
- host onboarding and payout state support
- subscription and failed-job workers (toggleable by env)
- AI quiz generation with 5% difficulty distribution controls

Validation in place:
- server unit and integration suites for lifecycle, auth, and middleware contracts
- payment-service Jest suite with coverage
- client lint, build, and e2e harness

Still required before full production sign-off:
- live gateway validation in staging (checkout, webhook retries, refunds, payouts)
- sustained load and concurrency testing for live sessions

## Session Lifecycle

Session states:
- draft
- scheduled
- waiting
- live
- completed
- aborted

Organizer route mapping:
- draft -> /launch/:id
- scheduled or waiting -> /invite/:id
- live -> /live/:id
- completed -> /results/:id
- aborted -> /studio

## Tech Stack

- Frontend: React 19, Vite 7, Tailwind, Zustand, React Query, Socket.IO client
- Backend: Node.js, Express, Mongoose, Socket.IO, Redis, JWT
- Payments: Razorpay via payment-service
- AI: OpenAI-compatible generation endpoint

## Local Setup

1. Copy env template:

```bash
copy .env.example .env
```

2. Install dependencies from repo root:

```bash
npm install
npm run install:all
```

3. Start all services from root:

```bash
npm run dev
```

Default local ports:
- client: 5173
- server: 5000
- payment-service: 5001

## Test and Validation Commands

From repo root:

```bash
npm run lint:client
npm run build:client
npm run test:server
npm run test:payment
npm run test:realtime-smoke
npm run validate:full
```

From server:

```bash
cd server
node --test tests
npm run test:integration
```

## Deployment Docs

- EC2 production guide: DEPLOYMENT_AWS.md
- PM2 process file: ecosystem.config.js
- Future container stack option: docker-compose.yml

## Production Commands (PM2)

Use these on EC2 production hosts:

```bash
npm run prod:stop
npm run prod:start
npm run prod:save
npm run prod:status
```

Do not use npm run dev on production hosts.

## References

- client README: client/README.md
- server README: server/README.md
- payment README: payment-service/README.md
- documentation index: docs/README.md
- architecture docs: docs/QUIZBOLT_HLD.md and docs/QUIZBOLT_LLD.md
- API surface: docs/QUIZBOLT_API_LIST.md
- release roadmap: docs/ROADMAP.md
