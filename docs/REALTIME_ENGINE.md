# Real-Time Engine

How Quvolt's live quiz session works end-to-end.

---

## Overview

The real-time engine has three layers:

```
HTTP API      →  start session, store template snapshot in Redis
Socket.IO     →  broadcast questions, timer, leaderboard
Client Store  →  Zustand (useQuizRealtimeStore) drives all UI
```

All timer and scoring decisions are **server-authoritative**. Clients only display state — they never calculate scores or advance questions.

---

## Session Flow

```
Host clicks "Launch"
  → POST /quiz/:id/start-live
      → template snapshot stored in Redis
      → broadcastQuestionEnhanced() → emits new_question to room
  → socket.emit('session:start')
      → server checks if question already live
          LIVE    → republishCurrentQuestion() [no timer reset]
          WAITING → broadcastQuestionEnhanced() [full broadcast]

Participant joins
  → socket.emit('join_quiz', { roomCode })
  → server responds: join_success + session snapshot
      → if session is LIVE: snapshot includes currentQuestion + expiry
  → client starts local countdown from expiry

Timer expires
  → server scheduleNextAction() fires
  → advances currentQuestionIndex
  → broadcastQuestionEnhanced() for next question
  → if no more questions → quiz_finished
```

---

## Socket Events

### Server → Client

| Event             | Trigger                              | Client action                          |
|-------------------|--------------------------------------|----------------------------------------|
| `join_success`    | Participant joins                    | Enter waiting room or live question    |
| `new_question`    | New question starts                  | Full UI reset, start timer             |
| `question:sync`   | Safe re-broadcast (no timer reset)   | Update expiry only, preserve selection |
| `timer:start`     | Question starts                      | Start countdown from server expiry     |
| `timer:tick`      | Every 1 second                       | Update countdown display               |
| `timer:end`       | Time expired                         | Show waiting state                     |
| `answer_stats`    | Any participant answers              | Update answer distribution chart       |
| `leaderboard:update` | After each answer              | Update leaderboard                     |
| `answer:result`   | Per-participant answer feedback      | Show correct/wrong + score             |
| `quiz_finished`   | All questions done                   | Show final leaderboard                 |
| `quiz_ended_by_host` | Host clicks End Session         | Navigate to results                    |
| `quiz_aborted`    | Host force-stops session             | Redirect to /join                      |
| `session:state`   | Sync request response                | Rebuild full state from snapshot       |

### Client → Server

| Event             | When                                 |
|-------------------|--------------------------------------|
| `join_quiz`       | Participant enters session URL        |
| `rejoin_quiz`     | Reconnect after network drop         |
| `session:start`   | Host clicks Launch                   |
| `session:syncState` | After session:start or watchdog   |
| `submit_answer`   | Participant selects an option        |

---

## Client State (useQuizRealtimeStore)

Single Zustand store drives all participant and host UI.

```
status:          waiting → playing → finished
currentQuestion: { text, options, index, total, expiry, timeLimit }
timeLeft:        derived from expiry (drift-corrected)
expiry:          server timestamp (ms) when question expires
answerStats:     { optionCounts, totalAnswers, fastestUser }
leaderboard:     sorted array of top participants
myResult:        { isCorrect, score, correctAnswer }
isPaused:        boolean
```

---

## Clock Drift Correction

Server sends `serverTime: Date.now()` with every timer event.

```
drift         = Date.now() - serverTime
adjustedExpiry = expiry - drift
```

If your client clock is 2 seconds ahead of the server, the timer adjusts automatically. All clients see the same countdown regardless of local clock skew.

---

## Timer Architecture

```
Server:
  publishTimerStart(roomCode, duration, expiry)
  → emits timer:start to all room members

  setInterval (1s ticks):
  → emits timer:tick every second

Client (module-scoped interval, no window globals):
  startQuestionTimer(expiry):
  → setInterval every 500ms
  → setTimeLeft(expiry - Date.now())
  → auto-clears at 0

  Timer re-syncs on:
  → new_question   (full reset)
  → question:sync  (expiry update, no UI reset)
  → timer:start    (drift-corrected restart)
  → join_success   (if session is already live)
```

