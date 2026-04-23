# Quvolt

A SaaS real-time quiz platform built with an OOP architecture. Hosts create and run live quiz sessions; participants join, answer MCQs, and see a live leaderboard.

---

## 🏛️ Architecture Overview

Quvolt has been refactored into a **modular, OOP-driven architecture** using standard design patterns:
- **State Pattern**: `SessionManager` & `SessionStates` manage the quiz lifecycle (`Waiting` → `Live` → `Completed`).
- **Observer Pattern**: `EventBus` provides a decoupled backbone for domain events.
- **Bridge Pattern**: `SocketManager` bridges domain events to Socket.io broadcasts.
- **Factory/Strategy Patterns**: Dynamic scoring and scaling adapters.

---

## 📁 Repository Layout

```
quvolt/
  client/           React + Vite frontend
  server/           Core API + OOP Real-Time Engine + Redis
  payment-service/  Razorpay subscriptions, plan gating & payouts
  docs/             Architecture, LLD, API, and engine references
```

---

## 🛠️ Tech Stack

| Layer      | Tech                                              |
|------------|---------------------------------------------------|
| Frontend   | React 19, Vite, Zustand, Socket.IO client         |
| Backend    | Node.js, Express, OOP Core, Mongoose, Socket.IO   |
| Realtime   | Socket.IO + EventBus + Redis Sharded Store        |
| Payments   | Razorpay via payment-service                      |
| Operations | PM2, Nginx, Docker Compose                        |

---

## 🚀 Local Setup

```bash
# 1. Copy env
copy .env.example .env

# 2. Install dependencies
npm install
npm run install:all

# 3. Start all services (Concurrent)
npm run dev
```

Default ports: client `5173` · server `5000` · payment-service `5001`

---

## 🔄 Session Lifecycle

```
draft → waiting → live → completed
                       → aborted
```

| Status       | Route              | Core Action |
|--------------|--------------------|-------------|
| `draft`      | `/launch/:id`      | Create Session |
| `waiting`    | `/invite/:id`      | Gather Participants |
| `live`       | `/live/:id`        | authoritative Play |
| `completed`  | `/results/:id`     | Analytics & Payouts |

---

## 🧪 Tests & Validation

```bash
npm run validate:full   # Run all lint/build/tests
npm run test:server      # Backend unit + integration
npm run test:payment     # Payment logic tests
npm run test:realtime-smoke # Socket & Timer integrity
```

---

## 🚢 Deployment

- **EC2 Guide**: `DEPLOYMENT_AWS.md`
- **PM2 Config**: `ecosystem.config.js`

```bash
npm run prod:start   # start PM2 cluster
npm run prod:status  # check health
npm run prod:save    # persist after reboot
```

## 📊 Analytics Engine (O(1) Scale)

Quvolt features an enterprise-grade analytics pipeline designed for 10k+ concurrent users:
- **Incremental O(1) Updates**: Answers trigger atomic `$inc` updates bypassing heavy MongoDB aggregation loops.
- **Question Quality Score (QQS)**: An algorithmic score out of 100 weighing accuracy (50%), drop-off engagement (30%), and speed (20%).
- **Priority Fix Order**: Automatically ranks and sorts the worst-performing questions for hosts.
- **Participant Drilldown**: Merges real-time global averages with per-user timelines for detailed Mistake Analysis (e.g., distinguishing between Concept Gaps and Careless Errors).

---

## 📚 Documentation Index

| File | Contents |
|------|----------|
| `docs/SYSTEM_DESIGN.MD` | High & Low-level architecture & patterns |
| `docs/REALTIME_ENGINE.md` | Socket events, state machine & timer sync |
| `docs/API_REFERENCE.md` | Full REST API surface & contracts |
| `docs/ROADMAP.md` | Feature roadmap & history |
| `DEPLOYMENT_AWS.md` | Production deployment on AWS EC2 |
| `FRONTEND_GUIDE.md` | Client architecture & Zustand stores |
