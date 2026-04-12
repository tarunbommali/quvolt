# QuizBolt Server

This service is the main backend for QuizBolt. It handles authentication, quiz management, submission tracking, and realtime quiz orchestration.

Status snapshot (April 2026):
- lifecycle transitions are backend-authoritative
- ownership and role checks guard lifecycle mutations
- health and metrics endpoints are exposed for ops visibility

## Responsibilities

- User authentication and profile endpoints
- Quiz/subject creation and management
- Question CRUD inside quizzes
- Submission history and leaderboard aggregation
- Socket.IO live quiz session flow
- Integration calls to payment service when needed
- AI quiz generation and quiz insertion support

## Session State Machine (Authoritative)

The server is the source of truth for session lifecycle transitions.

Statuses:
- `draft`
- `scheduled`
- `waiting`
- `live`
- `completed`
- `aborted`

State machine implementation:
- `utils/sessionStateMachine.js`

Core transition intent:
- `draft -> waiting` on start
- `draft -> scheduled` on schedule
- `waiting/scheduled -> live` on start-live
- `live -> completed` on complete/end
- `any valid state -> aborted` on abort

Invalid transitions are rejected with conflict errors.

## Tech Stack

- Node.js
- Express
- Mongoose (MongoDB)
- Socket.IO
- JWT auth
- Redis (session/cache helper)

## Setup

Uses shared root `.env`.

Required environment variables include:

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_URL`
- `CLIENT_URL`
- `PAYMENT_SERVICE_URL`

## Run

```bash
cd server
npm install
npm run dev
```

For production:

```bash
npm start
```

## Migration Scripts

Schema/data migration commands:

```bash
npm run migrate:schema:dry
npm run migrate:schema:apply
```

Dry run is recommended before apply.

## API Routes (high-level)

- `/api/auth/*`
- `/api/quiz/*`
- `/api/payment/*` (proxy/integration routes)
- `/api/analytics/*`
- `/api/ai/*`

Lifecycle endpoints (organizer/admin + ownership required):
- `POST /api/quiz/:id/start`
- `POST /api/quiz/:id/start-live`
- `POST /api/quiz/:id/schedule`
- `POST /api/quiz/:id/complete`
- `POST /api/quiz/:id/abort`

Response contract for lifecycle/auth paths:

```json
{
	"success": true,
	"data": {},
	"message": "..."
}
```

```json
{
	"success": false,
	"data": null,
	"message": "..."
}
```

AI quiz generation notes:
- The `/api/ai/generate-quiz` endpoint accepts a topic, count, and a difficulty distribution payload.
- Difficulty distribution is validated in 5% increments and must total 100%.
- Generated questions can be returned for preview or persisted directly into a quiz.

## Notes

- Realtime quiz session handlers are in `sockets/quiz.socket.js`.
- AI generation logic lives in `services/ai.service.js` and `routes/ai.routes.js`.

Security guard stack for lifecycle routes:
- `protect`
- `authorize('organizer', 'admin')`
- `requireQuizOwnership`

## Testing

Default backend suite:

```bash
node --test tests
```

Integration security + lifecycle suites:

```bash
npm run test:integration
```

Deployment reference:
- root EC2 runbook: ../DEPLOYMENT_AWS.md
