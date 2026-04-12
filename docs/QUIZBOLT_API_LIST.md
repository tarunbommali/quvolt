## QuizBolt API List (Current)

This file tracks the current API surface at a practical level for engineering and QA.

Current implementation wording:
- backend-owned lifecycle state machine is authoritative
- lifecycle mutations are guarded by auth + role + ownership middleware
- frontend route decisions are resolver-based and status-only
- lifecycle/auth flows use a unified success/error envelope where implemented

### Auth
Source:
- Routes: server/routes/authRoutes.js
- Controller: server/controllers/authController.js

- `POST /api/auth/register`
	- Trace flow: `server/routes/authRoutes.js -> registerUser (server/controllers/authController.js)`
	  Anchors: route [server/routes/authRoutes.js#L8](server/routes/authRoutes.js#L8), handler [server/controllers/authController.js#L36](server/controllers/authController.js#L36)
- `POST /api/auth/login`
	- Trace flow: `server/routes/authRoutes.js -> loginUser (server/controllers/authController.js)`
	  Anchors: route [server/routes/authRoutes.js#L16](server/routes/authRoutes.js#L16), handler [server/controllers/authController.js#L86](server/controllers/authController.js#L86)
- `POST /api/auth/refresh`
	- Trace flow: `server/routes/authRoutes.js -> refresh (server/controllers/authController.js)`
	  Anchors: route [server/routes/authRoutes.js#L22](server/routes/authRoutes.js#L22), handler [server/controllers/authController.js#L122](server/controllers/authController.js#L122)
- `POST /api/auth/logout`
	- Trace flow: `server/routes/authRoutes.js -> logoutUser (server/controllers/authController.js)`
	  Anchors: route [server/routes/authRoutes.js#L23](server/routes/authRoutes.js#L23), handler [server/controllers/authController.js#L153](server/controllers/authController.js#L153)
- `GET /api/auth/me`
	- Trace flow: `server/routes/authRoutes.js -> getMyProfile (server/controllers/authController.js)`
	  Anchors: route [server/routes/authRoutes.js#L25](server/routes/authRoutes.js#L25), handler [server/controllers/authController.js#L176](server/controllers/authController.js#L176)
- `PUT /api/auth/me`
	- Trace flow: `server/routes/authRoutes.js -> updateMyProfile (server/controllers/authController.js)`
	  Anchors: route [server/routes/authRoutes.js#L26](server/routes/authRoutes.js#L26), handler [server/controllers/authController.js#L180](server/controllers/authController.js#L180)

### Quiz Core
Source:
- Routes: server/routes/quizRoutes.js
- Controller: server/controllers/quizController.js

- `POST /api/quiz/`
	- Trace flow: `server/routes/quizRoutes.js -> createQuiz (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L47](server/routes/quizRoutes.js#L47), handler [server/controllers/quizController.js#L45](server/controllers/quizController.js#L45)
- `GET /api/quiz/my-quizzes`
	- Trace flow: `server/routes/quizRoutes.js -> getMyQuizzes (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L65](server/routes/quizRoutes.js#L65), handler [server/controllers/quizController.js#L158](server/controllers/quizController.js#L158)
- `GET /api/quiz/organizer/history`
	- Trace flow: `server/routes/quizRoutes.js -> getOrganizerStats (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L67](server/routes/quizRoutes.js#L67), handler [server/controllers/quizController.js#L375](server/controllers/quizController.js#L375)
- `GET /api/quiz/user/history`
	- Trace flow: `server/routes/quizRoutes.js -> getUserHistory (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L68](server/routes/quizRoutes.js#L68), handler [server/controllers/quizController.js#L265](server/controllers/quizController.js#L265)
- `GET /api/quiz/subject/:subjectId/leaderboard`
	- Trace flow: `server/routes/quizRoutes.js -> getSubjectLeaderboard (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L66](server/routes/quizRoutes.js#L66), handler [server/controllers/quizController.js#L221](server/controllers/quizController.js#L221)
- `PUT /api/quiz/:id`
	- Trace flow: `server/routes/quizRoutes.js -> updateQuiz (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L81](server/routes/quizRoutes.js#L81), handler [server/controllers/quizController.js#L421](server/controllers/quizController.js#L421)
- `PUT /api/quiz/:id/full-state`
	- Trace flow: `server/routes/quizRoutes.js -> updateQuizFullState (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L82](server/routes/quizRoutes.js#L82), handler [server/controllers/quizController.js#L457](server/controllers/quizController.js#L457)
- `DELETE /api/quiz/:id`
	- Trace flow: `server/routes/quizRoutes.js -> deleteQuiz (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L94](server/routes/quizRoutes.js#L94), handler [server/controllers/quizController.js#L562](server/controllers/quizController.js#L562)
- `POST /api/quiz/:id/questions`
	- Trace flow: `server/routes/quizRoutes.js -> addQuestion (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L96](server/routes/quizRoutes.js#L96), handler [server/controllers/quizController.js#L101](server/controllers/quizController.js#L101)
- `PUT /api/quiz/:quizId/questions/:questionId`
	- Trace flow: `server/routes/quizRoutes.js -> updateQuestion (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L104](server/routes/quizRoutes.js#L104), handler [server/controllers/quizController.js#L588](server/controllers/quizController.js#L588)
- `DELETE /api/quiz/:quizId/questions/:questionId`
	- Trace flow: `server/routes/quizRoutes.js -> deleteQuestion (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L105](server/routes/quizRoutes.js#L105), handler [server/controllers/quizController.js#L618](server/controllers/quizController.js#L618)
- `GET /api/quiz/:id/leaderboard`
	- Trace flow: `server/routes/quizRoutes.js -> getQuizLeaderboard (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L107](server/routes/quizRoutes.js#L107), handler [server/controllers/quizController.js#L337](server/controllers/quizController.js#L337)
- `GET /api/quiz/:roomCode`
	- Trace flow: `server/routes/quizRoutes.js -> getQuizByCode (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L110](server/routes/quizRoutes.js#L110), handler [server/controllers/quizController.js#L129](server/controllers/quizController.js#L129)

### Lifecycle (State Machine)
Protected by auth + role + ownership where applicable.

Source:
- Routes: server/routes/quizRoutes.js
- Controller: server/controllers/quizController.js
- Lifecycle service/state machine: server/services/quiz.service.js, server/utils/sessionStateMachine.js

- `POST /api/quiz/:id/start`
	- transition target: `waiting`
	- Trace flow: `server/routes/quizRoutes.js -> startQuizSession (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L83](server/routes/quizRoutes.js#L83), handler [server/controllers/quizController.js#L633](server/controllers/quizController.js#L633)
- `POST /api/quiz/:id/start-live`
	- transition target: `live`
	- Trace flow: `server/routes/quizRoutes.js -> startLiveSession (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L84](server/routes/quizRoutes.js#L84), handler [server/controllers/quizController.js#L706](server/controllers/quizController.js#L706)
- `POST /api/quiz/:id/schedule`
	- transition target: `scheduled`
	- Trace flow: `server/routes/quizRoutes.js -> scheduleQuiz (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L92](server/routes/quizRoutes.js#L92), handler [server/controllers/quizController.js#L1081](server/controllers/quizController.js#L1081)
- `POST /api/quiz/:id/complete`
	- transition target: `completed`
	- Trace flow: `server/routes/quizRoutes.js -> endQuizSession (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L91](server/routes/quizRoutes.js#L91), handler [server/controllers/quizController.js#L1261](server/controllers/quizController.js#L1261)
- `POST /api/quiz/:id/end`
	- alias for complete
	- Trace flow: `server/routes/quizRoutes.js -> endQuizSession (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L90](server/routes/quizRoutes.js#L90), handler [server/controllers/quizController.js#L1261](server/controllers/quizController.js#L1261)
- `POST /api/quiz/:id/abort`
	- transition target: `aborted`
	- Trace flow: `server/routes/quizRoutes.js -> abortSession (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L85](server/routes/quizRoutes.js#L85), handler [server/controllers/quizController.js#L742](server/controllers/quizController.js#L742)
- `POST /api/quiz/:id/pause`
	- Trace flow: `server/routes/quizRoutes.js -> pauseSession (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L86](server/routes/quizRoutes.js#L86), handler [server/controllers/quizController.js#L778](server/controllers/quizController.js#L778)
- `POST /api/quiz/:id/resume`
	- Trace flow: `server/routes/quizRoutes.js -> resumeSession (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L87](server/routes/quizRoutes.js#L87), handler [server/controllers/quizController.js#L793](server/controllers/quizController.js#L793)
- `POST /api/quiz/:id/next-question`
	- Trace flow: `server/routes/quizRoutes.js -> nextQuestion (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L88](server/routes/quizRoutes.js#L88), handler [server/controllers/quizController.js#L808](server/controllers/quizController.js#L808)
- `POST /api/quiz/:id/reveal-answer`
	- Trace flow: `server/routes/quizRoutes.js -> revealAnswer (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L89](server/routes/quizRoutes.js#L89), handler [server/controllers/quizController.js#L1242](server/controllers/quizController.js#L1242)

### Session and Participant Views
Source:
- Routes: server/routes/quizRoutes.js
- Controller: server/controllers/quizController.js

- `GET /api/quiz/session/:sessionCode/results`
	- Trace flow: `server/routes/quizRoutes.js -> getSessionResults (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L75](server/routes/quizRoutes.js#L75), handler [server/controllers/quizController.js#L824](server/controllers/quizController.js#L824)
- `GET /api/quiz/session/:sessionCode/participants`
	- Trace flow: `server/routes/quizRoutes.js -> getSessionParticipants (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L76](server/routes/quizRoutes.js#L76), handler [server/controllers/quizController.js#L890](server/controllers/quizController.js#L890)
- `GET /api/quiz/session/:sessionCode/participants/export`
	- Trace flow: `server/routes/quizRoutes.js -> exportSessionParticipants (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L77](server/routes/quizRoutes.js#L77), handler [server/controllers/quizController.js#L971](server/controllers/quizController.js#L971)
- `GET /api/quiz/session/:sessionCode/stats`
	- Trace flow: `server/routes/quizRoutes.js -> getAnswerStats (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L78](server/routes/quizRoutes.js#L78), handler [server/controllers/quizController.js#L1280](server/controllers/quizController.js#L1280)
- `GET /api/quiz/:id/sessions`
	- Trace flow: `server/routes/quizRoutes.js -> getQuizSessions (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L93](server/routes/quizRoutes.js#L93), handler [server/controllers/quizController.js#L1067](server/controllers/quizController.js#L1067)
- `POST /api/quiz/join-scheduled/:roomCode`
	- Trace flow: `server/routes/quizRoutes.js -> joinScheduledSession (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L72](server/routes/quizRoutes.js#L72), handler [server/controllers/quizController.js#L1156](server/controllers/quizController.js#L1156)
- `GET /api/quiz/user/scheduled-joins`
	- Trace flow: `server/routes/quizRoutes.js -> getMyScheduledJoins (server/controllers/quizController.js)`
	  Anchors: route [server/routes/quizRoutes.js#L71](server/routes/quizRoutes.js#L71), handler [server/controllers/quizController.js#L1202](server/controllers/quizController.js#L1202)

### Analytics
Source:
- Routes: server/routes/analytics.routes.js
- Service: server/services/analytics.service.js

- `GET /api/analytics/quiz/:quizId`
	- Trace flow: `server/routes/analytics.routes.js -> inline route handler -> getQuizAnalytics (server/services/analytics.service.js)`
	  Anchors: route [server/routes/analytics.routes.js#L8](server/routes/analytics.routes.js#L8), service [server/services/analytics.service.js#L36](server/services/analytics.service.js#L36)
- `GET /api/analytics/user`
	- Trace flow: `server/routes/analytics.routes.js -> inline route handler -> getUserAnalytics (server/services/analytics.service.js)`
	  Anchors: route [server/routes/analytics.routes.js#L27](server/routes/analytics.routes.js#L27), service [server/services/analytics.service.js#L249](server/services/analytics.service.js#L249)
- `GET /api/analytics/user/:userId`
	- Trace flow: `server/routes/analytics.routes.js -> inline route handler -> getUserAnalytics (server/services/analytics.service.js)`
	  Anchors: route [server/routes/analytics.routes.js#L36](server/routes/analytics.routes.js#L36), service [server/services/analytics.service.js#L249](server/services/analytics.service.js#L249)
- `GET /api/analytics/summary`
	- Trace flow: `server/routes/analytics.routes.js -> inline route handler -> getOrganizerAnalyticsSummary (server/services/analytics.service.js)`
	  Anchors: route [server/routes/analytics.routes.js#L45](server/routes/analytics.routes.js#L45), service [server/services/analytics.service.js#L411](server/services/analytics.service.js#L411)

### AI
Source:
- Routes: server/routes/ai.routes.js
- Service: server/services/ai.service.js

- `POST /api/ai/generate-quiz`
	- Trace flow: `server/routes/ai.routes.js -> inline route handler -> generateWithDistribution/saveQuestionsToQuiz (server/services/ai.service.js)`
	  Anchors: route [server/routes/ai.routes.js#L27](server/routes/ai.routes.js#L27), services [server/services/ai.service.js#L235](server/services/ai.service.js#L235), [server/services/ai.service.js#L275](server/services/ai.service.js#L275)

### Payment (Server Proxy Surface)
Source:
- Server proxy route: server/routes/paymentRoutes.js
- Payment service routes/controllers: payment-service/routes/paymentRoutes.js, payment-service/controllers/paymentController.js, payment-service/controllers/revenueController.js

- `POST /api/payment/create-order`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/create-order') -> payment-service/routes/paymentRoutes.js -> createOrder (payment-service/controllers/paymentController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L84](server/routes/paymentRoutes.js#L84), upstream route [payment-service/routes/paymentRoutes.js#L17](payment-service/routes/paymentRoutes.js#L17), handler [payment-service/controllers/paymentController.js#L73](payment-service/controllers/paymentController.js#L73)
- `POST /api/payment/verify`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/verify') -> payment-service/routes/paymentRoutes.js -> verifyPayment (payment-service/controllers/paymentController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L100](server/routes/paymentRoutes.js#L100), upstream route [payment-service/routes/paymentRoutes.js#L18](payment-service/routes/paymentRoutes.js#L18), handler [payment-service/controllers/paymentController.js#L234](payment-service/controllers/paymentController.js#L234)
- `GET /api/payment/status/:quizId`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/status/:quizId') -> payment-service/routes/paymentRoutes.js -> getPaymentStatus (payment-service/controllers/paymentController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L119](server/routes/paymentRoutes.js#L119), upstream route [payment-service/routes/paymentRoutes.js#L19](payment-service/routes/paymentRoutes.js#L19), handler [payment-service/controllers/paymentController.js#L343](payment-service/controllers/paymentController.js#L343)
- `POST /api/payment/status/batch`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/status/batch') -> payment-service/routes/paymentRoutes.js -> getBatchPaymentStatus (payment-service/controllers/paymentController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L125](server/routes/paymentRoutes.js#L125), upstream route [payment-service/routes/paymentRoutes.js#L20](payment-service/routes/paymentRoutes.js#L20), handler [payment-service/controllers/paymentController.js#L383](payment-service/controllers/paymentController.js#L383)
- `POST /api/payment/host/account`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/host/account') -> payment-service/routes/paymentRoutes.js -> upsertHostAccount (payment-service/controllers/paymentController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L134](server/routes/paymentRoutes.js#L134), upstream route [payment-service/routes/paymentRoutes.js#L22](payment-service/routes/paymentRoutes.js#L22), handler [payment-service/controllers/paymentController.js#L419](payment-service/controllers/paymentController.js#L419)
- `GET /api/payment/host/account`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/host/account') -> payment-service/routes/paymentRoutes.js -> getMyHostAccount (payment-service/controllers/paymentController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L140](server/routes/paymentRoutes.js#L140), upstream route [payment-service/routes/paymentRoutes.js#L23](payment-service/routes/paymentRoutes.js#L23), handler [payment-service/controllers/paymentController.js#L452](payment-service/controllers/paymentController.js#L452)
- `GET /api/payment/host/payout-summary`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/host/payout-summary') -> payment-service/routes/paymentRoutes.js -> getHostPayoutSummary (payment-service/controllers/paymentController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L146](server/routes/paymentRoutes.js#L146), upstream route [payment-service/routes/paymentRoutes.js#L24](payment-service/routes/paymentRoutes.js#L24), handler [payment-service/controllers/paymentController.js#L465](payment-service/controllers/paymentController.js#L465)
- `POST /api/payment/revenue/total`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/revenue/total') -> payment-service/routes/paymentRoutes.js -> getTotalRevenue (payment-service/controllers/revenueController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L152](server/routes/paymentRoutes.js#L152), upstream route [payment-service/routes/paymentRoutes.js#L27](payment-service/routes/paymentRoutes.js#L27), handler [payment-service/controllers/revenueController.js#L29](payment-service/controllers/revenueController.js#L29)
- `POST /api/payment/revenue/by-quiz`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/revenue/by-quiz') -> payment-service/routes/paymentRoutes.js -> getRevenueByQuiz (payment-service/controllers/revenueController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L158](server/routes/paymentRoutes.js#L158), upstream route [payment-service/routes/paymentRoutes.js#L28](payment-service/routes/paymentRoutes.js#L28), handler [payment-service/controllers/revenueController.js#L80](payment-service/controllers/revenueController.js#L80)
- `POST /api/payment/revenue/by-period`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/revenue/by-period') -> payment-service/routes/paymentRoutes.js -> getRevenueByPeriod (payment-service/controllers/revenueController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L164](server/routes/paymentRoutes.js#L164), upstream route [payment-service/routes/paymentRoutes.js#L29](payment-service/routes/paymentRoutes.js#L29), handler [payment-service/controllers/revenueController.js#L135](payment-service/controllers/revenueController.js#L135)
- `POST /api/payment/admin/revenue/total`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/revenue/total') -> payment-service/routes/paymentRoutes.js -> getTotalRevenue (payment-service/controllers/revenueController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L169](server/routes/paymentRoutes.js#L169), upstream route [payment-service/routes/paymentRoutes.js#L27](payment-service/routes/paymentRoutes.js#L27), handler [payment-service/controllers/revenueController.js#L29](payment-service/controllers/revenueController.js#L29)
- `POST /api/payment/admin/revenue/by-period`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/payment/revenue/by-period') -> payment-service/routes/paymentRoutes.js -> getRevenueByPeriod (payment-service/controllers/revenueController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L173](server/routes/paymentRoutes.js#L173), upstream route [payment-service/routes/paymentRoutes.js#L29](payment-service/routes/paymentRoutes.js#L29), handler [payment-service/controllers/revenueController.js#L135](payment-service/controllers/revenueController.js#L135)
- `GET /api/payment/health`
	- Trace flow: `server/routes/paymentRoutes.js -> axios GET /payment/health on payment-service`
	  Anchors: route [server/routes/paymentRoutes.js#L179](server/routes/paymentRoutes.js#L179), upstream health [payment-service/server.js#L121](payment-service/server.js#L121)

### Payment Subscription (Under /api/payment)
Source:
- Server proxy route: server/routes/paymentRoutes.js
- Payment service routes/controllers: payment-service/routes/subscriptionRoutes.js, payment-service/controllers/subscriptionController.js

- `GET /api/payment/subscription/plans`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/subscription/plans') -> payment-service/routes/subscriptionRoutes.js -> getAllSubscriptionPlans (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L192](server/routes/paymentRoutes.js#L192), upstream route [payment-service/routes/subscriptionRoutes.js#L8](payment-service/routes/subscriptionRoutes.js#L8), handler [payment-service/controllers/subscriptionController.js#L29](payment-service/controllers/subscriptionController.js#L29)
- `GET /api/payment/subscription/my-subscription`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/subscription/my-subscription') -> payment-service/routes/subscriptionRoutes.js -> getHostSubscription (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L198](server/routes/paymentRoutes.js#L198), upstream route [payment-service/routes/subscriptionRoutes.js#L11](payment-service/routes/subscriptionRoutes.js#L11), handler [payment-service/controllers/subscriptionController.js#L47](payment-service/controllers/subscriptionController.js#L47)
- `POST /api/payment/subscription/create-order`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/subscription/create-order') -> payment-service/routes/subscriptionRoutes.js -> createSubscriptionOrder (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L204](server/routes/paymentRoutes.js#L204), upstream route [payment-service/routes/subscriptionRoutes.js#L13](payment-service/routes/subscriptionRoutes.js#L13), handler [payment-service/controllers/subscriptionController.js#L112](payment-service/controllers/subscriptionController.js#L112)
- `POST /api/payment/subscription/verify-payment`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/subscription/verify-payment') -> payment-service/routes/subscriptionRoutes.js -> verifySubscriptionPayment (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L216](server/routes/paymentRoutes.js#L216), upstream route [payment-service/routes/subscriptionRoutes.js#L15](payment-service/routes/subscriptionRoutes.js#L15), handler [payment-service/controllers/subscriptionController.js#L241](payment-service/controllers/subscriptionController.js#L241)
- `POST /api/payment/subscription/cancel`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/subscription/cancel') -> payment-service/routes/subscriptionRoutes.js -> cancelHostSubscription (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L235](server/routes/paymentRoutes.js#L235), upstream route [payment-service/routes/subscriptionRoutes.js#L17](payment-service/routes/subscriptionRoutes.js#L17), handler [payment-service/controllers/subscriptionController.js#L311](payment-service/controllers/subscriptionController.js#L311)
- `GET /api/payment/subscription/admin/statistics`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/subscription/admin/statistics') -> payment-service/routes/subscriptionRoutes.js -> getSubscriptionStatistics (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L242](server/routes/paymentRoutes.js#L242), upstream route [payment-service/routes/subscriptionRoutes.js#L20](payment-service/routes/subscriptionRoutes.js#L20), handler [payment-service/controllers/subscriptionController.js#L352](payment-service/controllers/subscriptionController.js#L352)
- `GET /api/payment/subscription/admin/all`
	- Trace flow: `server/routes/paymentRoutes.js -> proxy('/subscription/admin/all') -> payment-service/routes/subscriptionRoutes.js -> getAllActiveSubscriptions (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/paymentRoutes.js#L248](server/routes/paymentRoutes.js#L248), upstream route [payment-service/routes/subscriptionRoutes.js#L21](payment-service/routes/subscriptionRoutes.js#L21), handler [payment-service/controllers/subscriptionController.js#L371](payment-service/controllers/subscriptionController.js#L371)

### Subscription Proxy (Server /api/subscription)
Source:
- Server proxy route: server/routes/subscriptionRoutes.js
- Upstream payment service route/controller: payment-service/routes/subscriptionRoutes.js, payment-service/controllers/subscriptionController.js

- `GET /api/subscription/plans`
	- Trace flow: `server/routes/subscriptionRoutes.js -> proxy('/subscription/plans') -> payment-service/routes/subscriptionRoutes.js -> getAllSubscriptionPlans (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/subscriptionRoutes.js#L52](server/routes/subscriptionRoutes.js#L52), upstream route [payment-service/routes/subscriptionRoutes.js#L8](payment-service/routes/subscriptionRoutes.js#L8), handler [payment-service/controllers/subscriptionController.js#L29](payment-service/controllers/subscriptionController.js#L29)
- `GET /api/subscription/status`
	- Trace flow: `server/routes/subscriptionRoutes.js -> proxy('/subscription/status') -> payment-service/routes/subscriptionRoutes.js -> getSubscriptionStatus (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/subscriptionRoutes.js#L53](server/routes/subscriptionRoutes.js#L53), upstream route [payment-service/routes/subscriptionRoutes.js#L12](payment-service/routes/subscriptionRoutes.js#L12), handler [payment-service/controllers/subscriptionController.js#L82](payment-service/controllers/subscriptionController.js#L82)
- `POST /api/subscription/create`
	- Trace flow: `server/routes/subscriptionRoutes.js -> proxy('/subscription/create') -> payment-service/routes/subscriptionRoutes.js -> createSubscriptionOrder (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/subscriptionRoutes.js#L54](server/routes/subscriptionRoutes.js#L54), upstream route [payment-service/routes/subscriptionRoutes.js#L14](payment-service/routes/subscriptionRoutes.js#L14), handler [payment-service/controllers/subscriptionController.js#L112](payment-service/controllers/subscriptionController.js#L112)
- `POST /api/subscription/verify`
	- Trace flow: `server/routes/subscriptionRoutes.js -> proxy('/subscription/verify') -> payment-service/routes/subscriptionRoutes.js -> verifySubscriptionPayment (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/subscriptionRoutes.js#L63](server/routes/subscriptionRoutes.js#L63), upstream route [payment-service/routes/subscriptionRoutes.js#L16](payment-service/routes/subscriptionRoutes.js#L16), handler [payment-service/controllers/subscriptionController.js#L241](payment-service/controllers/subscriptionController.js#L241)
- `POST /api/subscription/cancel`
	- Trace flow: `server/routes/subscriptionRoutes.js -> proxy('/subscription/cancel') -> payment-service/routes/subscriptionRoutes.js -> cancelHostSubscription (payment-service/controllers/subscriptionController.js)`
	  Anchors: route [server/routes/subscriptionRoutes.js#L73](server/routes/subscriptionRoutes.js#L73), upstream route [payment-service/routes/subscriptionRoutes.js#L17](payment-service/routes/subscriptionRoutes.js#L17), handler [payment-service/controllers/subscriptionController.js#L311](payment-service/controllers/subscriptionController.js#L311)

### Health
Source:
- Server app entry + metrics registration: server/server.js, server/observability/metrics.js
- Payment health proxy: server/routes/paymentRoutes.js

- `GET /api/health`
	- Trace flow: `server/server.js -> app.get('/api/health')`
	  Anchors: route [server/server.js#L158](server/server.js#L158)
- `GET /api/metrics`
	- Trace flow: `server/server.js -> app.get('/api/metrics') + server/observability/metrics.js`
	  Anchors: route [server/server.js#L177](server/server.js#L177), metrics [server/observability/metrics.js#L1](server/observability/metrics.js#L1)

## Response Contract

Lifecycle and auth-sensitive routes use:

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

## Security Notes
- Lifecycle mutation routes require organizer/admin role.
- Ownership is enforced through middleware for lifecycle mutation endpoints.
- Invalid transitions are rejected as conflict-style responses.
