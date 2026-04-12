# Tutor Mode Implementation Guide

## Overview
This document outlines the complete implementation of the **Tutor Mode** feature for the Quiz application. Tutor Mode provides a controlled, instructor-led quiz experience where the host can manually progress through questions and reveal answers, unlike the automatic progression in Auto Mode.

## Compatibility Note (2026-04)

The platform now uses an explicit session lifecycle state machine and standardized lifecycle/auth API contracts.

When extending tutor mode flows, align with:
- `server/utils/sessionStateMachine.js`
- lifecycle route protection (`protect`, `authorize`, `requireQuizOwnership`)
- response contract: `success`, `data`, `message`

## Architecture

### 1. Core Concepts

#### Modes of Operation
- **Auto Mode** (default): Questions automatically advance after the timer expires
- **Tutor Mode**: Questions are manually advanced by the host after review

#### Question States
- `live`: Question is actively being answered
- `review`: Answer phase has ended, waiting for host action (tutor mode only)
- `waiting`: Between questions

### 2. Implementation Components

## Backend Implementation

### A. Service Layer (quiz.service.js)

#### 1. **broadcastQuestionEnhanced** - Core Broadcasting Function
```javascript
const broadcastQuestionEnhanced = async (io, roomCode) => {
    // Handles quiz completion logic
    if (session.currentQuestionIndex >= questions.length) {
        // Emit quiz_finished event
        // Calculate top winners
        // Persist to database
    }
    
    // Broadcasts new question
    // Sets questionState to 'live'
    // Emits 'new_question', 'answer_stats' events
    
    // Mode-specific behavior:
    // - Auto Mode: Sets timer for auto-advance
    // - Tutor Mode: Sets timer to transition to review state
}
```

**Key Events:**
- `new_question`: Question details, expiry time
- `answer_stats`: Initial stats for current question
- `fastest_user`: Fastest responder tracking
- `question_review_mode`: Notification when review phase starts (tutor only)

#### 2. **revealAnswer** - Show Correct Answer
```javascript
const revealAnswer = async ({ io, roomCode, user }) => {
    // Validates user is organizer/admin
    // Validates question state is 'review'
    // Emits 'show_correct_answer' event with:
    //   - correctAnswer
    //   - explanation
    //   - questionId
}
```

**Authorization:** Organizer or Admin only

#### 3. **endQuizSession** - Terminate Quiz
```javascript
const endQuizSession = async ({ io, quizId, sessionCode, user }) => {
    // Validates authorization
    // Sets session status to 'completed'
    // Clears all timers
    // Emits 'quiz_ended_by_host' event
    // Returns top winners
}
```

**Authorization:** Organizer or Admin only

#### 4. **calculateAnswerStats** - Analytics
```javascript
const calculateAnswerStats = async (roomCode, questionIndex) => {
    // Returns detailed stats:
    // - totalAnswers: Number of participants who answered
    // - correctCount: Number of correct answers
    // - accuracy: Percentage of correct answers
    // - optionCounts: Distribution per option
    // - fastestUser: First responder data
}
```

#### 5. **broadcastQuestion** - Maintained for Backward Compatibility
Now delegates to `broadcastQuestionEnhanced` for consistent behavior

### B. Socket Handlers (quiz.socket.js)

#### New Event Handlers

```javascript
// Reveal correct answer (host action)
socket.on('reveal_answer', async ({ roomCode, sessionCode }) => {
    const result = await quizService.revealAnswer({ io, roomCode, user });
    // Emits 'show_correct_answer' to room
});

// End quiz session (host action)
socket.on('end_quiz', async ({ quizId, sessionCode, roomCode }) => {
    const result = await quizService.endQuizSession({ io, quizId, sessionCode, user });
    // Emits 'quiz_ended_by_host' to room
});

// Next question (updated for tutor support)
socket.on('next_question', async ({ quizId, sessionId, sessionCode, roomCode }) => {
    // Now uses broadcastQuestionEnhanced for proper mode handling
});

// Start quiz (updated)
socket.on('start_quiz', async ({ roomCode, sessionId, mode }) => {
    // Uses broadcastQuestionEnhanced instead of broadcastQuestion
});
```

