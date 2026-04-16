# QuizBolt High Level Design (HLD)

## 1. Purpose
This document defines the high-level architecture for QuizBolt and is aligned to the current repository implementation.
Where this document includes larger-scale target architecture, those parts are explicitly marked as forward-looking.

## 2. Scope and Targets
In scope:
- Realtime quiz gameplay and live session orchestration
- Paid quiz and subscription lifecycle
- Analytics and gamification pipeline
- Multi-tenant architecture and feature gating
- Cloud-native deployment and observability

Target scale:
- 50K to 100K concurrent users platform-wide
- Up to 10K concurrent socket connections in a single room
- Low-latency fanout and leaderboard updates under burst load

## 2.1 Current Implementation Snapshot (2026-04)

The platform enforces an explicit backend-owned session state machine used by both API and frontend routing.

Canonical states:
- `draft`
- `scheduled`
- `waiting`
- `live`
- `completed`
- `aborted`

Key architectural decisions in current code:
- Backend is the only authority for lifecycle transitions.
- Frontend route resolution is status-only and centralized.
- Lifecycle mutation routes are protected by auth + role + ownership middleware.
- Lifecycle/auth APIs follow a unified response contract (`success`, `data`, `message`).

Current production status language (repository-aligned):
- Implemented and active:
  - backend-owned session lifecycle state machine with guarded transitions
  - resolver-based host routing by session status
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

Primary implementation references:
- `server/utils/sessionStateMachine.js`
- `server/routes/quizRoutes.js`
- `server/middleware/auth.js`
- `client/src/utils/sessionRouteResolver.js`
- `client/src/components/RouteGuard.jsx`

## 3. C4 Architecture Deep Dive

Note:
- Sections 3.2 onward include both current deployed boundaries and target-state scale architecture.
- Current repo deployment is a monorepo split into `client`, `server`, and `payment-service`, with Redis and MongoDB dependencies.

### 3.1 C4 Level 1: System Context
Actors:
- host: creates quizzes, starts sessions, manages plans and billing
- Participant: joins live rooms, answers questions, views results
- Admin: support, abuse handling, operational controls
- Payment Gateway (Razorpay): order lifecycle and webhook callbacks
- Observability stack: metrics, logs, tracing, alerting

System:
- QuizBolt platform provides quiz authoring, realtime gameplay, scoring, analytics, and SaaS billing.

### 3.2 C4 Level 2: Container View
Containers:
- Web Client (React/Vite): participant and host UI
- API Gateway: edge auth, routing, throttling, websocket upgrade entry
- BFF/API Service: REST APIs for auth, quiz, analytics, gamification, subscriptions
- Realtime Gateway Service: Socket.IO nodes for room lifecycle and event fanout
- Payment Service: orders, verification, webhook, revenue reports
- Worker Service: async jobs for analytics rollups, event materialization, retries
- MongoDB cluster: persistent data
- Redis cluster: transient realtime state, cache, locks, pub-sub adapter
- Queue backbone: BullMQ on Redis initially; Kafka optional for high-volume streams

### 3.3 C4 Level 3: Component View
BFF/API components:
- Auth component: JWT issuance, refresh token rotation
- Quiz component: quiz CRUD and scheduling
- Session component: start/pause/resume controls
- Access control component: tenant and plan checks
- Analytics query component: read APIs from pre-aggregated collections

Realtime service components:
- Socket auth middleware
- Room membership manager
- Question broadcaster
- Submission validator and dedup lock checker
- Leaderboard projection writer (Redis ZSET)
- Event publisher (to queue)

Payment service components:
- Order manager
- Verification manager
- Webhook consumer
- Revenue projection component
- Idempotency guard component

Worker components:
- Submission event consumer
- Analytics aggregator
- Payment event reconciler
- Dead-letter reprocessor

