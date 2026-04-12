# QuizBolt Low Level Design (LLD)

## 1. Purpose and Scope
This document provides implementation-level design for QuizBolt and maps architecture to current code.
Some sections describe target-state expansion; those should be treated as forward-looking.

Current implementation baseline:
- Monorepo services: `client`, `server`, `payment-service`
- Shared root `.env` for runtime configuration
- Backend-owned lifecycle state machine and guarded transitions
- Resolver-driven organizer routing on frontend

This document includes:
- Modular folder structure for 50K-100K concurrent user scale
- Complete MongoDB schema design with performance indexes
- Exact Redis key patterns for realtime state, locks, and rate limiting
- Socket.IO event contracts with optimized payloads
- Core answer processing flow (step-by-step logic)
- Queue design for async processing (BullMQ Phase 1)
- Validation layer strategy (JOI/ZOD schemas)
- Security module breakdown and anti-cheat controls
- Analytics pipeline architecture
- Kubernetes pod deployment structure

This LLD is the single source of truth for implementation and links to concrete code references in the codebase.

### 1.1 Current Implementation Snapshot (2026-04)

This repository implements lifecycle and security contracts with these concrete modules:

- Session state machine: `server/utils/sessionStateMachine.js`
- Lifecycle orchestration: `server/controllers/quizController.js`, `server/services/quiz.service.js`
- Route protection: `server/middleware/auth.js` (`protect`, `authorize`, `requireQuizOwnership`)
- Lifecycle routes: `server/routes/quizRoutes.js`
- Frontend resolver + guard: `client/src/utils/sessionRouteResolver.js`, `client/src/components/RouteGuard.jsx`

Canonical lifecycle map in code:
- `draft -> /launch/:id`
- `scheduled|waiting -> /invite/:id`
- `live -> /live/:id`
- `completed -> /results/:id`
- `aborted -> /studio`

Current status wording used across docs:
- Implemented and active:
  - backend-owned session lifecycle state machine with guarded transitions
  - resolver-based organizer routing by session status
  - realtime session orchestration over Socket.IO
  - payment order/verify/webhook flow with idempotent handling
  - host onboarding and payout state support
  - subscription and failed-job workers (toggleable by env)
  - AI quiz generation with 5% difficulty distribution controls
- Validation in place:
  - server unit and integration suites for lifecycle, auth, and middleware contracts
  - payment-service Jest suite with coverage
  - client lint, build, and e2e harness
- Still required before full production sign-off:
  - live gateway validation in staging (checkout, webhook retries, refunds, payouts)
  - sustained load and concurrency testing for live sessions

Contract and test lock:
- Integration lifecycle tests: `server/tests/sessionLifecycle.test.js`
- Auth/RBAC lifecycle tests: `server/tests/sessionAuth.test.js`
- Middleware contract tests: `server/tests/middlewareContract.test.js`

---

## 2. Production-Grade Folder Structure

### 2.1 Server Application Structure
```bash
server/
├── modules/                          # Domain-driven module structure
│   ├── auth/
│   │   ├── auth.controller.js        # Login, register, token refresh
│   │   ├── auth.service.js           # JWT generation, refresh token rotation
│   │   ├── auth.routes.js            # POST /auth/register, /auth/login
│   │   ├── auth.validation.js        # JOI schemas for auth payloads
│   │   └── auth.middleware.js        # verifyToken, attachUserContext
│   │
│   ├── quiz/
│   │   ├── quiz.controller.js        # CRUD endpoints
│   │   ├── quiz.service.js           # Quiz lifecycle, question management
│   │   ├── quiz.routes.js
│   │   ├── quiz.validation.js
│   │   └── quiz.model.js             # Mongoose Quiz schema
│   │
│   ├── session/
│   │   ├── session.controller.js     # Start, pause, resume, end
│   │   ├── session.service.js        # Session lifecycle orchestration
│   │   ├── session.routes.js
│   │   ├── session.validation.js
│   │   └── session.model.js          # Mongoose QuizSession schema
│   │
│   ├── submission/
│   │   ├── submission.controller.js  # Answer submission REST endpoints
│   │   ├── submission.service.js     # Answer scoring, validation
│   │   ├── submission.routes.js
│   │   ├── submission.validation.js  # Answer payload schema
│   │   └── submission.model.js       # Mongoose Submission schema
│   │
│   ├── realtime/
│   │   ├── quiz.socket.js            # Socket.IO namespace handlers
│   │   ├── quiz.events.js            # Event constants and types
│   │   ├── room.manager.js           # Room membership and state
│   │   ├── leaderboard.manager.js    # ZSET operations and top-N cache
│   │   └── anti-cheat.js             # Real-time cheat detection
│   │
│   ├── analytics/
│   │   ├── analytics.controller.js
│   │   ├── analytics.service.js      # Query pre-aggregated collections
│   │   ├── analytics.routes.js
│   │   └── aggregation.pipeline.js   # MongoDB aggregation definitions
│   │
│   ├── gamification/
│   │   ├── gamification.controller.js
│   │   ├── gamification.service.js   # XP, streaks, levels, badges
│   │   └── gamification.routes.js
│   │
│   ├── ai/
│   │   ├── ai.controller.js
│   │   ├── ai.service.js             # Prompt engineering, generation
│   │   ├── ai.routes.js
│   │   └── ai.validation.js
│   │
│   ├── payment/
│   │   ├── payment.routes.js         # Proxy to payment-service
│   │   └── payment.proxy.js
│   │
│   └── subscription/
│       ├── subscription.controller.js
│       ├── subscription.service.js   # Plan metadata, eligibility checks
│       └── subscription.routes.js
│
├── shared/                           # Cross-module utilities
│   ├── middleware/
│   │   ├── errorHandler.js           # Global error handler
│   │   ├── validate.js               # JOI/ZOD validation middleware
│   │   ├── auth.js                   # JWT verification
│   │   ├── correlationId.js          # Trace context propagation
│   │   ├── rateLimiter.js            # User/IP rate limiting
│   │   └── tenant.js                 # Multi-tenant context binding
│   │
│   ├── utils/
│   │   ├── codeGenerator.js          # Session code generation
│   │   ├── crypto.js                 # Hashing and encryption
│   │   ├── scoring.js                # Score computation logic
│   │   ├── constants.js              # Shared constants
│   │   ├── logger.js                 # Structured logging
│   │   └── idempotency.js            # Idempotency key handling
│   │
│   ├── errors/
│   │   ├── AppError.js               # Base error class
│   │   ├── ValidationError.js
│   │   ├── AuthError.js
│   │   ├── NotFoundError.js
│   │   └── QuotaExceededError.js
│   │
│   └── types/
│       └── index.d.ts                # TypeScript definitions (optional)
│
├── infra/                            # Infrastructure and external integrations
│   ├── redis/
│   │   ├── redis.client.js           # Redis connection and pool
│   │   ├── redis.adapter.js          # Socket.IO Redis adapter
│   │   ├── cache.js                  # Cache wrapper with TTL
│   │   └── locks.js                  # Redis-based distributed locks
│   │
│   ├── db/
│   │   ├── db.js                     # MongoDB connection
│   │   ├── mongoose.config.js        # Schema definitions
│   │   └── migrations.js             # Schema migration utilities
│   │
│   ├── queue/
│   │   ├── queue.js                  # BullMQ queue initialization
│   │   ├── workers/
│   │   │   ├── submission.worker.js  # Answer event consumer
│   │   │   ├── analytics.worker.js   # Aggregation worker
│   │   │   ├── payment.worker.js     # Payment event reconciliation
│   │   │   └── deadletter.worker.js  # DLQ reprocessor
│   │   └── jobs/
│   │       ├── processSubmission.js  # Job handler definitions
│   │       ├── aggregateMetrics.js
│   │       └── syncPaymentEvents.js
│   │
│   ├── config/
│   │   ├── env.js                    # Environment validation
│   │   ├── database.js               # DB config
│   │   ├── redis.js                  # Redis config
│   │   ├── razorpay.js               # Payment gateway config
│   │   └── feature-flags.js          # Feature flag engine
│   │
│   └── observability/
│       ├── logger.js                 # Winston/Pino wrapper
│       ├── metrics.js                # Prometheus client
│       ├── tracing.js                # OpenTelemetry setup
│       └── health.js                 # Health check endpoints
│
├── server.js                         # App entry point
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### 2.2 Payment-Service Folder Structure
```bash
payment-service/
├── modules/
│   ├── payment/
│   │   ├── payment.controller.js
│   │   ├── payment.service.js
│   │   ├── payment.routes.js
│   │   ├── payment.validation.js
│   │   └── payment.model.js
│   │
│   ├── subscription/
│   │   ├── subscription.controller.js
│   │   ├── subscription.service.js   # Plan and renewal logic
│   │   ├── subscription.routes.js
│   │   └── subscription.model.js
│   │
│   ├── webhook/
│   │   ├── webhook.handler.js        # Razorpay webhook consumer
│   │   └── webhook.validation.js     # Signature verification
│   │
│   └── revenue/
│       ├── revenue.controller.js
│       └── revenue.service.js        # Reporting and aggregates
│
├── infra/
│   ├── razorpay/ (as in current codebase)
│   ├── db/
│   ├── queue/
│   ├── config/
│   └── observability/
│
└── tests/
    ├── unit/
    └── integration/