### C. HTTP Routes (quizRoutes.js)

#### New Endpoints

```
POST /:id/reveal-answer
- Authorization: Organizer, Admin
- Body: { sessionCode }
- Response: { message, roomCode, ...revealResult }

POST /:id/end
- Authorization: Organizer, Admin
- Body: { sessionCode }
- Response: { message, topWinners, ...endResult }

GET /session/:sessionCode/stats
- Authorization: Any authenticated user
- Response: { questionIndex, questionId, totalAnswers, accuracy, ... }
```

### D. Controller Implementation (quizController.js)

Three new controller methods:

```javascript
// Reveal answer endpoint
const revealAnswer = async (req, res) => {
    // Calls quizService.revealAnswer
    // Returns answer data
}

// End quiz endpoint
const endQuizSession = async (req, res) => {
    // Calls quizService.endQuizSession
    // Returns completion data
}

// Get answer statistics endpoint
const getAnswerStats = async (req, res) => {
    // Calls quizService.calculateAnswerStats
    // Returns detailed statistics
}
```

## Data Flow

### Quiz Start Flow
```
1. Host initiates quiz with mode='tutor'
2. startQuizSession creates QuizSession with mode
3. broadcastQuestionEnhanced sends first question
4. Session state set to:
   - status: 'ongoing'
   - mode: 'tutor'
   - questionState: 'live'
```

### Question Progression - Auto Mode
```
1. Question broadcast (questionState='live')
2. Timer starts for time limit
3. Timer expires
4. Auto-advance occurs → next question broadcast
```

### Question Progression - Tutor Mode
```
1. Question broadcast (questionState='live')
2. Timer starts for time limit
3. Timer expires → state changes to 'review'
4. Emit 'question_review_mode' to participants
5. Host reviews answers and stats
6. Host clicks "Reveal Answer" → show_correct_answer emitted
7. Host clicks "Next Question" → manually advance
8. New question broadcast
```

## Client-Side Integration

### Frontend Events to Listen For

```javascript
// Question started
socket.on('new_question', (questionData) => {
    // Display question
    // Show timer
    // Enable answer submission
});

// Answer statistics updated
socket.on('answer_stats', (stats) => {
    // Update live stats display (if showing)
});

// Answer phase ended (tutor mode)
socket.on('question_review_mode', (data) => {
    // Disable answer submission
    // Show "Waiting for host..." message
});

// Correct answer revealed
socket.on('show_correct_answer', (answerData) => {
    // Highlight correct option
    // Show explanation
    // Display correctness feedback
});

// Quiz ended by host
socket.on('quiz_ended_by_host', (data) => {
    // Display final leaderboard
    // Show message about early termination
});

// Quiz finished (all questions done)
socket.on('quiz_finished', () => {
    // Normal completion flow
});
```

### Frontend Actions to Emit

```javascript
// Start quiz with mode
socket.emit('start_quiz', {
    roomCode: 'QUIZ_CODE',
    mode: 'tutor',  // or 'auto'
});

// Reveal answer (host only)
socket.emit('reveal_answer', {
    roomCode: 'SESSION_CODE',
});

// Next question (host only)
socket.emit('next_question', {
    quizId: 'QUIZ_ID',
    sessionCode: 'SESSION_CODE',
});

// End quiz (host only)
socket.emit('end_quiz', {
    quizId: 'QUIZ_ID',
    sessionCode: 'SESSION_CODE',
});

// Fetch current answer stats
fetch(`/api/quizzes/session/${sessionCode}/stats`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json());
```

## Database Schema Changes

### QuizSession Model

Existing fields now used for tutor mode:
- `mode`: 'auto' | 'tutor'
- `status`: 'ongoing' | 'live' | 'completed' | 'aborted'
- `topWinners`: Array of top 10 participants with scores

### Session State (Redis)