### 3.4 C4 Level 4: Code-Level Module Map
Core code modules in current repository:
- Server: routes/*.js, controllers/*.js, services/quiz.service.js, services/session.service.js, sockets/quiz.socket.js
- Payment service: controllers/paymentController.js, revenueController.js, subscriptionController.js, models/Payment.js
- Client: pages/hostLive.jsx, QuizRoom.jsx, Billing.jsx, Analytics.jsx

Code-level standards:
- Clear service boundaries by domain folder
- Stateless handlers where possible, state moved to Redis or MongoDB
- Correlation ID passed across API, socket, and worker boundaries

## 4. Service Boundaries and State Classification

Service boundaries:
- API Gateway: ingress security, rate limit, websocket upgrade, request routing
- BFF/API Service: business APIs and orchestration, no long-lived socket state
- Realtime Service: websocket lifecycle and ephemeral game state
- Payment Service: billing domain and payment correctness
- Worker Service: eventually consistent heavy compute and retries

Stateless vs stateful:

| Service | Classification | Reason |
|---|---|---|
| API Gateway | Stateless | config-driven routing and throttling |
| BFF/API Service | Mostly stateless | request/response with persistent DB only |
| Realtime Service | Semi-stateful | connection-bound state, but room truth externalized to Redis |
| Payment Service | Stateless compute + persistent DB | no in-memory dependency for correctness |
| Worker Service | Stateless workers | queue-driven idempotent processors |
| Redis | Stateful | ephemeral state, locks, sorted sets |
| MongoDB | Stateful | source of record |

Trade-off:
- Externalizing room state to Redis increases network hops but enables horizontal scaling and crash recovery.

## 5. Scalability Design (50K to 100K Concurrency)

### 5.1 Horizontal Scaling Strategy
- Scale API, Realtime, and Worker deployments independently.
- Use Kubernetes HPA on CPU, memory, and custom metrics.
- Keep per-pod connection limits bounded for predictable latency.

### 5.2 Load Balancing Strategy
- L4 load balancer for TCP and websocket heavy traffic.
- L7 ingress for HTTP routing, TLS termination, and policy controls.
- Separate ingress classes for API and Realtime traffic to avoid noisy neighbor effects.

### 5.3 Socket.IO Multi-Node Strategy
- Use Socket.IO Redis adapter for cross-node room event propagation.
- Keep room metadata in Redis keys, not in node memory.
- Use shard-friendly room keys like room:{region}:{roomCode}.

### 5.4 Sticky Sessions vs Stateless Routing
- Preferred: no sticky sessions for API traffic.
- Realtime traffic: short-term stickiness allowed for transport upgrade stability, but correctness must not depend on stickiness.
- On reconnect, node can rebuild room view from Redis.

### 5.5 Capacity Model Guidance
- Realtime pod target: 30K to 50K sockets per node class depending on memory profile and heartbeat interval.
- Single room with 10K users handled by partitioned fanout channels and batched scoreboard updates.
- Scale-out policy based on socket_count_per_pod and event_loop_lag metrics.

Trade-off:
- Aggressive fanout batching reduces CPU spikes but introduces millisecond-level UI delay.

## 6. Realtime System Design

### 6.1 WebSocket Architecture
- Client connects through gateway to Realtime Service (Socket.IO namespace per product domain).
- Handshake includes JWT and tenant context.
- Room join validates access and plan limits before membership admission.

### 6.2 Event Model
- Commands: join_room, start_quiz, submit_answer, next_question
- Facts: question_started, answer_accepted, leaderboard_updated, quiz_finished
- Persist important facts asynchronously for replay and analytics.

### 6.3 Fanout Optimization
- Delta broadcasts instead of full leaderboard payloads.
- Use binary or compressed payloads for high-frequency events.
- Broadcast tiers:
- Tier 1: full data for host clients.
- Tier 2: compact data for participants.

### 6.4 Backpressure Handling
- Per-socket bounded outbound queue.
- Drop non-critical updates when queue depth exceeds threshold.
- Preserve critical events (question_start, answer_result, quiz_finish).

### 6.5 Room Partitioning Strategy
- Logical room can be split into shards when participant count exceeds threshold.
- Coordinator maintains canonical question/timer state.
- Shards maintain local socket membership and local fanout.

Trade-off:
- Sharding boosts throughput but increases synchronization complexity for global leaderboard consistency.

## 7. Data Architecture

### 7.1 MongoDB Design Improvements
- Use tenantId in all primary business collections.
- Prefer immutable event collections for submissions and payment events.
- Maintain read-optimized projection collections for dashboards.

Critical indexes:
- Quiz: { tenantId, hostId, status, updatedAt }
- Submission: { tenantId, sessionId, questionId, userId, createdAt }
- Payment: unique sparse index on { razorpayOrderId }
- Subscription: { tenantId, hostUserId, status, expiresAt }

Partitioning:
- Shard high-volume collections by { tenantId, sessionId } or { tenantId, createdAt } depending on query shape.

### 7.2 Redis Data Modeling
Key patterns:
- session:{roomCode}:state -> hash/json for current question and timer
- session:{roomCode}:participants -> set of participant ids
- leaderboard:{roomCode} -> sorted set score as primary, tie-break by time via composite score
- answerlock:{roomCode}:{questionId}:{userId} -> SETNX with TTL
- ratelimit:{scope}:{actor} -> counters with expiries

Leaderboard performance:
- Use ZADD and ZREVRANGE for near O(logN) writes and O(logN + M) reads for top-N.
- Keep top-N cache key for fast host dashboards.

### 7.3 Caching Strategy
- Read-through for quiz metadata and active session summaries.
- Write-through for critical state transitions where stale reads hurt UX.
- Cache invalidation on session state change events.

Trade-off:
- Write-through improves consistency but can increase write latency during spikes.

## 8. Asynchronous Processing Architecture

### 8.1 Queue Backbone
- Phase 1: BullMQ on Redis for low operational overhead.
- Phase 2: Kafka for very high throughput streams and replay requirements.

### 8.2 Offloaded Workloads
- Answer submission events -> scoring audit, anomaly checks, async persistence retries.
- Analytics aggregation -> minute and session rollups.
- Payment events -> reconciliation, retry, and notification workflows.

### 8.3 Event Contracts
- Use versioned event schema: eventType, eventVersion, tenantId, correlationId, idempotencyKey, payload.
- Store idempotency keys in Redis or Mongo to dedupe worker replays.

Processing guarantees:
- Queue consumption is at-least-once.
- Domain handlers must be idempotent.
- Exactly-once is approximated via idempotency key and conditional writes.

Trade-off:
- At-least-once with idempotency is simpler and cheaper than strict exactly-once distributed transactions.

## 9. Fault Tolerance and Reliability

Retry strategy:
- Exponential backoff with jitter.
- Max retry cap with dead-letter queue.

Circuit breakers:
- Applied for payment gateway, Redis, and external AI provider calls.
- Fallback to graceful degraded responses where feasible.

Graceful degradation:
- If analytics pipeline lags, serve last successful projection snapshot.
- If payment verification is delayed, mark payment pending_verification and retry asynchronously.

Redis fallback:
- Temporary in-memory fallback allowed only for low-risk metadata, never for payment or scoring correctness.
- Emit degraded mode alerts immediately.

Trade-off:
- Strict correctness domains avoid fallback shortcuts to prevent financial or scoring corruption.

## 10. Security Architecture

JWT and refresh strategy:
- Short-lived access JWT (5 to 15 min).
- Rotating refresh token stored hashed in DB.
- Revoke-on-compromise with token family invalidation.

WebSocket authentication:
- JWT validated during handshake.
- Tenant and role claims required.
- Re-auth on reconnect and namespace entry.

Anti-cheat design:
- Answer deduplication via Redis lock keys.
- Timing validation with server-authoritative questionStart and expiry.
- Anomaly scoring: impossible response latency, pattern anomalies, burst switching, and suspicious correctness spikes.

Rate limiting:
- IP limits at gateway.
- User/token limits at BFF.
- Socket event limits per event type and room.

Payment security:
- Mandatory webhook signature verification.
- Idempotency key for create-order and verify operations.
- Audit log for payment state transitions.

Trade-off:
- Aggressive anti-cheat thresholds can increase false positives; tune with shadow mode before hard enforcement.

## 11. Performance Optimization

Leaderboard:
- Redis ZSET maintained incrementally to avoid full recompute.

Socket payload optimization:
- Send compact numeric codes where possible.
- Avoid repeated metadata in every event.
- Batch low-priority updates.

Compression:
- Enable permessage-deflate selectively for large rooms.
- Use Brotli/Gzip for HTTP JSON responses and static assets.

CDN strategy:
- Serve client static bundles via CDN.
- Aggressive immutable caching for hashed assets.

Trade-off:
- Compression lowers bandwidth but can increase CPU; enable adaptively by payload size.

## 12. Observability Architecture

Logging:
- Structured JSON logs with keys: correlationId, tenantId, userId, roomCode, eventType, latencyMs.

Metrics (Prometheus):
- API p50/p95/p99 latency
- Socket active connections and connection churn
- Event loop lag and queue depth
- Room fanout latency and dropped event count
- Payment success/failure ratio

Tracing (OpenTelemetry):
- End-to-end trace from client request to API, realtime, queue worker, and DB calls.

Alerting:
- SLO-based alerts for availability, latency, error rate, and queue lag.
- Critical alerts for payment failures and websocket outage.

## 13. Deployment Architecture

Kubernetes design:
- Separate deployments: gateway, bff, realtime, payment, workers.
- Separate pod disruption budgets for realtime and payment paths.
- StatefulSets for Redis/Mongo if self-managed; managed cloud services preferred.

Autoscaling:
- HPA on CPU/memory for API and workers.
- Custom metric HPA for realtime on socket_count and event_loop_lag.

Release strategies:
- Blue-green for payment and auth paths.
- Canary for realtime service (small room cohorts first).

Future multi-region:
- Active-active for API and client.
- Region-local rooms where possible.
- Cross-region replication for durable data and disaster recovery.

Trade-off:
- Multi-region active-active improves resilience but increases operational and consistency complexity.

## 14. Cost Optimization

Redis memory optimization:
- Use compact key formats and bounded TTLs.
- Keep only active room state in Redis.

Efficient broadcasting:
- Delta updates and tiered frequency by event importance.
- Avoid full leaderboard broadcasts per submission.

DB optimization:
- Projection collections for analytics dashboards.
- Query shape-driven compound indexes.

Autoscaling policy optimization:
- Scale up early on queue lag.
- Scale down conservatively to avoid connection churn spikes.

## 15. SaaS Architecture (Multi-Tenant and Billing)

Tenant model:
- Logical multi-tenancy with tenantId in every domain entity.
- Row-level isolation via mandatory tenant filters in repositories/services.

Plans:
- FREE, PRO, PREMIUM with plan-specific quotas and feature flags.

Feature gating:
- Runtime policy engine checks tenant plan and usage before action.
- Gate examples: max participants, advanced analytics export, AI generation limits.

Usage metering:
- Meter participant joins, live sessions started, AI generation calls, paid quiz transactions.
- Store meter events and aggregate daily/monthly consumption.

Billing lifecycle:
- Trial -> active -> grace -> suspended -> canceled state machine.
- Webhook-driven subscription reconciliation and entitlements update.

Trade-off:
- Strict real-time metering adds write load; batching lowers cost but increases temporary quota drift.

## 16. Failure Scenarios and Mitigation

Redis failure:
- Impact: room state and lock disruption.
- Mitigation: Redis Sentinel/Cluster, multi-AZ, fast failover, degraded mode with limited new session starts.

Socket server crash:
- Impact: client disconnects for impacted pods.
- Mitigation: multi-pod deployment, reconnect with session resume token, state rebuild from Redis.

Payment service downtime:
- Impact: create-order and verify operations unavailable.
- Mitigation: circuit breaker and queued retry for non-terminal operations, clear client retry UX, status page signal.

Network partition:
- Impact: inconsistent room state and delayed events.
- Mitigation: heartbeat timeouts, authoritative timer on server, idempotent event replay, eventual reconciliation workers.

## 17. Textual Diagrams

### 17.1 Architecture Diagram (Text)
```text
[Clients: Web/Mobile]
  |
  v
[API Gateway / Ingress] ---- [WAF + Rate Limit + TLS]
     |             |
     |             +--> [Realtime Service (Socket.IO)] <--> [Redis Cluster]
     |
     +--> [BFF/API Service] <--> [MongoDB Cluster]
     |             |
     |             +--> [Queue Producer] ---> [BullMQ/Kafka] ---> [Worker Service]
     |
     +--> [Payment Service] <--> [MongoDB]
       |
       +--> [Razorpay]

[Observability: Prometheus + Grafana + OpenTelemetry + Log Store]
```

### 17.2 Sequence: Join Quiz
```text
Participant -> Gateway: GET /join + socket handshake(JWT, roomCode)
Gateway -> Realtime: upgrade and route
Realtime -> Auth module: validate JWT and tenant
Realtime -> Redis: read session:{roomCode}:state
Redis -> Realtime: session state
Realtime -> Participant: room_state + current question snapshot
Realtime -> Queue: emit participant_joined event
```

### 17.3 Sequence: Submit Answer
```text
Participant -> Realtime: submit_answer(questionId, option)
Realtime -> Redis: SETNX answerlock:{room}:{q}:{user}
Redis -> Realtime: lock acquired
Realtime -> Redis: validate expiry and fetch timer state
Realtime -> Realtime: score and anti-cheat checks
Realtime -> Redis ZSET: update leaderboard:{room}
Realtime -> Participant: answer_result
Realtime -> Room participants: leaderboard_delta
Realtime -> Queue: publish answer_submitted event
Worker -> MongoDB: persist submission and update aggregates
```

### 17.4 Sequence: Payment Flow
```text
Participant -> BFF/API: POST /api/payment/create-order
BFF/API -> Payment Service: create-order(tenantId, quizId, userId)
Payment Service -> MongoDB: validate quiz snapshot and eligibility
Payment Service -> Razorpay: create order
Razorpay -> Payment Service: order id
Payment Service -> MongoDB: persist Payment(status=created)
Payment Service -> BFF/API -> Participant: order details

Participant -> BFF/API: POST /api/payment/verify
BFF/API -> Payment Service: verify(orderId, paymentId, signature)
Payment Service -> Payment Service: verify HMAC signature
Payment Service -> MongoDB: idempotent update status=completed
Payment Service -> Queue: publish payment_completed
Worker -> MongoDB: update entitlements/analytics projections
```

## 18. Engineering Decision Summary
Major decisions:
- Redis-backed Socket.IO adapter for horizontal realtime scale.
- Queue-backed async processing for heavy and retry-prone workloads.
- Multi-tenant row-level isolation with tenantId everywhere.
- Idempotency-first design for payments and event processing.
- Kubernetes-native deployment with canary/blue-green release controls.

Major trade-offs:
- Higher system complexity in exchange for scale and reliability.
- Eventual consistency for analytics and some projections to preserve low-latency gameplay.
- Additional infra cost for observability and queueing, offset by safer operations at high concurrency.

## 19. Enterprise Hardening Addendum (Final 10 Percent)

### 19.1 API Gateway Specification (Critical)
API Gateway responsibilities:
- JWT validation at edge for API and websocket upgrade paths.
- Distributed rate limiting enforcement (IP, user, route, event).
- Intelligent routing between BFF/API and Realtime services.
- WebSocket upgrade handling and timeout policy enforcement.
- WAF integration for DDoS/bot protection and OWASP baseline filtering.
- Correlation ID generation/injection and edge access logging.

Reference stack options:
- NGINX Ingress Controller (Kubernetes native).
- Envoy Gateway (advanced policy and observability support).
- AWS API Gateway plus ALB (managed alternative).

Decision:
- Keep gateway stateless and policy-driven.
- Push business authorization to BFF/Realtime services to avoid policy drift.

### 19.2 Distributed Rate Limiting Design
Algorithm:
- Redis-backed sliding window (or token bucket for burst-friendly endpoints).

Key model:
- ratelimit:ip:{ip}
- ratelimit:user:{tenantId}:{userId}
- ratelimit:socket:{tenantId}:{socketId}:{eventType}

Enforcement layers:
- Gateway: coarse IP and ASN-level abuse protection.
- API/BFF: user and tenant quota enforcement.
- Realtime: event-level throttles for submit_answer, join_room, and control events.

Operational detail:
- Return standardized headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After.

### 19.3 Idempotency Strategy (Implementation)
Rule:
- All critical write APIs accept Idempotency-Key header.

Storage:
- Redis primary store: idempotency:{tenantId}:{key} -> response envelope with TTL.
- MongoDB fallback for long-running workflows where key durability must survive Redis failover.

Applied endpoints:
- Payment create-order and verify.
- Quiz start and session transition commands.
- Submission processing APIs where replay can duplicate score or records.

Guarantee:
- Duplicate request with same key and same payload returns original response.
- Key with mismatched payload returns conflict error.

### 19.4 Advanced Anti-Cheat Architecture
Core controls:
1. Time anomaly detection:
- Reject or flag impossible responses (example: less than 200ms from question release).
2. Pattern correlation detection:
- Cluster analysis for near-identical answer vectors across accounts.
3. Device and network fingerprinting:
- Bind risk profile to userId + IP hash + device fingerprint.
4. Multi-tab and multi-socket control:
- Limit concurrent active sockets per user per room.
5. Behavioral scoring:
- Maintain cheat_score and risk bands (low, medium, high).
6. Shadow enforcement:
- Shadow-ban mode for high-risk users (receive synthetic leaderboard while preserving evidence).

Processing model:
- Real-time lightweight checks inline.
- Heavy anomaly scoring asynchronously in worker pipeline.

### 19.5 Cold Start and Warmup Strategy
Pre-session warmup:
- Preload session metadata into Redis before scheduled start.
- Precompute and cache question sequence and timer plan.
- Prime top-N leaderboard structures as empty ZSET skeletons.

Runtime warmup:
- Warm websocket and HTTP paths via synthetic probes.
- Keep minimum warm pods for Realtime and BFF during peak windows.

Outcome:
- Reduces first-question latency spikes and cold pod jitter.

### 19.6 Connection Lifecycle Management
Lifecycle phases:
1. CONNECT:
- Authenticate token, validate tenant and plan, join room.
2. HEARTBEAT:
- Ping/pong every configured interval, monitor RTT and stale sockets.
3. DISCONNECT:
- Remove member from Redis participant set and release transient locks.
4. RECONNECT:
- Resume from session snapshot (question index, timer state, leaderboard delta).

Resilience detail:
- Use reconnect tokens with short TTL to prevent replay abuse.

### 19.7 Data Retention and Compliance
Retention policy baseline:
- Submissions raw events: hot for 7 days, then archive/cold storage.
- Analytics aggregates: long-term retention for trend reporting.
- Raw analytics intermediates: TTL and scheduled purge.
- Redis session keys: strict TTL-based eviction by session lifecycle.

Compliance support:
- GDPR-compliant delete workflows for user data erasure.
- Pseudonymization strategy for historical analytics where lawful.
- Audit logs retention separated from gameplay data retention.

### 19.8 Feature Flag System Design
Flag store:
- Centralized config with Redis cache fronting (or dedicated flag service).

Example flag keys:
- feature:ai_generation:enabled
- feature:premium_leaderboard
- feature:anti_cheat_shadow_mode

Usage:
- Plan-based entitlements.
- Progressive rollout and canary features.
- A/B experimentation and kill switches.

Safety:
- Default-safe behavior when flag service is unreachable.

### 19.9 Disaster Recovery (DR)
MongoDB DR:
- Multi-region replica architecture.
- Point-in-time recovery enabled.

Redis DR:
- Cluster with replicas and automatic failover.
- Persistence mode aligned to recovery targets.

Backups:
- Daily full snapshots plus incremental logs.
- Periodic restore drills in non-production.

Targets:
- RTO less than 5 minutes.
- RPO less than 1 minute for critical payment and session state metadata.

### 19.10 SLA and SLO Model
Service SLO targets:
- API availability: 99.9 percent monthly.
- Realtime event latency: less than 200ms at p95.
- Leaderboard update propagation: less than 100ms at p95 in normal load.
- Payment reliability (successful terminal processing): 99.99 percent.

Error budget:
- Defined per service and consumed through controlled release policy.
- Canary rollout auto-pauses when SLO burn-rate alerts trigger.

Governance:
- Weekly reliability review and incident postmortem action tracking.