```

### 2.3 Client Folder Structure
```bash
client/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── useAuth.js
│   │   │   └── auth.service.js
│   │   │
│   │   ├── quiz/
│   │   │   ├── QuizList.jsx
│   │   │   ├── QuizEditor.jsx
│   │   │   ├── useQuiz.js
│   │   │   └── quiz.service.js
│   │   │
│   │   ├── room/
│   │   │   ├── JoinRoom.jsx          # Room entry UI
│   │   │   ├── QuizRoom.jsx          # Live room with realtime
│   │   │   ├── useRoom.js            # Room lifecycle hook
│   │   │   ├── useSocket.js          # Socket connection
│   │   │   └── room.service.js
│   │   │
│   │   ├── leaderboard/
│   │   │   ├── Leaderboard.jsx       # Display top-N
│   │   │   └── leaderboard.service.js
│   │   │
│   │   ├── analytics/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── QuizStats.jsx
│   │   │   └── analytics.service.js
│   │   │
│   │   ├── gamification/
│   │   │   ├── XPProgress.jsx
│   │   │   ├── Badges.jsx
│   │   │   └── gamification.service.js
│   │   │
│   │   └── billing/
│   │       ├── Billing.jsx
│   │       ├── Plans.jsx
│   │       └── billing.service.js
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Loading.jsx
│   │   │   └── Error.jsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useApi.js             # HTTP hook
│   │   │   ├── useLocalStorage.js
│   │   │   └── useDebounce.js
│   │   │
│   │   ├── services/
│   │   │   ├── api.client.js         # Axios instance
│   │   │   └── socket.client.js      # Socket.IO wrapper
│   │   │
│   │   ├── utils/
│   │   │   ├── format.js
│   │   │   ├── validate.js
│   │   │   └── constants.js
│   │   │
│   │   └── styles/
│   │       └── tailwind.config.js
│   │
│   └── App.jsx
```

---

## 3. MongoDB Schema Design (Production Optimized)

#---

## 11. Deployment Architecture (Kubernetes)

### 11.1 Pod Structure
```bash
# API Gateway
- Pod: api-gateway-xxxx
  Container: nginx/envoy
  Resources: 0.5 CPU, 256MB RAM
  Replicas: 3 (auto-scale to 10 on spike)

# BFF/API Service
- Pod: api-service-xxxx
- Container: node:18-alpine
- Environment: NODE_ENV=production
- Resources: 1 CPU, 512MB RAM
- Replicas: 5 (scale on request latency)
- Health check: GET /health (must return 200)
- Readiness: Wait 10s after startup

# Realtime Service 
- Pod: realtime-service-xxxx
- Container: node:18-alpine
- Resources: 2 CPU, 1GB RAM (larger for websocket)
- Replicas: 8 (scale on socket_count)
- Special config: sticky sessions disabled (state in Redis)
- Health check: WebSocket echo test

# Worker Service
- Pod: worker-service-xxxx
- Container: node:18-alpine
- Resources: 1 CPU, 512MB RAM
- Replicas: 3 (scale on queue depth)
- Workers: submission, analytics, payment, dlq

# Payment Service
- Pod: payment-service-xxxx
- Container: node:18-alpine
- Resources: 0.5 CPU, 256MB RAM
- Replicas: 2 (scale conservatively)
- Critical for revenue: no aggressive killing

# Redis Cluster
- StatefulSet: redis-node-0, redis-node-1, ..., redis-node-5
- Storage: 10GB per node (tune for session + leaderboard)
- Sentinel replicas: 3 for failover

# MongoDB
- StatefulSet: mongodb-0, mongodb-1, mongodb-2
- Storage: 100GB per node
- Replication: 3-node replica set
- Backup: daily snapshots to S3
```

### 11.2 Deployment YAML Example (API Service)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      affinity:
        # Spread across nodes
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - api-service
                topologyKey: kubernetes.io/hostname
      containers:
        - name: api
          image: QuizBolt/api:v1.2.3
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 3000
            - name: metrics
              containerPort: 9090
          env:
            - name: NODE_ENV
              value: production
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: db-url
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: redis-config
                  key: url
          resources:
            requests:
              cpu: 1
              memory: 512Mi
            limits:
              cpu: 2
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
      terminationGracePeriodSeconds: 30
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 5
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 11.3 Pod Disruption Budget (High Availability)
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: realtime-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: realtime-service

---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: payment-service
```

---

## 12. Core API Modules (Detailed Implementation)
Files:
- controllers/authController.js
- routes/authRoutes.js
- middleware/auth.js
- middleware/validate.js

Responsibilities:
- Register/login/token-based auth flows
- Role-aware access checks for protected resources

---

## 3. MongoDB Schema Design (Production Optimized)

### 3.1 User Schema
```javascript
{
  _id: ObjectId,
  tenantId: String,           // Multi-tenant isolation key
  name: String,
  email: String,              // Unique per tenant
  passwordHash: String,       // bcrypt hash
  role: String,               // "organizer" | "participant" | "admin"
  plan: String,               // "FREE" | "PRO" | "PREMIUM"
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date
}

// Indexes
db.User.createIndex({ tenantId: 1, email: 1 }, { unique: true });
db.User.createIndex({ tenantId: 1, role: 1 });
db.User.createIndex({ createdAt: -1 });
```

### 3.2 Quiz Schema
```javascript
{
  _id: ObjectId,
  tenantId: String,           // Multi-tenant key
  organizerId: String,        // ObjectId of User (organizer)
  title: String,
  description: String,
  isPaid: Boolean,
  price: Number,              // In rupees if using Razorpay
  status: String,             // "draft" | "published" | "archived"
  
  questions: [
    {
      _id: ObjectId,
      text: String,
      options: [String],      // ["A", "B", "C", "D"]
      hashedCorrectAnswer: String,  // bcrypt hash for security
      timeLimit: Number,      // Seconds (e.g., 30)
      shuffleOptions: Boolean,
      questionType: String,   // "mcq" | "true-false" | "short-answer"
      difficulty: String      // "easy" | "medium" | "hard"
    }
  ],
  
  tags: [String],             // For discovery
  category: String,
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date
}

// Indexes
db.Quiz.createIndex({ tenantId: 1, organizerId: 1, status: 1 });
db.Quiz.createIndex({ tenantId: 1, status: 1, publishedAt: -1 });
db.Quiz.createIndex({ tenantId: 1, tags: 1 });
```

### 3.3 QuizSession Schema
```javascript
{
  _id: ObjectId,
  tenantId: String,
  quizId: ObjectId,           // Ref to Quiz
  sessionCode: String,        // Unique room code (e.g., "ABC123")
  status: String,             // "upcoming" | "live" | "paused" | "completed"
  
  organizerId: ObjectId,
  participantCount: Number,   // Live participant snapshot
  
  startedAt: Date,
  endedAt: Date,
  scheduledAt: Date,          // For future sessions
  
  topWinners: [
    {
      userId: ObjectId,
      name: String,
      score: Number,
      rank: Number
    }
  ],
  
  metadata: {
    totalCorrect: Number,
    totalSubmissions: Number,
    avgScore: Number
  },
  
  createdAt: Date,
  updatedAt: Date
}

// Indexes (critical for realtime queries)
db.QuizSession.createIndex({ tenantId: 1, sessionCode: 1 }, { unique: true });
db.QuizSession.createIndex({ tenantId: 1, quizId: 1, status: 1 });
db.QuizSession.createIndex({ tenantId: 1, organizerId: 1, createdAt: -1 });
```