New field:
```javascript
{
    questionState: 'live' | 'review' | 'waiting',  // STEP 1 & 4
    currentQuestionStats: {
        questionId: String,
        optionCounts: Object,
        totalAnswers: Number,
        fastestUser: Object,
    },
    // ... existing fields
}
```

## Authorization & Security

### Access Control

- **Quiz Owner**: Can start quiz, pause, resume, advance questions, reveal answers, end quiz
- **Admin**: Can perform all organizer actions
- **Participants**: Can view questions, submit answers, view leaderboard
- **Unauthorized Users**: Cannot access quiz-specific endpoints

### Validation

- Session ownership verified before host actions
- Role checking on socket handlers and HTTP endpoints
- Question state validation before revealing answer
- Authorization checks on QuizSession updates

## Error Handling

### Common Error Scenarios

```javascript
// Question not found
if (!question) return { error: 'Question not found' }

// Unauthorized user
if (user?.role !== 'organizer' && user?.role !== 'admin') 
    return { error: 'Unauthorized' }

// Invalid question state
if (session.questionState !== 'review')
    return { error: 'Question review phase not active' }

// Session not found
if (!session) return { error: 'Session not found' }

// Quiz not found
if (!quiz) return { error: 'Quiz not found' }
```

## Implementation Steps Summary

### Step 1: Set Question State
When question is broadcast and goes live, `questionState = 'live'` is set in session.

### Step 2: Broadcast First Question
When quiz starts, `broadcastQuestionEnhanced` is called to send the first question.

### Step 3: Fix Pause Mechanism
Pause works at any time regardless of answer state.

### Step 4: Tutor Mode Review State
When timer expires in tutor mode, `questionState` transitions from 'live' to 'review'.

### Step 5: Calculate Answer Stats
`calculateAnswerStats` provides detailed breakdown of participant answers including accuracy and distribution.

### Step 6: Reveal Correct Answer
Host can explicitly show the correct answer and explanation during review phase.

### Step 7: Manual Question Advancement
`advanceQuizQuestion` uses `broadcastQuestionEnhanced` which respects mode and doesn't auto-advance in tutor mode.

### Step 8: End Quiz Session
Host can terminate quiz at any time with `endQuizSession`, showing final leaderboard.

## Testing Checklist

### Auto Mode Tests
- [ ] Quiz starts in auto mode
- [ ] Questions auto-advance after timer
- [ ] Quiz completes automatically
- [ ] Host can manually pause/resume
- [ ] Host can manually advance

### Tutor Mode Tests
- [ ] Quiz starts in tutor mode
- [ ] Questions do NOT auto-advance
- [ ] Questions transition to review state
- [ ] Host can reveal correct answer
- [ ] Host can manually advance to next question
- [ ] Answer stats are calculated correctly
- [ ] Host can end quiz early

### Edge Cases
- [ ] Pause in middle of answer phase
- [ ] End quiz during review state
- [ ] Reveal answer before review state shows error
- [ ] Session cleanup after completion

## Performance Considerations

1. **Timer Management**: Active timers cleared properly to prevent memory leaks
2. **Session Cleanup**: Sessions deleted 10 minutes after completion
3. **Answer Stats**: Calculated on-demand, not persisted
4. **Database Queries**: Minimized with lean() for read-only operations

## Future Enhancements

1. **Answer Review Analytics**: Track which options participants chose
2. **Time-Based Analysis**: Show average response time per question
3. **Custom Timer Extensions**: Allow host to extend answer time
4. **Vote-Based Advancement**: Require minimum correct answers before advancing
5. **Explain Phase**: Host provides explanation with answer reveal
6. **Participant Feedback**: Real-time participant reaction polling

## References

- **Quiz Model**: server/models/Quiz.js
- **QuizSession Model**: server/models/QuizSession.js
- **Session Service**: server/services/session.service.js
- **Quiz Routes**: server/routes/quizRoutes.js
- **Quiz Socket**: server/sockets/quiz.socket.js
- **Quiz Controller**: server/controllers/quizController.js
