# Quvolt

A SaaS real-time quiz platform. Hosts create and run live quiz sessions; participants join, answer MCQs, and see a live leaderboard.

---

## Repository Layout

```
quiz/
  client/           React + Vite frontend
  server/           Express API + Socket.IO + Redis
  payment-service/  Razorpay subscriptions & payouts
  docs/             Architecture, API, and engine references
```

---

## Tech Stack

| Layer      | Tech                                              |
|------------|---------------------------------------------------|
| Frontend   | React 19, Vite, Zustand, Socket.IO client         |
| Backend    | Node.js, Express, Mongoose, Socket.IO, Redis      |
| Realtime   | Socket.IO + Redis session store + pub/sub         |
| Payments   | Razorpay via payment-service                      |
| AI         | OpenAI-compatible quiz generation                 |

---

## Local Setup

```bash
# 1. Copy env
copy .env.example .env

# 2. Install
npm install
npm run install:all

# 3. Start all services
npm run dev
```

Default ports: client `5173` · server `5000` · payment-service `5001`

---

## Session Lifecycle

```
draft → waiting → live → completed
                       → aborted
```

Host page routing:

| Status       | Route              |
|--------------|--------------------|
| `draft`      | `/launch/:id`      |
| `waiting`    | `/invite/:id`      |
| `live`       | `/live/:id`        |
| `completed`  | `/results/:id`     |
| `aborted`    | `/studio`          |

---

## Features

- Template-based quiz configuration (timer, scoring, negative marks, anti-cheat)
- Server-authoritative timer with clock-drift correction
- Late-join recovery (snapshot includes active question + remaining time)
- Idempotent session start (no duplicate timer resets)
- Plan-gated features (Free / Creator / Teams)
- AI quiz generation with difficulty distribution
- Leaderboard, answer distribution, fastest-user tracking

---

## Tests & Validation

```bash
npm run lint:client
npm run build:client
npm run test:server
npm run test:payment
npm run test:realtime-smoke
npm run validate:full
```

---

## Deployment

- EC2 guide: `DEPLOYMENT_AWS.md`
- PM2 config: `ecosystem.config.js`
- Docker option: `docker-compose.yml`

```bash
npm run prod:start   # start all processes
npm run prod:status  # check PM2 status
npm run prod:save    # save PM2 process list
```

---

## Documentation Index

| File                          | Contents                              |
|-------------------------------|---------------------------------------|
| `docs/REALTIME_ENGINE.md`     | Real-time engine, events, state flow  |
| `docs/QUIZBOLT_HLD.md`        | High-level architecture               |
| `docs/QUIZBOLT_LLD.md`        | Low-level design & module breakdown   |
| `docs/QUIZBOLT_API_LIST.md`   | Full REST API surface                 |
| `docs/ROADMAP.md`             | Feature roadmap                       |
| `FRONTEND_GUIDE.md`           | Client architecture guide             |
| `DEPLOYMENT_AWS.md`           | Production deployment on EC2          |