### 3.4 Submission Schema (🔥 High Scale Design)
```javascript
{
  _id: ObjectId,
  tenantId: String,           // Multi-tenant key
  sessionId: ObjectId,        // Ref QuizSession
  quizId: ObjectId,           // Ref Quiz
  questionId: ObjectId,       // Ref question within quiz
  userId: ObjectId,           // Ref User
  
  selectedOption: String,     // User's answer
  isCorrect: Boolean,
  timeTaken: Number,          // Milliseconds from question reveal
  score: Number,              // Points earned
  
  // Anti-cheat fields
  timing: {
    receivedAt: Date,         // Server receipt timestamp
    questionPublishedAt: Date, // When question was broadcast
    anomalyScore: Float       // 0-1 cheat suspicion score
  },
  
  createdAt: Date             // Timestamp of submission
}

// CRITICAL INDEXES for high-scale queries
db.Submission.createIndex({ sessionId: 1, questionId: 1, userId: 1 }, { unique: true });
db.Submission.createIndex({ tenantId: 1, sessionId: 1, createdAt: 1 });
db.Submission.createIndex({ tenantId: 1, userId: 1, createdAt: -1 });
db.Submission.createIndex({ tenantId: 1, sessionId: 1 }, { expireAfterSeconds: 604800 }); // TTL 7 days

// Shard key for ultra-scale
// Shard collection by { tenantId: 1, sessionId: 1 }
```

### 3.5 HostProfile Schema
```javascript
{
  _id: ObjectId,
  tenantId: String,
  userId: ObjectId,
  
  bio: String,
  profileImage: String,
  bankAccount: {
    accountNumber: String,
    ifscCode: String,
    accountHolder: String
  },
  kycStatus: String,          // "pending" | "verified" | "rejected"
  
  totalEarnings: Number,
  totalQuizzes: Number,
  totalParticipants: Number,
  
  createdAt: Date,
  updatedAt: Date
}

db.HostProfile.createIndex({ tenantId: 1, userId: 1 }, { unique: true });
```

### 3.6 Analysis Collections (Projection)
For high-speed dashboard queries, maintain pre-aggregated collections:

```javascript
// Collection: submission_aggregates
{
  _id: ObjectId,
  tenantId: String,
  sessionId: ObjectId,
  quizId: ObjectId,
  
  totalSubmissions: Number,
  correctSubmissions: Number,
  accuracy: Float,           // Percent
  avgTimeTaken: Number,
  avgScore: Number,
  
  questionMetrics: {
    "questionId1": {
      attempts: Number,
      correct: Number,
      avgTime: Number
    }
  },
  
  lastUpdatedAt: Date
}

db.submission_aggregates.createIndex({ tenantId: 1, sessionId: 1 });
```

---

## 4. Redis Key Design (Production Patterns - CRITICAL)
Files:
- controllers/quizController.js
- services/quiz.service.js
- routes/quizRoutes.js

Responsibilities:
- Quiz CRUD and question CRUD
- Schedule/start/pause/resume controls
- Submission processing integration

---

## 4. Redis Key Design (Production Patterns - CRITICAL)

### 4.1 Session and Room State
```bash
# Session state (primary room configuration)
session:{roomCode} -> JSON (TTL: session duration + 5 min)
{
  "quizId": "ObjectId",
  "organizerId": "ObjectId",
  "currentQuestionIndex": 0,
  "currentQuestionId": "ObjectId",
  "questionStartedAt": 1712660000000,
  "questionDurationMs": 30000,
  "totalQuestions": 50,
  "status": "live",
  "participantCount": 2543
}

# Participant membership (for quick access)
session:{roomCode}:participants -> SET(userId)
SET members: ["user1", "user2", "user3", ...]

# Participant details (compact form for broadcasts)
session:{roomCode}:participant:{userId} -> JSON (TTL: session end)
{
  "name": "John Doe",
  "score": 450,
  "answeredCount": 10,
  "joinedAt": 1712660000000
}
```

### 4.2 Leaderboard (ZSET - Optimized Scoring)
```bash
# Primary leaderboard (sorted set)
leaderboard:{roomCode} -> ZSET(score, member)
# Score formula: score = totalScore * 1000000 - totalTimeTaken
# This ensures: higher score wins, faster time breaks ties

# Example operations:
ZADD leaderboard:ABC123 450000000 user1
ZADD leaderboard:ABC123 445012345 user2  # Same score, answered slower
ZREVRANGE leaderboard:ABC123 0 9         # Top 10 (fast O(logN) + M)

# Top-N cache (refresh every 5 seconds)
leaderboard:{roomCode}:top10 -> JSON (TTL: 5s)
[
  { "rank": 1, "userId": "user1", "name": "Alice", "score": 450 },
  { "rank": 2, "userId": "user2", "name": "Bob", "score": 445 }
]
```

### 4.3 Answer Locks (Deduplication)
```bash
# Lock to prevent duplicate answers
lock:{roomCode}:{questionId}:{userId} -> "1" (TTL: 60s after question end)

# Usage:
SETNX lock:ABC123:q1:user1 "1"        # Returns 1 if acquired
SETNX lock:ABC123:q1:user1 "1"        # Returns 0 if already exists

# Critical: must check before processing submission
if not lock acquired:
  reject("Answer already submitted for this question")
```

### 4.4 Rate Limiting (Token Bucket)
```bash
# Per-user rate limit
ratelimit:user:{tenantId}:{userId} -> counter (TTL: 60s)
INCR ratelimit:user:tenant1:user1
SET ratelimit:user:tenant1:user1 EX 60

# Per-IP rate limit
ratelimit:ip:{ip} -> counter (TTL: 60s)

# Per-socket event rate limit
ratelimit:socket:{socketId}:submit_answer -> counter (TTL: 5s)

# Threshold examples:
- Max 100 API requests per user per minute
- Max 1000 requests per IP per minute
- Max 60 submit_answer events per socket per 5 seconds
```

### 4.5 Idempotency Keys (Deduplication)
```bash
# Store result of idempotent operation
idempotency:{tenantId}:{idempotencyKey} -> JSON (TTL: 24h)
{
  "status": "completed",
  "result": { "sessionId": "...", "code": "ABC123" }
}

# Usage:
GET idempotency:tenant1:idem-key-123
if exists: return cached result
else: process and SETEX idempotency:tenant1:idem-key-123 86400 result_json
```

### 4.6 Feature Flags
```bash
# Flag store (cache with fallback to DB)
feature:{flagName}:{tenantId} -> "true" | "false" (TTL: 5 min)

Examples:
feature:ai_generation:tenant1 -> "true"
feature:premium_leaderboard:tenant1 -> "true"
feature:shadow_anti_cheat:tenant1 -> "false"

# Default: assume false if key not found (safe default)
```

### 4.7 Session State Snapshots (Reconnect)
```bash
# Store minimal state for reconnection
reconnect:{socketId}:{userId} -> JSON (TTL: 15 min)
{
  "roomCode": "ABC123",
  "sessionId": "ObjectId",
  "lastQuestionIndex": 5,
  "score": 150,
  "leaderboardSnapshot": [...]
}
```

### 4.8 Batch Operations and Aggregates
```bash
# Temp storage for pending aggregations
pending_aggregates:{roomCode} -> LIST (TTL: 1 hour)
LPUSH pending_aggregates:ABC123 '{"userId":"u1","score":100}'

# Session cache invalidation keys
cache:session:{roomCode}:dirty -> "1" (TTL: 10s)
# Used to trigger cache refresh on dashboard
```

---

## 5. Socket.IO Event Contract (Production Ready)

### 5.1 Inbound Events (Client → Server)

