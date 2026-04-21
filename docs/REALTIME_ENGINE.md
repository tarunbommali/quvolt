# Real-Time Engine

How Quvolt's live quiz session works end-to-end using an OOP-driven event architecture.

---

## Overview

The real-time engine is built on three major architectural patterns:

1. **State Pattern (`SessionManager`)**: Manages the lifecycle of a quiz session (`Waiting` → `Live` → `Paused` → `Completed`).
2. **Observer Pattern (`EventBus`)**: Decouples the domain logic from the delivery mechanism.
3. **Bridge Pattern (`SocketManager`)**: Connects internal domain events to external Socket.io broadcasts.

All timer and scoring decisions are **server-authoritative**. Clients only display state — they never calculate scores or advance questions.

---

## Session Flow (OOP)

```
Host clicks "Launch"
  → POST /api/quiz/:id/start-live (OOP Controller)
      → Instantiates SessionManager(sessionModel)
      → SessionManager.transitionTo(LiveState)
          → LiveState.enter()
              → EventBus.emit('SESSION_START')
              → QuestionManager.broadcastQuestion()
                  → EventBus.emit('QUESTION_START')
  → SocketManager (Observer)
      → Listens for 'SESSION_START' / 'QUESTION_START'
      → Bridges to this.io.to(room).emit('session:start' / 'new_question')
  → Clients receive state update and sync UI
```

---

## Socket Events

### Server → Client (Bridged via SocketManager)

| Internal Event (Bus) | Socket Event | Trigger | Client action |
|----------------------|--------------|---------|---------------|
| `SESSION_START`      | `session:start` | Session transitions to LIVE | Show "Get Ready" screen |
| `QUESTION_START`     | `new_question` | New question broadcast | UI reset, start local timer |
| `QUESTION_SYNC`      | `question:sync` | State recovery / Reconnect | Update expiry, preserve selection |
| `TIMER_START`        | `timer:start` | Question starts | Start countdown from server expiry |
| `TIMER_TICK`         | `timer:tick` | Every 1 second | Update countdown display |
| `QUIZ_PAUSED`        | `quiz_paused` | Host pauses quiz | Show pause overlay |
| `QUIZ_RESUMED`       | `quiz_resumed` | Host resumes quiz | Hide pause overlay, resume timer |
| `QUIZ_ENDED`         | `quiz_finished`| All questions done | Show final leaderboard |
| `QUIZ_ABORTED`       | `quiz_aborted` | Host force-stops | Redirect to lobby |

### Client → Server

| Event | When |
|-------|------|
| `join_quiz` | Participant enters session URL |
| `rejoin_quiz` | Reconnect after network drop |
| `session:syncState` | Request full state snapshot |
| `submit_answer` | Participant selects an option |

---

## Clock Drift Correction

Server sends `serverTime: Date.now()` with every timer event.

```
drift          = Date.now() - serverTime
adjustedExpiry = expiry - drift
```

The client adjusts its local `timeLeft` calculation by the measured drift, ensuring all participants see the same countdown regardless of local clock skew.

---

## Hardening Features

### Sequence Number Guard
Every server event includes a `sequenceNumber`. The client rejects any event where `incoming.seq <= _lastSeq`. This prevents stale out-of-order socket events (e.g. from reconnects) from overwriting newer state.

### Authoritative Timing
The server runs the authoritative timer in `session.timer.service.js`. When time expires, the server advances the state and broadcasts the next question. Client timers are purely for display.

### Late-Join Recovery
When a participant joins a LIVE session, the `join_success` response includes the full session snapshot. The client calls `applyRoomState()` to rebuild the UI and start the local timer from the server-provided `expiry`.

---

## Key Files

| Category | Files |
|----------|-------|
| **Lifecycle** | `SessionManager.js`, `SessionStates.js` |
| **Backbone** | `EventBus.js`, `SocketManager.js` |
| **Logic** | `QuestionManager.js`, `ScoringFactory.js` |
| **Persistence** | `session.service.js` (Redis), `statePersistence.js` (Mongo) |
| **Timing** | `session.timer.service.js` |
| **Client** | `useQuizRealtimeStore.js`, `useSocketStore.js` |