---

## Late-Join Recovery

When a participant joins while a session is live:

1. `join_success` response includes the full session snapshot
2. Snapshot has `currentQuestion` (text + options + expiry)
3. Client calls `applyRoomState()` → starts local countdown
4. Participant sees the active question + correct remaining time immediately

No need to wait for the next question.

---

## Idempotent Broadcast

The HTTP `/start-live` endpoint and the `session:start` socket event both try to broadcast. To prevent duplicate timer resets:

```
session:start handler (400ms delay):
  reads session.questionState from Redis
  → 'live'    → republishCurrentQuestion() [re-emits question:sync, no new timers]
  → 'waiting' → broadcastQuestionEnhanced() [starts fresh, new timers]
```

---

## Sequence Number Guard

Every server event includes a `sequenceNumber`. The client rejects any event where:

```
incoming.sequenceNumber <= _lastSequenceNumber
```

This prevents stale out-of-order socket events (e.g. from reconnects) from overwriting newer state.

---

## Session State Machine Guard

`broadcastQuestionEnhanced` enforces:

```
COMPLETED → reject (no re-broadcast after quiz ends)
```

Prevents zombie timer callbacks from firing on a finished session.

---

## Key Files

### Server

| File | Role |
|------|------|
| `server/services/gameplay/question.service.js` | `broadcastQuestionEnhanced`, `republishCurrentQuestion`, `formatQuestion` |
| `server/services/gameplay/gameplay.publisher.js` | `publishNewQuestion`, `publishQuestionSync`, `publishLeaderboardUpdate` |
| `server/services/timer/timer.publisher.js` | `publishTimerStart`, `publishTimerTick`, `publishTimerEnd` |
| `server/services/session/session.lifecycle.service.js` | HTTP start-live, template snapshot |
| `server/sockets/handlers/session.handler.js` | `session:start` socket handler, `buildSessionStateSnapshot` |
| `server/sockets/handlers/question.handler.js` | `question:next`, answer submission |
| `server/services/session/session.timer.service.js` | `scheduleNextAction`, auto-advance |

### Client

| File | Role |
|------|------|
| `client/src/stores/quiz/useQuizRealtimeStore.js` | Single source of truth for live session state |
| `client/src/stores/useSocketStore.js` | Socket → socketEventBus bridge, `startQuizBroadcast`, `joinRoom` |
| `client/src/sockets/socketEventBus.js` | In-process event bus decoupling socket from stores |
| `client/src/sockets/socketEvents.js` | All socket event name constants |
| `client/src/features/participant/pages/ParticipantSessionPage.jsx` | Participant session UI |
| `client/src/features/quiz/pages/LiveSessionPage.jsx` | Host console UI |
| `client/src/features/host/pages/InviteRoom.jsx` | Pre-session lobby + Launch button |

---

## Template Configuration

Before launching, hosts can configure:

| Setting          | Options                        |
|------------------|-------------------------------|
| Timer            | Per-question (seconds)         |
| Auto-advance     | On/off (auto vs tutor mode)   |
| Scoring          | Points per correct answer      |
| Negative marking | Plan-gated (Creator+)          |
| Anti-cheat       | Plan-gated (Teams)             |

Template settings are **snapshotted into Redis** at session start via `session.lifecycle.service.js`. They cannot change mid-session.

---

## Plan Gating

| Feature           | Free | Creator | Teams |
|-------------------|------|---------|-------|
| Basic quiz        | ✅   | ✅      | ✅    |
| Custom timer      | ✅   | ✅      | ✅    |
| Negative marking  | ❌   | ✅      | ✅    |
| Anti-cheat        | ❌   | ❌      | ✅    |
| Unlimited sessions| ❌   | ✅      | ✅    |