#### join_room
```javascript
// Payload
{
  "roomCode": "ABC123",
  "deviceFingerprint": "hash-device-id"  // Anti-cheat
}

// Validation
- JWT must be valid
- roomCode must exist and session must be live/upcoming
- tenantId must match user tenant
- User plan must allow participation

// Response
socket.emit("room_state", {
  "sessionId": "ObjectId",
  "quizId": "ObjectId",
  "organizerId": "ObjectId",
  "currentQuestionIndex": 2,
  "questionsRemaining": 48,
  "leaderboard": [
    { "rank": 1, "name": "Alice", "score": 450 },
    { "rank": 2, "name": "Bob", "score": 445 }
  ],
  "participantCount": 2543
})
```

#### start_quiz (Organizer only)
```javascript
{
  "roomCode": "ABC123"
}

// Validates:
- Caller must be organizer
- Quiz must have questions

// Broadcasts to room:
io.to(roomCode).emit("quiz_started", {
  "startsAt": Date.now(),
  "totalQuestions": 50
})
```

#### submit_answer (CRITICAL - Core Logic)
```javascript
{
  "roomCode": "ABC123",
  "questionId": "ObjectId",
  "selectedOption": "Paris",
  "responseTimeMs": 5200    // Time spent on question
}

// Server validation:
- JWT valid
- session live
- question matches current
- responseTime > 0
- lock not acquired

// (See Section 6 for full processing flow)
```

#### next_question (Organizer)
```javascript
{
  "roomCode": "ABC123"
}

// Broadcasts: io.to(roomCode).emit("new_question", {...})
```

#### pause_quiz, resume_quiz, leave_room
```javascript
// Similar structure with minimal payloads
```

### 5.2 Outbound Events (Server → Client)

#### room_state (on join)
```javascript
// Sent when user joins room
{
  "type": "room_state",
  "currentQuestion": {
    "index": 2,
    "text": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "timeLimit": 30,  // Seconds
    "startsAt": 1712660000000
  },
  "leaderboard": [
    { "rank": 1, "name": "Alice", "score": 450 },
    { "rank": 2, "name": "Bob", "score": 445 }
  ],
  "participantCount": 2543,
  "yourScore": 350,
  "yourRank": 156
}
```

#### new_question (Broadcast on next_question)
```javascript
// Only sent to participants, NOT full question text
{
  "type": "new_question",
  "questionIndex": 3,
  "questionId": "q3-id",
  "durationSeconds": 30,
  "startsAt": 1712660030000,
  "options": ["A", "B", "C", "D"]  // Shuffle applied client-side
}

// ⚠️ CRITICAL: Never send correct answer to client
```

#### answer_result (User who submitted)
```javascript
{
  "type": "answer_result",
  "questionId": "q2-id",
  "isCorrect": true,
  "pointsEarned": 100,
  "explanation": "Correct! Paris is the capital of France."
}
```

#### leaderboard_update (Broadcast - OPTIMIZED)
```javascript
// NEVER send full leaderboard every submission
// Send delta updates instead:

{
  "type": "leaderboard_update",
  "top10": [
    { "rank": 1, "name": "Alice", "score": 550 },
    { "rank": 2, "name": "Bob", "score": 495 }
  ],
  "yourRank": 156,
  "yourScore": 350
}

// Frequency: max once per 2 seconds (batched)
// Payload size: ~500 bytes for 10 users
```

#### quiz_finished (Broadcast)
```javascript
{
  "type": "quiz_finished",
  "finalLeaderboard": [
    { "rank": 1, "name": "Alice", "score": 1000, "accuracy": 95 },
    { "rank": 2, "name": "Bob", "score": 945, "accuracy": 90 }
  ],
  "yourStats": {
    "rank": 156,
    "score": 350,
    "accuracy": 70,
    "totalCorrect": 35,
    "xpGained": 500
  },
  "endedAt": 1712661200000
}
```

#### error (on any failure)
```javascript
{
  "type": "error",
  "code": "ANSWER_LOCK_FAILED",
  "message": "Answer already submitted for this question",
  "statusCode": 400
}
```

### 5.3 Connection Lifecycle Events
```javascript
// Auto-emitted by Socket.IO
socket.on("connect", () => { /* Join room */ })
socket.on("disconnect", reason => { /* Leave room */ })
socket.on("reconnect", () => { /* Restore state */ })

// Custom heartbeat
socket.on("ping", () => socket.emit("pong"))
```

---

## 6. Answer Processing Flow (Step-by-Step Core Logic)
Files:
- sockets/quiz.socket.js
- services/quiz.service.js
- services/session.service.js

Responsibilities:
- Room join and state sync
- Question broadcast and timer events
- Answer submission, scoring, and leaderboard updates

---

## 6. Answer Processing Flow (MOST IMPORTANT - Core Logic)

This is the exact step-by-step flow for handling submit_answer events at scale.

