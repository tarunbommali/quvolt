# Quvolt System Design

Quvolt is a high-concurrency, real-time SaaS platform for hosting interactive quizzes. 

---

## 1. High-Level Architecture (HLD)

The platform is divided into three major architectural pillars:

### Core Services
1. **Frontend (React + Vite + Zustand)**: 
   - Handles the Host Dashboard (Studio), live session orchestration, and participant mobile/desktop views. 
   - Connects to the backend via REST for CRUD, and Socket.IO for live gameplay.
2. **Backend API (Node.js + Express)**: 
   - Handles user auth, quiz templates, and AI generation.
   - Manages the authoritative session state machine.
3. **Payment Service (Node.js)**: 
   - Handles Razorpay webhooks, plan entitlement enforcement, and subscription lifecycles.

### Data Layer
- **MongoDB**: Primary persistence store (Users, Templates, Subscriptions, Session histories).
- **Redis**: Fast ephemeral store for active live sessions, distributed locks, rate limiting, and pub/sub.

### Real-Time Engine
- **Socket.IO**: Bi-directional event stream. 
- See `REALTIME_ENGINE.md` for a deep dive into synchronization and the event model.

---

## 2. Low-Level Design (LLD)

### 2.1 State Management (Client)
The frontend relies heavily on isolated domain stores powered by **Zustand**. 
- `useQuizRealtimeStore`: The single source of truth for the active live session (timer, options, participants).
- `useAuthStore`: Global user authentication and RBAC.
- `useCacheStore`: Caches static quiz metadata.
- `useSocketStore`: The bridge that registers socket listeners and pipes them to the domain stores via the `socketEventBus`.

### 2.2 Template Configuration System
Instead of hardcoding game logic, Quvolt uses a **Template System** that configures session rules:
- **Timer config**: Question duration, auto-advance toggle.
- **Scoring config**: Points per correct answer, negative marking (plan-gated).
- **Security config**: Anti-cheat features (plan-gated).

When a session starts, the backend snapshots the template rules into Redis, making them immutable for that specific session.

### 2.3 Subscription & Limits Model
Features and capacity are controlled by the user's subscription tier (`Free`, `Creator`, `Teams`). 
- **Entitlement Checks**: Middleware (`checkQuizCreationLimit`, `requireCreatorPlan`) blocks unauthorized access based on the current active plan stored in `user.subscription.plan`.

### 2.4 Event-Driven Gameplay
- The server drives the clock. Clients do not advance questions themselves.
- A centralized timer worker (Redis-backed) emits ticks to all nodes via pub/sub.
- Idempotency guards prevent duplicate timer intervals if multiple start commands are issued concurrently.

---

## 3. Data Models

### User
```typescript
{
  _id: ObjectId,
  email: string,
  role: 'host' | 'participant' | 'admin',
  subscription: {
    plan: 'free' | 'creator' | 'teams',
    status: 'active' | 'past_due' | 'canceled'
  }
}
```

### QuizTemplate (formerly Quiz)
```typescript
{
  _id: ObjectId,
  hostId: ObjectId,
  title: string,
  config: {
    timerMode: 'auto' | 'tutor',
    negativeMarking: boolean,
    pointsPerQuestion: number
  },
  questions: [{ text: string, options: string[], correctOption: number }]
}
```

### QuizSession
```typescript
{
  _id: ObjectId,
  quizId: ObjectId, // ref to QuizTemplate
  roomCode: string,
  status: 'waiting' | 'live' | 'completed' | 'aborted',
  currentQuestionIndex: number,
  participants: [{ userId, score }]
}
```

---

## 4. Key Workflows

### Session Launch Flow
1. Host triggers `POST /api/quiz/:id/start-live`.
2. Backend creates `QuizSession` in Mongo.
3. Backend snapshots Template config into Redis.
4. Server emits `session:start` to room.
5. Clients receive `session:start` and emit `session:syncState`.
6. Server sends `question:sync` and `timer:start`.

### Webhook Flow (Payments)
1. Razorpay fires webhook to `payment-service`.
2. Service verifies webhook signature.
3. Service enforces idempotency by checking `processed_events` table.
4. Updates user's `subscription.plan`.

---

## 5. Scaling Architecture & Future Scope

Quvolt's architecture is designed to evolve gracefully from a single-server MVP to a distributed, highly-available SaaS platform.

### 5.1 Evolution Stages

#### Stage 1: MVP (Current)
- **Infra:** 1 Node.js server, MongoDB Atlas, Redis (local/cloud).
- **Focus:** Stable real-time engine, expiry-based timers, late-join recovery, sequence guards, and subscription enforcement.

#### Stage 2: Multi-Server (Next Phase)
- **Infra:** Load Balancer (Nginx/Cloud LB) → Multiple Node.js instances → Shared Redis.
- **Key Change:** Integrate `socket.io-redis` adapter to synchronize WebSocket events across servers.
- **Focus:** Horizontal scaling, Pub/Sub integration.

#### Stage 3: High Scale (Future)
- **Infra:** CDN (Cloudflare) for static assets, auto-scaling server groups, managed Redis, and message queues.
- **Key Change:** Introduce **BullMQ** (Redis-based queue) to offload heavy tasks (AI generation, analytics processing, payout webhooks).
- **Focus:** Event-driven decoupling, high availability, and performance under massive load.

### 5.2 System Design Concepts Applied

1. **Caching & Ephemeral State:** 
   - Strict separation of data: MongoDB for persistent truth (templates, billing), Redis for volatile speed (leaderboards, active sessions).
2. **CAP Theorem:**
   - Real-time quiz gameplay prioritizes **Availability** and **Partition Tolerance**. The quiz must not stop, even if eventual consistency is needed for analytics.
3. **Rate Limiting:**
   - Tiered security: Strict limits on AI generation and auth, moderate limits on session joins to prevent DDoS attacks while maintaining UX.
4. **Event-Driven Resilience:**
   - `answer:submitted` → queue → `scoring worker` → updates Redis → broadcasts `leaderboard:update`. Decoupling prevents slow DB writes from blocking the WebSocket thread.

### 5.3 Performance Strategy
- **Redis First:** All live gameplay reads/writes (leaderboard updates, session state) hit Redis, not MongoDB.
- **Snapshot System:** Session configurations are snapshotted to Redis at launch, avoiding complex DB joins during live gameplay.
- **Async Processing:** Post-session analytics and email notifications are offloaded to background workers.