### 6.1 Answer Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: RECEIVE submit_answer event                             │
│ Client → Realtime Server Socket                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: VALIDATE JWT                                             │
│ Extract token from socket.data.user                              │
│ If invalid: reject with 401                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: FETCH SESSION from Redis                                │
│ GET session:{roomCode}                                           │
│ If not found: reject with "Session not active"                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: VALIDATE SESSION STATE                                   │
│ - Status must be "live"                                          │
│ - Current question must match submitted questionId              │
│ - If mismatch: reject "Question not active"                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: CHECK TIME WINDOW (Anti-Cheat #1)                       │
│ Now = serverTime                                                 │
│ QuestionStartTime = session.currentQuestionStartedAt             │
│ TimeAllowed = session.currentQuestionDurationMs                  │
│ ElapsedTime = Now - QuestionStartTime                            │
│                                                                  │
│ If ElapsedTime > TimeAllowed + 5000 (grace):                     │
│   -> reject "Answer window closed"                               │
│                                                                  │
│ If ElapsedTime < 200ms:  (impossible response time)              │
│   -> flag anomalyScore += 0.5 (suspicious)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: ACQUIRE ANSWER LOCK (Deduplication)                     │
│ SETNX lock:{roomCode}:{questionId}:{userId} "1"                 │
│         EX 600  # TTL 10 minutes                                 │
│                                                                  │
│ If lock already exists (returns 0):                              │
│   -> reject "Answer already submitted for this question"         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: COMPUTE SCORE & CORRECTNESS                              │
│ Fetch correctAnswer from Quiz (from DB or cache)                │
│ HashAnswer = BCRYPT user's selectedOption                        │
│ IsCorrect = (HashAnswer matches hashedCorrectAnswer)             │
│                                                                  │
│ If IsCorrect:                                                    │
│   Score = BaseScore - (ResponseTimeMs / TimeAllowedMs) * 0.2     │
│   (Earlier answer = higher score)                                │
│ Else:                                                            │
│   Score = 0                                                      │
│                                                                  │
│ Example:                                                         │
│ - Base = 100, ResponseTime = 5s, TimeAllowed = 30s               │
│ - Score = 100 - (5000/30000)*0.2 = 100 - 0.033 ≈ 99.97           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│ Step 8: FORMAT COMPOSITE SCORE for Leaderboard                  │
│ CompositeScore = TotalScore * 1000000 - TotalTimeTaken           │
│ UpdatedTotalScore = PreviousTotal + Score                        │
│ UpdatedTimeTaken = PreviousTime + ResponseTimeMs                 │
│ NewCompositeScore = UpdatedTotal * 1000000 - UpdatedTime         │
│                                                                  │
│ Example:                                                         │
│ - Previous: Total=450, Time=120000ms                             │
│ - New answer: Score=99, ResponseTime=5000ms                      │
│ - Updated: Total=549, Time=125000ms                              │
│ - Composite = 549000000 - 125000 = 548875000                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│ Step 9: UPDATE REDIS LEADERBOARD                                 │
│ ZADD leaderboard:{roomCode} 548875000 userId                     │
│                                                                  │
│ Bonus: Fetch top 10 again                                        │
│ ZREVRANGE leaderboard:{roomCode} 0 9 WITHSCORES                  │
│ SET leaderboard:{roomCode}:top10 [top 10] EX 5s                  │
│                                                                  │
│ Update participant score:                                       │
│ SET session:{roomCode}:participant:{userId}:score 549            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│ Step 10: EMIT RESPONSES (Realtime Fanout)                        │
│                                                                  │
│ 10a. UNICAST to submitter:                                       │
│ socket.emit("answer_result", {                                   │
│   questionId, isCorrect, pointsEarned, explanation               │
│ })                                                               │
│                                                                  │
│ 10b. BROADCAST to room (batched max 1/2s):                       │
│ io.to(roomCode).emit("leaderboard_update", {                     │
│   top10: [...],                                                  │
│   yourRank, yourScore                                            │
│ })                                                               │
│                                                                  │
│ 10c. Organizer-only detail:                                      │
│ organizer_socket.emit("answer_submitted", {                      │
│   questionId, userId, name, isCorrect                            │
│ })                                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────┐
│ Step 11: PUBLISH TO QUEUE (Async Processing)                    │
│ submissionQueue.add("processSubmission", {                       │
│   tenantId, sessionId, quizId, questionId,                       │
│   userId, selectedOption, isCorrect,                             │
│   timeTaken, score, anomalyScore,                                │
│   createdAt: now,                                                │
│   idempotencyKey: uuid()                                         │
│ })                                                               │
│                                                                  │
│ Non-blocking: returns immediately                                │
│ Worker will persist to MongoDB with retry logic                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Implementation Code Skeleton

```javascript
// server/modules/realtime/quiz.socket.js

socket.on("submit_answer", async (payload) => {
  const { roomCode, questionId, selectedOption } = payload;
  const userId = socket.data.user._id;
  const tenantId = socket.data.user.tenantId;
  const correlationId = socket.data.correlationId;
  
  try {
    // Step 1-2: JWT already validated in auth middleware
    
    // Step 3: Fetch session
    const session = await redis.get(`session:${roomCode}`);
    if (!session) throw new AppError("Session not active", 404);
    const sessionData = JSON.parse(session);
    
    // Step 4: Validate state
    if (sessionData.status !== "live") {
      throw new AppError("Quiz not live", 400);
    }
    if (sessionData.currentQuestionId !== questionId) {
      throw new AppError("Question not active", 400);
    }
    
    // Step 5: Check time window
    const elapsed = Date.now() - sessionData.questionStartedAt;
    if (elapsed > sessionData.questionDurationMs + 5000) {
      throw new AppError("Answer window has closed", 400);
    }
    let anomalyScore = 0;
    if (elapsed < 200) anomalyScore += 0.5;
    
    // Step 6: Acquire lock
    const lockKey = `lock:${roomCode}:${questionId}:${userId}`;
    const lockAcquired = await redis.set(
      lockKey, 
      "1", 
      "EX", 600, 
      "NX"
    );
    if (!lockAcquired) {
      throw new AppError("Answer already submitted", 400);
    }
    
    // Step 7: Compute score
    const quiz = await Quiz.findById(sessionData.quizId).select("questions");
    const question = quiz.questions.find(q => q._id.equals(questionId));
    const isCorrect = await bcrypt.compare(selectedOption, question.hashedCorrectAnswer);
    
    const score = isCorrect
      ? 100 - (elapsed / sessionData.questionDurationMs) * 20
      : 0;
    
    // Step 8: Format composite score
    const participant = JSON.parse(
      await redis.get(`session:${roomCode}:participant:${userId}`)
    );
    const updatedTotal = (participant.score || 0) + score;
    const updatedTime = (participant.totalTime || 0) + elapsed;
    const compositeScore = updatedTotal * 1000000 - updatedTime;
    
    // Step 9: Update leaderboard
    await redis.zadd(
      `leaderboard:${roomCode}`,
      compositeScore,
      userId
    );
    
    // Refresh top-10 cache
    const top10 = await redis.zrevrange(
      `leaderboard:${roomCode}`,
      0, 9,
      "WITHSCORES"
    );
    await redis.setex(
      `leaderboard:${roomCode}:top10`,
      5,
      JSON.stringify(top10)
    );
    
    // Update participant
    participant.score = updatedTotal;
    participant.totalTime = updatedTime;
    await redis.setex(
      `session:${roomCode}:participant:${userId}`,
      3600,
      JSON.stringify(participant)
    );
    
    // Step 10: Emit responses
    socket.emit("answer_result", {
      questionId,
      isCorrect,
      pointsEarned: Math.round(score),
      explanation: isCorrect ? "Correct!" : "Incorrect"
    });
    
    // Get user rank
    const rank = await redis.zrevrank(
      `leaderboard:${roomCode}`,
      userId
    );
    
    io.to(roomCode).emit("leaderboard_update", {
      top10,
      yourRank: rank + 1,
      yourScore: updatedTotal
    });
    
    // Step 11: Queue async processing
    await submissionQueue.add("processSubmission", {
      tenantId,
      sessionId: sessionData._id,
      quizId: sessionData.quizId,
      questionId,
      userId,
      selectedOption,
      isCorrect,
      timeTaken: elapsed,
      score,
      anomalyScore,
      createdAt: new Date(),
      idempotencyKey: `${userId}-${questionId}-${Date.now()}`
    }, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000
      }
    });
    
    logger.info("Answer submitted", {
      correlationId,
      userId,
      roomCode,
      isCorrect,
      score
    });
    
  } catch (error) {
    socket.emit("error", {
      code: error.code || "SUBMISSION_ERROR",
      message: error.message,
      statusCode: error.statusCode || 500
    });
    logger.error("Submission failed", { error, userId, roomCode, correlationId });
  }
});
```

---

## 7. Queue Design (BullMQ - Async Processing)
Files:
- services/analytics.service.js
- routes/analytics.routes.js

Responsibilities:
- Quiz-level and user-level aggregation pipelines
- Accuracy, timing, and trend summaries

---

## 7. Queue Design (BullMQ - Async Processing)

### 7.1 Queue Architecture

```javascript
// server/infra/queue/queue.js

import Queue from "bull";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_QUEUE_DB || 1,  // Separate DB for queues
  maxRetriesPerRequest: null            // Required for BullMQ
});

export const submissionQueue = new Queue("submissions", { redis });
export const analyticsQueue = new Queue("analytics", { redis });
export const paymentQueue = new Queue("payments", { redis });
export const dlqQueue = new Queue("deadletter", { redis });

// Configure default options
submissionQueue.setDefaultJobOptions({
  removeOnComplete: true,
  removeOnFail: false,
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000
  },
  timeout: 30000
});

export async function initializeQueues() {
  // Initialize workers (see Section 7.2)
}
```

### 7.2 Job Types and Workers

#### Submission Queue (High-Priority)
```javascript
// server/infra/queue/workers/submission.worker.js

submissionQueue.process(async (job) => {
  const {
    tenantId,
    sessionId,
    quizId,
    questionId,
    userId,
    selectedOption,
    isCorrect,
    timeTaken,
    score,
    anomalyScore,
    idempotencyKey,
    createdAt
  } = job.data;
  
  const correlationId = job.data.correlationId || job.id;
  
  try {
    // Check idempotency
    const existing = await redis.get(`idempotency:${idempotencyKey}`);
    if (existing) {
      logger.info("Submission already processed", { idempotencyKey });
      return JSON.parse(existing);
    }
    
    // Persist submission to MongoDB
    const submission = await Submission.create({
      tenantId,
      sessionId,
      quizId,
      questionId,
      userId,
      selectedOption,
      isCorrect,
      timeTaken,
      score,
      timing: {
        anomalyScore,
        receivedAt: new Date(),
        questionPublishedAt: new Date(job.data.questionPublishedAt)
      },
      createdAt
    });
    
    // Update session aggregates (async)
    await analyticsQueue.add("updateSessionMetrics", {
      sessionId,
      quizId,
      tenantId,
      submissionId: submission._id
    }, { priority: 10 });
    
    // Cache idempotency result
    await redis.setex(
      `idempotency:${idempotencyKey}`,
      86400,
      JSON.stringify({ submissionId: submission._id, status: "success" })
    );
    
    // Emit event for downstream users
    await analytics_channel.publish("submission_event", {
      tenantId,
      userId,
      isCorrect,
      score,
      timestamp: Date.now()
    });
    
    logger.info("Submission persisted", {
      correlationId,
      submissionId: submission._id,
      userId,
      isCorrect
    });
    
    return { status: "success", submissionId: submission._id };
    
  } catch (error) {
    logger.error("Submission processing failed", {
      correlationId,
      error: error.message,
      job: job.data
    });
    
    // On final failure, send to DLQ
    if (job.attemptsMade >= job.opts.attempts - 1) {
      await dlqQueue.add("deadletter_submission", job.data);
    }
    
    throw error;  // Retry via BullMQ
  }
});
```

#### Analytics Queue
```javascript
// server/infra/queue/workers/analytics.worker.js

analyticsQueue.process("updateSessionMetrics", async (job) => {
  const { sessionId, quizId, tenantId } = job.data;
  
  const aggregates = await Submission.aggregate([
    { $match: { sessionId: ObjectId(sessionId) } },
    {
      $group: {
        _id: "$sessionId",
        totalSubmissions: { $sum: 1 },
        correctSubmissions: { $sum: { $cond: ["$isCorrect", 1, 0] } },
        avgTimeTaken: { $avg: "$timeTaken" },
        avgScore: { $avg: "$score" }
      }
    }
  ]);
  
  const [agg] = aggregates;
  
  await SubmissionAggregate.updateOne(
    { sessionId },
    {
      $set: {
        totalSubmissions: agg.totalSubmissions,
        correctSubmissions: agg.correctSubmissions,
        accuracy: (agg.correctSubmissions / agg.totalSubmissions) * 100,
        avgTimeTaken: Math.round(agg.avgTimeTaken),
        avgScore: Math.round(agg.avgScore),
        lastUpdatedAt: new Date()
      }
    },
    { upsert: true }
  );
  
  logger.info("Session metrics updated", { sessionId, ...agg });
});

// Batch aggregation (runs hourly)
analyticsQueue.process("batchAggregation", async (job) => {
  const { tenantId } = job.data;
  
  const activeSessions = await QuizSession.find({
    tenantId,
    status: "completed",
    updatedAt: { $gte: new Date(Date.now() - 3600000) }  // Last hour
  });
  
  for (const session of activeSessions) {
    await analyticsQueue.add(
      "updateSessionMetrics",
      { sessionId: session._id, quizId: session.quizId, tenantId }
    );
  }
});
```

#### Payment Queue
```javascript
// server/infra/queue/workers/payment.worker.js

paymentQueue.process("syncPaymentEvent", async (job) => {
  const { tenantId, paymentId, event, data } = job.data;
  
  const payment = await Payment.findById(paymentId);
  
  if (event === "payment_completed") {
    // Update subscription
    await Subscription.updateOne(
      { hostUserId: data.hostUserId },
      { status: "active", renewalAt: addMonths(new Date(), 1) }
    );
    
    // Mark payment as verified
    await Payment.updateOne(
      { _id: paymentId },
      { status: "completed", verifiedAt: new Date() }
    );
  }
});
```

#### Dead Letter Queue
```javascript
// server/infra/queue/workers/deadletter.worker.js

dlqQueue.process(async (job) => {
  const { type, ...data } = job.data;
  
  logger.error("Dead letter item", { type, data });
  
  // Create alert/ticket for manual intervention
  await Alert.create({
    severity: "critical",
    type,
    data,
    createdAt: new Date()
  });
});
```

### 7.3 Queue Configuration (docker-compose.yml)
```yaml
services:
  redis-queue:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    volumes:
      - redis_queue_data:/data
    environment:
      - REDIS_APPENDONLY=yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
```

---

## 8. Validation Layer (JOI/ZOD)
Files:
- services/ai.service.js
- routes/ai.routes.js

Responsibilities:
- Prompt construction and generation orchestration
- Difficulty distribution validation
- Generated payload normalization

---

## 8. Validation Layer (JOI/ZOD)

### 8.1 Validation Strategy
- Middleware-based validation at route entry points
- Socket event payload validation at handler entry
- Database model-level validation for final storage

### 8.2 Core Validation Schemas

#### Auth Validation
```javascript
// server/modules/auth/auth.validation.js
import Joi from "joi";

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/[A-Z]/).pattern(/[0-9]/).required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid("organizer", "participant").default("participant")
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});
```

#### Quiz Validation
```javascript
// server/modules/quiz/quiz.validation.js

export const createQuizSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().max(1000),
  isPaid: Joi.boolean().default(false),
  price: Joi.number().positive().when("isPaid", {
    is: true,
    then: Joi.required()
  }),
  questions: Joi.array().items(
    Joi.object({
      text: Joi.string().required(),
      options: Joi.array().length(4).required(),
      correctAnswerIndex: Joi.number().min(0).max(3).required(),
      timeLimit: Joi.number().min(5).max(300).default(30),
      difficulty: Joi.string().valid("easy", "medium", "hard").default("medium")
    })
  ).min(1).max(100)
});
```

#### Submission Validation
```javascript
// server/modules/submission/submission.validation.js

export const submitAnswerSchema = Joi.object({
  roomCode: Joi.string().length(6).uppercase().required(),
  questionId: Joi.string().length(24).hex().required(),
  selectedOption: Joi.string().max(500).required(),
  responseTimeMs: Joi.number().positive().max(300000).required()
});
```

### 8.3 Validation Middleware
```javascript
// server/shared/middleware/validate.js

export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join("."),
        message: d.message
      }));
      return res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details
      });
    }
    req.validated = value;
    next();
  };
}

// Usage in routes:
router.post("/register", validate(registerSchema), authController.register);
```

---

## 9. Security Module LLD

### 9.1 JWT and Token Management
```javascript
// server/modules/auth/auth.service.js

export async function issueTokens(user) {
  // Access token: Short-lived (5-15 min)
  const accessToken = jwt.sign(
    {
      userId: user._id,
      tenantId: user.tenantId,
      role: user.role,
      type: "access"
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
  
  // Refresh token: Long-lived (7 days), stored in DB
  const refreshTokenValue = crypto.randomBytes(32).toString("hex");
  const refreshTokenHash = await bcrypt.hash(refreshTokenValue, 10);
  
  await User.updateOne(
    { _id: user._id },
    {
      refreshTokenHash,
      refreshTokenIssuedAt: new Date(),
      refreshTokenFamily: crypto.randomUUID()  // For revocation on compromise
    }
  );
  
  return {
    accessToken,
    refreshToken: refreshTokenValue,
    expiresIn: 900  // seconds
  };
}

export async function refreshAccessToken(refreshToken, userId) {
  const user = await User.findById(userId);
  
  // Verify refresh token
  const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!isValid) {
    // Suspected token family compromise
    await User.updateOne(
      { _id: userId },
      { refreshTokenFamily: null }  // Invalidate entire family
    );
    throw new AuthError("Token revoked");
  }
  
  // Issue new tokens
  return issueTokens(user);
}
```

### 9.2 Socket.IO Authentication
```javascript
// server/modules/realtime/quiz.socket.js

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const tenantId = socket.handshake.auth.tenantId;
  
  if (!token || !tenantId) {
    return next(new Error("No auth"));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tenantId !== tenantId) {
      return next(new Error("Tenant mismatch"));
    }
    
    socket.data.user = decoded;
    socket.data.correlationId = socket.id;
    next();
  } catch (error) {
    next(new Error("Invalid token"));
  }
});

socket.on("connect", () => {
  logger.info("Socket connected", {
    socketId: socket.id,
    userId: socket.data.user.userId,
    tenantId: socket.data.user.tenantId
  });
});
```

### 9.3 Anti-Cheat Module
```javascript
// server/modules/realtime/anti-cheat.js

export class AntiCheatService {
  
  // Real-time checks
  async validateSubmission(submission, sessionState) {
    let score = 0;
    
    // 1. Time anomaly
    const elapsed = submission.responseTimeMs;
    if (elapsed < 200) {
      score += 30;  // Impossible speed
    }
    if (elapsed > sessionState.questionDurationMs + 5000) {
      score += 50;  // Answer after window
    }
    
    // 2. Lock check (already done in handler)
    
    // 3. Multi-tab detection
    const userConns = await redis.get(`user:${submission.userId}:connections`);
    if (userConns && parseInt(userConns) > 1) {
      score += 20;
    }
    
    return score;  // Cumulative anomaly score 0-100
  }
  
  // Async batch anomaly detection
  async detectPatternAnomalies(sessionId) {
    const submissions = await Submission.find({ sessionId });
    
    // Cluster similar answer vectors
    const vectors = submissions.map(s => s.selectedOption);
    const clusters = this.clusterAnswers(vectors);
    
    for (const cluster of clusters) {
      if (cluster.users.length > 5 && cluster.similarity > 0.95) {
        // Flag all users in cluster
        await FlaggedUser.insertMany(
          cluster.users.map(u => ({
            userId: u,
            reason: "pattern_anomaly",
            sessionId,
            severity: "high",
            createdAt: new Date()
          }))
        );
      }
    }
  }
  
  // Device fingerprinting
  async validateDevice(userId, fingerprint) {
    const knownDevices = await redis.get(
      `user:${userId}:known_devices`
    );
    
    if (!knownDevices) {
      // First device, register it
      await redis.setex(
        `user:${userId}:known_devices`,
        31536000,  // 1 year
        JSON.stringify([fingerprint])
      );
      return true;
    }
    
    const known = JSON.parse(knownDevices);
    if (!known.includes(fingerprint)) {
      return false;  // New device (risky)
    }
    return true;
  }
}
```

---

## 10. Analytics Pipeline

### 10.1 Real-time Analytics Flow
```
Submission → Redis ZSET (leaderboard) → Events to Queue
                      ↓
                 Worker processes
                      ↓
         MongoDB Submissions + Aggregates
                      ↓
         Pre-computed Dashboards (Projections)
                      ↓
         Grafana Metrics + Reports
```

### 10.2 Analytics Service
```javascript
// server/modules/analytics/analytics.service.js

export class AnalyticsService {
  
  // Real-time leaderboard query (from Redis)
  async getSessionLeaderboard(roomCode, top = 10) {
    const scores = await redis.zrevrange(
      `leaderboard:${roomCode}`,
      0,
      top - 1,
      "WITHSCORES"
    );
    
    const leaderboard = [];
    for (let i = 0; i < scores.length; i += 2) {
      const userId = scores[i];
      const score = parseInt(scores[i + 1]);
      const user = await User.findById(userId).select("name");
      
      leaderboard.push({
        rank: leaderboard.length + 1,
        userId,
        name: user.name,
        score: Math.floor(score / 1000000)  // Divide composite by factor
      });
    }
    
    return leaderboard;
  }
  
  // Historical analytics (from MongoDB)
  async getQuizAnalytics(quizId, tenantId) {
    return await Submission.aggregate([
      { $match: { quizId: ObjectId(quizId), tenantId } },
      {
        $group: {
          _id: "$questionId",
          attempts: { $sum: 1 },
          correct: { $sum: { $cond: ["$isCorrect", 1, 0] } },
          avgTime: { $avg: "$timeTaken" },
          avgScore: { $avg: "$score" }
        }
      },
      {
        $project: {
          _id: 1,
          accuracy: { $divide: ["$correct", "$attempts"] },
          attempts: 1,
          avgTime: { $round: ["$avgTime"] },
          avgScore: { $round: ["$avgScore"] }
        }
      }
    ]);
  }
  
  // User engagement
  async getUserStats(userId, tenantId) {
    return await Submission.aggregate([
      { $match: { userId: ObjectId(userId), tenantId } },
      {
        $group: {
          _id: null,
          quizzesAttempted: { $sum: 1 },
          correctAnswers: { $sum: { $cond: ["$isCorrect", 1, 0] } },
          totalScore: { $sum: "$score" },
          avgTime: { $avg: "$timeTaken" }
        }
      },
      {
        $project: {
          accuracy: {
            $divide: ["$correctAnswers", "$quizzesAttempted"]
          },
          correctAnswers: 1,
          totalScore: { $round: ["$totalScore"] },
          avgTime: { $round: ["$avgTime"] }
        }
      }
    ]);
  }
}
```

---

## 15. Error Handling and Observability

### 15.1 Error Classification
```javascript
// server/shared/errors/AppError.js

export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }
}

export class AuthError extends AppError {
  constructor(message) {
    super(message, 401, "AUTH_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class QuotaExceededError extends AppError {
  constructor(message) {
    super(message, 429, "QUOTA_EXCEEDED");
  }
}
```

### 15.2 Structured Logging
```javascript
// server/shared/utils/logger.js

import winston from "winston";

export const logger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { service: "QuizBolt" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" })
  ]
});

// Usage:
logger.info("Answer submitted", {
  correlationId,
  userId,
  roomCode,
  isCorrect,
  score,
  timestamp: new Date().toISOString()
});

// Output:
// {
//   "service": "QuizBolt",
//   "level": "info",
//   "message": "Answer submitted",
//   "correlationId": "socket-123",
//   "userId": "user-456",
//   "roomCode": "ABC123",
//   "isCorrect": true,
//   "score": 99,
//   "timestamp": "2024-04-09T10:30:00Z"
// }
```

### 15.3 Observability Metrics
```javascript
// server/infra/observability/metrics.js

import promClient from "prom-client";

// Gauge: current connected sockets
export const socketConnectionsGauge = new promClient.Gauge({
  name: "socket_connections_total",
  help: "Total connected sockets",
  labelNames: ["namespace"]
});

// Gauge: queue depth
export const queueDepthGauge = new promClient.Gauge({
  name: "queue_depth",
  help: "Jobs waiting in queue",
  labelNames: ["queue"]
});

// Histogram: submission processing latency
export const submissionLatencyHistogram = new promClient.Histogram({
  name: "submission_processing_ms",
  help: "Submission processing latency",
  buckets: [10, 50, 100, 500, 1000, 5000],
  labelNames: ["status"]
});

// Counter: answers submitted
export const answersSubmittedCounter = new promClient.Counter({
  name: "answers_submitted_total",
  help: "Total answers submitted",
  labelNames: ["is_correct"]
});

// Usage in handlers:
const timer = submissionLatencyHistogram.startTimer();
// ... processing ...
timer({ status: "success" });

answersSubmittedCounter.inc({ is_correct: isCorrect ? "true" : "false" });
```

---

## 16. API Surface Reference

### 16.1 Core API Routes
```
POST   /api/auth/register          -> registerSchema
POST   /api/auth/login              -> loginSchema
POST   /api/auth/refresh            -> refreshTokenSchema

GET    /api/quiz                     -> List user's quizzes
POST   /api/quiz                     -> createQuizSchema
GET    /api/quiz/:quizId             -> Fetch single quiz
PUT    /api/quiz/:quizId             -> Update quiz (draft only)
DELETE /api/quiz/:quizId             -> Delete quiz

POST   /api/session/start            -> { quizId }
POST   /api/session/:roomCode/pause  -> Pause active session
POST   /api/session/:roomCode/resume -> Resume paused session
POST   /api/session/:roomCode/end    -> End session

GET    /api/analytics/quiz/:quizId   -> Quiz statistics
GET    /api/analytics/user/:userId   -> User statistics
GET    /api/analytics/session/:sessionId -> Session summary

POST   /api/gamification/claim-xp   -> Claim earned XP
GET    /api/gamification/leaderboard -> Global leaderboard

POST   /api/payment/create-order     -> Create payment order
POST   /api/payment/verify           -> Verify payment
GET    /api/payment/status/:quizId   -> Payment status

GET    /health                       -> Service health check
GET    /ready                        -> Service readiness
GET    /metrics                      -> Prometheus metrics
```

### 16.2 Payment Service Routes
```
GET    /payment/health              -> Health check
POST   /payment/create-order         -> Create order
POST   /payment/verify               -> Verify payment
GET    /payment/status/:quizId       -> Get payment status
POST   /payment/webhook              -> Razorpay webhook
GET    /payment/revenue/summary      -> Revenue reporting
```

---

## 17. Realtime Event Response Summary

| Event | Direction | Frequency | Size | Optimization |
|-------|-----------|-----------|------|--------------|
| room_state | OUT | on join | ~2KB | Full state once |
| new_question | OUT | per question | ~500B | Compact payload |
| answer_result | OUT | per answer | ~200B | Unicast to user |
| leaderboard_update | OUT | max 2/sec | ~500B | Delta + top-10 only |
| quiz_finished | OUT | on end | ~3KB | Full stats |
| error | OUT | on error | ~300B | Error codes |
| submit_answer | IN | per user answer | ~300B | Immediate fanout |
| join_room | IN | per user join | ~200B | Batch reconnects |
| next_question | IN | organizer | ~100B | Only from organizer |

---

## 18. Performance Checklist

- ✅ Leaderboard: ZSET O(logN) write, O(logN + M) top-N read
- ✅ Submission lock: O(1) SETNX, 600s TTL (auto cleanup)
- ✅ Rate limiting: O(1) counter with sliding window
- ✅ Session state: Externalized to Redis, no node memory
- ✅ Validation: Early rejection before lock acquisition
- ✅ Async offload: Queue for all persistence and analytics
- ✅ Payload optimization: Compact numeric codes, never full scoreboard
- ✅ Connection pooling: Bounded Redis and DB connections
- ✅ Cache layers: Top-10 leaderboard cached 5s, session 1h TTL
- ✅ Batch updates: Leaderboard fanout max 2/sec per room

---

## 19. Security Checklist

- ✅ JWT: 15-minute expiry with refresh token rotation
- ✅ Socket auth: Token verified on handshake and per command
- ✅ Password: bcrypt hashing with 10+ rounds
- ✅ Webhook: HMAC signature verification on payment updates
- ✅ Anti-cheat: Time anomaly, dedup locks, pattern correlation
- ✅ Rate limiting: IP, user, and event-level throttles
- ✅ Multi-tenant: tenantId filter in every repository query
- ✅ Idempotency: Keys stored for payment and session creation
- ✅ Encryption: Sensitive data at rest (passwords, tokens)
- ✅ CORS: Origin-based cross-origin request validation

---

## 20. Links to Design Documents

- [HLD](QUIZBOLT_HLD.md) - High-level architecture with C4 model and enterprise patterns
- [Combined Index](QUIZBOLT_HLD_LLD.md) - Quick reference to HLD and LLD
- [Future Roadmap](../future.md) - 10 advanced features with phase plan

### 3.2 Payment Verification Module
Files:
- controllers/paymentController.js

Responsibilities:
1. Verify HMAC signature for non-mock mode
2. Perform idempotent status transitions
3. Return canonical payment outcome payload

### 3.3 Webhook Module
Files:
- controllers/paymentController.js

Responsibilities:
1. Validate webhook signatures
2. Process lifecycle events
3. Guard against duplicate event side effects

### 3.4 Revenue Module
Files:
- controllers/revenueController.js

Responsibilities:
- Aggregate completed payments for reporting metrics

### 3.5 Subscription Module
Files:
- controllers/subscriptionController.js
- services/subscriptionService.js

Responsibilities:
- Plan metadata retrieval
- Subscription status and order flow integration

---

## 13. Payment Service Modules (Detailed)

### 13.1 Payment Order Module
Files:
- payment-service/modules/payment/payment.controller.js
- payment-service/modules/payment/payment.service.js
- payment-service/modules/payment/payment.routes.js

Responsibilities:
1. Validate quiz/user/payment eligibility
2. Resolve commission and split policy
3. Create gateway order (Razorpay)
4. Persist payment record with payout metadata

API:
- POST /payment/create-order
- POST /payment/verify
- GET /payment/status/:quizId

### 13.2 Payment Verification Module
Responsibilities:
1. Verify HMAC signature for payment confirmation
2. Perform idempotent status transitions
3. Return canonical payment outcome

Key logic:
- Check idempotency key to prevent duplicate processing
- Verify Razorpay HMAC signature
- Update payment status atomically
- Emit payment_completed event to queue

### 13.3 Webhook Module
Responsibilities:
1. Validate webhook signatures from Razorpay
---

## 14. Client Modules (Detailed)

### 14.1 Authentication Module (Client)
- Login.jsx: Email/password form with error handling
- Register.jsx: Signup with email verification
- useAuth.js: Custom hook for auth state management
- auth.service.js: Token storage (localStorage/sessionStorage with fallback)

### 14.2 Quiz Room Module
- JoinRoom.jsx: Room code entry and validation
- QuizRoom.jsx: Live quiz interface with real-time updates
- useRoom.js: Room lifecycle (join, leave, reconnect)
- useSocket.js: Socket.IO connection wrapper

### 14.3 Leaderboard Component
- Leaderboard.jsx: Display top-10 with real-time updates
- Refresh frequency: max 2 times per second
- Responsive design for mobile (touch-friendly)

### 14.4 Analytics Dashboard
- Summary stats: accuracy, score, rank
- Question-level breakdown
- Session history and trends
- Export to CSV

### 14.5 Billing Module
- Billing.jsx: Plan selection and upgrade
- Payment form integration (Razorpay)
- Invoice history and receipts

---

## 15. Logical Data Model (Summary)nts (success, failure, refund)
3. Guard against duplicate side effects

### 13.4 Revenue Module
Responsibilities:
- Aggregate completed payments for reporting metrics
- Compute organizer earnings and payouts

### 13.5 Subscription Module
Responsibilities:
- Plan metadata retrieval
- Subscription status and renewal logic
- Feature gating based on subscription

---

## 14. Client Modules (Detailed)

### 4.1 Route-Level Pages
- Login.jsx
- Register.jsx
- Profile.jsx
- Home.jsx
- JoinRoom.jsx
- QuizRoom.jsx
- QuizResults.jsx
- History.jsx
- HistoryDetail.jsx
- StudioDashboard.jsx
- OrganizerEdit.jsx
- OrganizerLive.jsx
- Analytics.jsx
- Billing.jsx
- AIGenerator.jsx

### 4.2 Component Domains
- components/auth
- components/billing
- components/history
- components/organizerDashboard
- components/organizerEdit
- components/organizerLive
- components/quizRoom
- components/analytics
- components/gamification
- components/common
- components/ui

### 4.3 Integration Layers
- services/api.js for HTTP transport
- Hooks and socket-aware feature components for realtime flows

## 5. Logical Data Model

### 5.1 Core Service Entities
- User: identity, auth, role, profile attributes
- Quiz: ownership, metadata, paid flags, question set, lifecycle status
- QuizSession: room/session runtime state and summary metadata
- Submission: answer event with correctness, score, timing, XP linkage
- HostProfile: organizer-specific profile and publishing state

### 5.2 Payment Service Entities
- Payment: order/payment ids, amounts, split fields, payout mode/status, verification state
- HostAccount: linked account and KYC/settlement status
- QuizSnapshot: payment-safe quiz copy with paid/price fields
- Subscription: plan and renewal lifecycle state
- FailedJob: retry/dead-letter tracking for async operations

## 6. Realtime Contract Design

### 6.1 Inbound Events
- join_room
- start_quiz
- pause_quiz
- resume_quiz
- next_question
- submit_answer

### 6.2 Outbound Events
- room_state
- participants_update
- session_redirect
- start_quiz
- new_question
- timer_tick
- answer_result
- update_leaderboard
- answer_stats
- fastest_user
- streak_update
- quiz_paused
- quiz_finished

### 6.3 Answer Processing Sequence
1. Resolve active room/session context.
2. Validate session state is live.
3. Enforce answer window expiry checks.
4. Apply duplicate-submission locking.
5. Compute score/streak and persist submission.
6. Emit leaderboard and analytics events.

## 7. API Surface (Representative)

Core API:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/quiz/my-quizzes
- POST /api/quiz
- POST /api/quiz/:id/start
- GET /api/analytics/quiz/:id
- POST /api/ai/generate-quiz
- POST /api/payment/create-order

Payment Service:
- GET /payment/health
- POST /payment/create-order
- POST /payment/verify
- GET /payment/status/:quizId
- POST /payment/status/batch
- POST /payment/webhook
- GET /payment/revenue/summary

## 8. Validation and Error Design
Validation:
- Middleware-based request shape validation
- Identifier and eligibility checks at service boundaries
- Paid-quiz and pricing guards in payment path
- Difficulty distribution checks in AI module

Error handling:
- Structured error payloads with code/message/details
- Correlation id propagation for traceability
- Business errors separated from server/runtime errors

## 9. Security and Reliability Design
Security controls:
- JWT validation on protected routes
- Role checks for organizer/admin actions
- Razorpay signature verification for verify/webhook
- Request hardening and basic rate limiting in payment service

Reliability controls:
- Idempotent payment update paths
- Controlled non-production payment fallback modes
- Failed job tracking for retryable failures
- Service/database health endpoints

## 10. Performance and Scaling Notes
- Realtime payloads optimized for incremental updates
- Session state externalization patterns via Redis-compatible services
- Service separation allows independent horizontal scaling of core API and payment service
- Proxy and gateway boundaries support future load-balancing strategies
