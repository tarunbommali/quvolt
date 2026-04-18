# Implementation Plan: SaaS Enhancement Refactor

## Overview

This implementation plan covers three major enhancements to the quiz application:
1. **Quiz Engine Workflow** - State machine, session recovery, and real-time synchronization
2. **Payment Gateway Routing** - Multi-provider support with failover and health monitoring
3. **Role-Based Access Control (RBAC)** - Granular permissions and audit logging

The implementation follows an incremental approach, building core functionality first, then adding resilience features, and finally integrating all components.

## Tasks

- [x] 1. Set up Quiz Engine State Machine
  - [x] 1.1 Enhance existing state machine with comprehensive validation
    - Extend `server/utils/sessionStateMachine.js` with complete transition rules
    - Ensure transition validation for: draft → scheduled → waiting → live → completed
    - Verify abort transitions from any state except completed
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Integrate enhanced state machine with quiz service
    - Update `server/services/quiz/quiz.service.js` to use enhanced state machine for all transitions
    - Add state persistence before acknowledging transitions
    - Implement comprehensive error handling for invalid transitions
    - _Requirements: 1.1, 1.2, 1.6_
  
  - [x] 1.3 Write unit tests for state machine
    - Test all valid transitions
    - Test invalid transition rejection
    - Test abort from various states
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement Quiz Mode Workflow Controls
  - [x] 2.1 Add mode-specific question advancement logic
    - Verify `mode` field exists in Quiz and QuizSession models (already present)
    - Enhance auto-advancement timer logic in `server/services/quiz/quiz.service.js`
    - Implement manual advancement controls for tutor mode
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 2.2 Add pause/resume functionality
    - Implement pause state with question state preservation
    - Store remaining time when paused
    - Restore state and adjust timing on resume
    - _Requirements: 1.7, 1.8, 2.7_
  
  - [x] 2.3 Update WebSocket handlers for mode controls
    - Add socket events in `server/sockets/` for: `host:next-question`, `host:pause`, `host:resume`
    - Broadcast question state changes to all participants
    - Ensure broadcasts complete within 1 second
    - _Requirements: 2.4, 2.5_
  
  - [x] 2.4 Write integration tests for quiz modes
    - Test auto mode advancement
    - Test tutor mode manual controls
    - Test pause/resume functionality
    - _Requirements: 2.1, 2.2, 2.3, 2.7_

- [x] 3. Checkpoint - Verify state machine and mode controls
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Session Recovery System
  - [x] 4.1 Create session recovery service
    - Create `server/services/session/sessionRecovery.js`
    - Implement `rebootQuizzes()` enhancement to restore all active sessions
    - Load session state, question state, and participant data from Redis and MongoDB
    - Integrate with existing `server/services/session/session.service.js`
    - _Requirements: 3.1, 3.2_
  
  - [x] 4.2 Add participant reconnection logic
    - Implement reconnection window (5 minutes)
    - Restore participant submission history on reconnect
    - Send current question and score to reconnected participants
    - _Requirements: 3.2, 3.4, 3.5_
  
  - [x] 4.3 Implement state persistence with retry logic
    - Add MongoDB transaction support for state transitions in quiz.service.js
    - Implement exponential backoff retry (up to 3 attempts) in session.service.js
    - Queue failed operations for later processing
    - _Requirements: 3.3, 12.1, 12.2, 12.6, 12.7_
  
  - [x] 4.4 Add automatic session cleanup
    - Implement background job to detect stale sessions (>24 hours in live state)
    - Automatically abort stale sessions
    - _Requirements: 3.6_
  
  - [x] 4.5 Write integration tests for session recovery
    - Test session restoration after restart
    - Test participant reconnection
    - Test state persistence retry logic
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Implement Real-time State Synchronization
  - [x] 5.1 Add sequence numbers to state updates
    - Modify WebSocket broadcast messages to include sequence numbers
    - Track last sent sequence per session
    - _Requirements: 13.3_
  
  - [x] 5.2 Create state reconciliation endpoint
    - Add REST endpoint `/api/quiz/session/:code/state` for full state retrieval
    - Return current question, scores, and session state
    - _Requirements: 13.4, 13.7_
  
  - [x] 5.3 Implement message compression and batching
    - Compress messages >1KB before transmission
    - Batch rapid state changes into single updates
    - _Requirements: 13.5, 13.6_
  
  - [x] 5.4 Update client reconnection handling
    - Modify `client/src/components/hostLive/LiveView.jsx` to detect missed updates
    - Request state reconciliation when sequence gap detected
    - _Requirements: 13.3, 13.4, 13.7_
  
  - [x] 5.5 Write integration tests for real-time sync
    - Test sequence number tracking
    - Test state reconciliation
    - Test message compression
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 6. Checkpoint - Verify session recovery and real-time sync
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Set up Payment Gateway Routing Infrastructure
  - [x] 7.1 Create payment gateway abstraction layer
    - Create `payment-service/services/gateways/` directory
    - Create `payment-service/services/gateways/GatewayInterface.js` base class
    - Define standard methods: `createOrder()`, `verifyPayment()`, `healthCheck()`
    - _Requirements: 4.1_
  
  - [x] 7.2 Implement Razorpay gateway adapter
    - Create `payment-service/services/gateways/RazorpayGateway.js`
    - Implement interface methods using existing Razorpay integration from `payment-service/controllers/paymentController.js`
    - _Requirements: 4.1_
  
  - [x] 7.3 Create gateway configuration system
    - Create `payment-service/config/gateways.js` to load gateway configs from env
    - Support priority ordering and enable/disable flags
    - Validate credentials on load
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [x] 7.4 Write unit tests for gateway abstraction
    - Test interface contract
    - Test configuration loading
    - Test credential validation
    - _Requirements: 4.1, 14.1_

- [x] 8. Implement Payment Router with Health Monitoring
  - [x] 8.1 Create payment router service
    - Create `payment-service/services/PaymentRouter.js`
    - Implement gateway selection based on priority and health status
    - Route payment requests to highest priority available gateway
    - _Requirements: 4.1, 4.2_
  
  - [x] 8.2 Implement gateway health monitoring
    - Add background health check job (every 30 seconds)
    - Mark gateways as available/unavailable based on health checks
    - _Requirements: 4.3, 4.4_
  
  - [x] 8.3 Add health status monitoring endpoint
    - Create endpoint `/payment/gateway-health` to expose gateway status
    - Return health status and performance metrics for each gateway
    - _Requirements: 4.7, 6.6_
  
  - [x] 8.4 Write unit tests for payment router
    - Test gateway selection logic
    - Test health monitoring
    - Test status endpoint
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Implement Payment Gateway Failover
  - [x] 9.1 Add failover logic to payment router
    - Implement automatic fallback to next gateway on failure
    - Support up to 3 gateway attempts per payment
    - Retry with next gateway within 5 seconds on timeout
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 9.2 Integrate failed job queue
    - Create `payment-service/models/FailedJob.js` model
    - Record failed gateway attempts with gateway name and failure reason
    - _Requirements: 5.4_
  
  - [x] 9.3 Add descriptive error handling
    - Return helpful error messages when all gateways fail
    - Include retry guidance in error response
    - _Requirements: 5.5_
  
  - [x] 9.4 Implement primary gateway restoration
    - Automatically restore routing to primary when health checks pass
    - _Requirements: 5.6_
  
  - [x] 9.5 Write integration tests for failover
    - Test automatic fallback
    - Test retry limits
    - Test primary restoration
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 10. Implement Payment Transaction Tracking
  - [x] 10.1 Extend payment models with gateway metadata
    - Locate or create payment model in `payment-service/models/`
    - Add fields: `gatewayUsed`, `attemptCount`, `fallbackReason`, `routingMetadata`
    - Store gateway information for each transaction
    - _Requirements: 6.1, 6.2_
  
  - [x] 10.2 Create transaction history endpoint
    - Add endpoint `/payment/transactions/:userId` with gateway information
    - Support filtering and pagination
    - _Requirements: 6.3_
  
  - [x] 10.3 Implement gateway performance metrics
    - Calculate success rates over rolling 24-hour windows
    - Track average response times per gateway
    - Flag transactions that used fallback gateways
    - _Requirements: 6.4, 6.5_
  
  - [x] 10.4 Update revenue controller with gateway analytics
    - Modify `payment-service/controllers/revenueController.js` to include gateway breakdown
    - Add gateway performance data to analytics
    - _Requirements: 6.3, 6.5, 6.6_
  
  - [ ] 10.5 Write integration tests for transaction tracking
    - Test metadata storage
    - Test transaction history endpoint
    - Test performance metrics calculation
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Checkpoint - Verify payment gateway routing and failover
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Set up RBAC System Foundation
  - [x] 12.1 Create permission and role models
    - Create `server/models/Permission.js` with permission definitions
    - Create `server/models/Role.js` with role-permission relationships
    - Support hierarchical roles (admin inherits all permissions)
    - Extend existing `server/models/User.js` to support multiple roles if needed
    - _Requirements: 7.1, 7.4_
  
  - [x] 12.2 Create RBAC service
    - Create `server/services/rbac/` directory
    - Create `server/services/rbac/rbac.service.js`
    - Implement `checkPermission(userId, permission, resourceId)` method
    - Implement permission caching using Redis (5 minute TTL)
    - Support multiple roles per user with OR logic
    - _Requirements: 7.2, 7.5, 7.6, 7.7_
  
  - [x] 12.3 Seed default roles and permissions
    - Create migration script in `server/scripts/` to seed: admin, host, participant roles
    - Define permissions: create_quiz, manage_users, join_quiz, process_payment, view_revenue, manage_payouts
    - _Requirements: 7.1_
  
  - [ ] 12.4 Write unit tests for RBAC service
    - Test permission checking
    - Test role hierarchy
    - Test multiple role evaluation
    - Test permission caching
    - _Requirements: 7.2, 7.4, 7.5, 7.6, 7.7_

- [x] 13. Implement RBAC Middleware and Enforcement
  - [x] 13.1 Create permission check middleware
    - Create `server/middleware/checkPermission.js`
    - Integrate with existing `server/middleware/auth.js` patterns (protect, authorize)
    - Return 403 Forbidden when permission denied
    - _Requirements: 7.2, 7.3_
  
  - [x] 13.2 Apply RBAC to quiz routes
    - Update `server/routes/` quiz routes to use new permission middleware
    - Protect quiz creation with `create_quiz` permission
    - Enhance existing `requireQuizOwnership` middleware with new RBAC checks
    - Implement resource-level access policies (public/private/shared)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 13.3 Apply RBAC to payment routes
    - Update `payment-service/routes/paymentRoutes.js` with new permission middleware
    - Protect payment creation with `process_payment` permission
    - Protect revenue endpoints with `view_revenue` permission
    - Protect payout operations with `manage_payouts` permission
    - Enhance existing `authorize` middleware usage with granular permissions
    - Restrict revenue data to owner or admin
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ] 13.4 Write integration tests for RBAC enforcement
    - Test permission denial (403 responses)
    - Test resource ownership checks
    - Test access policy enforcement
    - _Requirements: 7.3, 8.2, 11.4_

- [x] 14. Implement Resource-Level Access Control
  - [x] 14.1 Extend quiz model with access control fields
    - Update `server/models/Quiz.js` to add: `accessPolicy` (public/private/shared), `sharedWith` (array of user IDs)
    - Note: `accessType` field already exists, evaluate if it should be renamed or extended
    - _Requirements: 8.3, 8.4, 8.5_
  
  - [x] 14.2 Create access grant management endpoints
    - Add endpoints in `server/routes/` to grant quiz access to specific users
    - Add endpoint to revoke quiz access
    - Automatically revoke access when quiz is deleted
    - _Requirements: 8.6, 8.7_
  
  - [x] 14.3 Integrate access control with quiz service
    - Check access policy before allowing quiz operations
    - Enforce private quiz restrictions
    - Allow public quiz viewing for authenticated users
    - _Requirements: 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 14.4 Write integration tests for resource access control
    - Test public quiz access
    - Test private quiz restrictions
    - Test shared quiz access
    - Test access grant/revoke
    - _Requirements: 8.3, 8.4, 8.5, 8.6_

- [-] 15. Implement Session Access Control Integration
  - [x] 15.1 Add session access control checks
    - Verify `join_quiz` permission when participant joins session
    - Check quiz access policy before allowing session join
    - Inherit access policies from parent quiz
    - _Requirements: 10.1, 10.2, 10.4_
  
  - [x] 15.2 Add session-specific access overrides
    - Allow hosts to set session-specific access policies
    - Support overriding quiz access for specific sessions
    - _Requirements: 10.3, 10.5_
  
  - [x] 15.3 Implement real-time permission revocation
    - Disconnect users from active sessions when permissions revoked
    - Complete disconnection within 30 seconds
    - _Requirements: 10.6_
  
  - [ ] 15.4 Write integration tests for session access control
    - Test join permission checks
    - Test access policy inheritance
    - Test session-specific overrides
    - Test real-time revocation
    - _Requirements: 10.1, 10.2, 10.3, 10.6_

- [ ] 16. Implement Permission Audit Logging
  - [x] 16.1 Create audit log model and service
    - Create `server/models/AuditLog.js` with fields: userId, resourceType, resourceId, action, result, timestamp, correlationId
    - Create `server/services/rbac/auditLog.service.js`
    - Integrate with existing `server/middleware/requestContext.js` for correlation IDs
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 16.2 Integrate audit logging with RBAC service
    - Log all permission check failures
    - Log successful access to sensitive operations (delete, transfer ownership)
    - Include correlation IDs from request context
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 16.3 Create audit log query endpoint
    - Add protected admin endpoint `/api/rbac/audit-logs` in `server/routes/`
    - Support filtering by user, resource type, and time range
    - Implement pagination
    - _Requirements: 9.4, 9.7_
  
  - [x] 16.4 Implement audit log retention policy
    - Add background job in `server/jobs/` or use existing job infrastructure
    - Archive logs older than 90 days
    - _Requirements: 9.5_
  
  - [x] 16.5 Add suspicious activity detection
    - Flag repeated permission failures from same user
    - Flag access to sensitive resources
    - _Requirements: 9.6_
  
  - [ ] 16.6 Write integration tests for audit logging
    - Test failure logging
    - Test sensitive operation logging
    - Test audit log queries
    - Test retention policy
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

- [ ] 17. Implement Role Management API
  - [x] 17.1 Create role management endpoints
    - Create `server/routes/rbacRoutes.js` or add to existing routes
    - Add endpoints: POST `/api/rbac/roles`, PUT `/api/rbac/roles/:id`, DELETE `/api/rbac/roles/:id`
    - Add endpoints: POST `/api/rbac/users/:id/roles`, DELETE `/api/rbac/users/:id/roles/:roleId`
    - Use existing `protect` and `authorize` middleware to require admin role
    - _Requirements: 15.1, 15.2, 15.7_
  
  - [x] 17.2 Add role validation and safety checks
    - Validate at least one admin user exists before role changes
    - Reassign users to default role when their role is deleted
    - _Requirements: 15.3, 15.4_
  
  - [x] 17.3 Create permission discovery endpoints
    - Add endpoint GET `/api/rbac/permissions` to list all available permissions
    - Add endpoint GET `/api/rbac/users/:id/effective-permissions` to query user's permissions
    - _Requirements: 15.5, 15.6_
  
  - [ ] 17.4 Write integration tests for role management API
    - Test role CRUD operations
    - Test user role assignment
    - Test admin validation
    - Test permission queries
    - _Requirements: 15.1, 15.2, 15.3, 15.5, 15.6_

- [ ] 18. Integrate Payment Gateway Configuration with RBAC
  - [x] 18.1 Protect gateway configuration endpoints
    - Add endpoint POST `/payment/admin/gateways/config` in `payment-service/routes/paymentRoutes.js`
    - Use existing `protect` and `authorize` middleware to require admin role
    - Log all gateway configuration changes in audit log
    - _Requirements: 11.6, 14.5, 14.6_
  
  - [x] 18.2 Implement configuration reload without restart
    - Support enabling/disabling gateways dynamically
    - Reload configuration when file changes detected
    - _Requirements: 14.2, 14.7_
  
  - [ ] 18.3 Write integration tests for gateway configuration
    - Test dynamic configuration updates
    - Test RBAC protection
    - Test configuration reload
    - _Requirements: 14.2, 14.5, 14.6_

- [ ] 19. Final Integration and Wiring
  - [x] 19.1 Update server bootstrap to initialize all systems
    - Update `server/server.js` to initialize RBAC system and load roles/permissions
    - Update `payment-service/server.js` to initialize payment router with gateway configurations
    - Initialize session recovery on startup in server bootstrap
    - _Requirements: All_
  
  - [x] 19.2 Update client components for new features
    - Update `client/src/components/hostLive/LiveView.jsx` with pause/resume controls
    - Update `client/src/components/hostLive/LiveLobby.jsx` if needed for session management
    - Add tutor mode controls for manual question advancement
    - Update reconnection logic to use state reconciliation
    - _Requirements: 2.2, 2.4, 13.4_
  
  - [x] 19.3 Add comprehensive error handling
    - Ensure all services return consistent error formats
    - Add user-friendly error messages for common failures
    - _Requirements: All_
  
  - [ ] 19.4 Write end-to-end integration tests
    - Test complete quiz session flow with state machine
    - Test payment flow with gateway failover
    - Test RBAC enforcement across all protected endpoints
    - _Requirements: All_

- [x] 20. Final Checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation is structured in three parallel tracks (Quiz Engine, Payment Routing, RBAC) that converge in the final integration phase
- Checkpoints ensure incremental validation at major milestones
- All code should follow existing project patterns (Express middleware, Mongoose models, Socket.io events)
- Use existing infrastructure: Redis for caching (via `server/config/redis.js`), MongoDB for persistence, Winston for logging (via `server/utils/logger.js`)
- Maintain backward compatibility with existing quiz and payment functionality
- Existing middleware patterns: `protect` (lightweight JWT), `protectFull` (full user fetch), `authorize(...roles)` (role check)
- Existing models: User, Quiz, QuizSession, Submission, Subscription, HostProfile, Analytics
- Socket.io handlers are in `server/sockets/` directory
- Payment service runs separately on port 5001 with its own Express app

- [ ] 21. Comprehensive Testing - Quiz Engine
  - [x] 21.1 Test state machine transitions (valid + invalid)
    - Test all valid state transitions: draft → scheduled → waiting → live → completed
    - Test invalid transition rejection with proper error codes
    - Test abort transitions from all states except completed
    - Test state persistence before transition acknowledgment
    - Use Jest with mocked MongoDB and Redis
    - _Requirements: 1.1, 1.2, 1.3, 1.6_
  
  - [x] 21.2 Test quiz modes (auto vs tutor)
    - Test auto mode: automatic question advancement when time expires
    - Test tutor mode: manual advancement controls, no auto-advance
    - Test host next-question trigger in tutor mode (<500ms response)
    - Test mode-specific behavior enforcement
    - Mock timers using jest.useFakeTimers()
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 21.3 Test pause/resume functionality
    - Test pause: preserve question state and remaining time
    - Test resume: restore state and adjust timing correctly
    - Test pause/resume in both auto and tutor modes
    - Test pause/resume with participant submissions
    - Test edge cases: pause during question transition, multiple pause/resume cycles
    - _Requirements: 1.7, 1.8, 2.7_
  
  - [x] 21.4 Test session recovery after restart
    - Test restoration of all active sessions from database
    - Test participant reconnection within 5-minute window
    - Test preservation of submission history during disconnect
    - Test restoration of current question and score on reconnect
    - Test automatic abort of sessions >24 hours in live state
    - Mock server restart scenarios using beforeEach/afterEach
    - Test edge cases: partial data in Redis, corrupted session state
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_
  
  - [x] 21.5 Test real-time sync (sequence numbers, reconciliation)
    - Test sequence number inclusion in state updates
    - Test client detection of missed updates (sequence gaps)
    - Test state reconciliation endpoint functionality
    - Test message compression for updates >1KB
    - Test message batching for rapid state changes
    - Test full state delivery on client reconnection (<2 seconds)
    - Test broadcast timing (<1 second for state changes)
    - Mock WebSocket connections using socket.io-client
    - Test concurrent updates from multiple participants
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [ ] 22. Comprehensive Testing - Payment System
  - [x] 22.1 Test gateway abstraction interface
    - Test GatewayInterface base class contract
    - Test standard methods: createOrder(), verifyPayment(), healthCheck()
    - Test interface implementation by concrete gateways (Razorpay)
    - Test gateway method error handling
    - Test invalid gateway configuration rejection
    - _Requirements: 4.1_
  
  - [x] 22.2 Test payment router selection logic
    - Test routing to highest priority available gateway
    - Test gateway selection based on health status
    - Test routing decision logging with reasoning
    - Test gateway priority ordering
    - Test selection when multiple gateways have same priority
    - Mock gateway health status
    - _Requirements: 4.1, 4.2, 4.6_
  
  - [x] 22.3 Test failover across multiple gateways
    - Test automatic fallback to next gateway on primary failure
    - Test maximum 3 gateway attempts per payment
    - Test retry with next gateway within 5 seconds on timeout
    - Test primary gateway restoration when health checks pass
    - Test descriptive error when all gateways fail
    - Test failed job queue recording
    - Mock gateway failures (timeout, network error, API error)
    - Test edge cases: all gateways down, single gateway available
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 22.4 Test transaction metadata tracking
    - Test recording of gateway used for each transaction
    - Test storage of routing metadata (attempt count, fallback reason)
    - Test transaction history API with gateway information
    - Test flagging of transactions using fallback gateways
    - Test filtering and pagination of transaction history
    - Use Supertest for API endpoint testing
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 22.5 Test gateway health monitoring
    - Test health check execution every 30 seconds
    - Test marking gateways as available/unavailable
    - Test gateway health status endpoint
    - Test success rate calculation over 24-hour windows
    - Test performance metrics tracking (response times)
    - Mock gateway health check responses (success, failure, timeout)
    - Test edge cases: gateway becomes healthy after being down
    - Use jest.useFakeTimers() for interval testing
    - _Requirements: 4.3, 4.4, 4.7, 6.5, 6.6_

- [ ] 23. Comprehensive Testing - RBAC System
  - [x] 23.1 Test permission checks
    - Test checkPermission() method with valid permissions
    - Test permission denial with 403 Forbidden response
    - Test permission checks for all protected operations
    - Test permission evaluation with missing permissions
    - Test permission caching (5-minute TTL)
    - Mock Redis for cache testing
    - _Requirements: 7.2, 7.3, 7.7_
  
  - [x] 23.2 Test role hierarchy and multiple roles
    - Test admin role inheriting all permissions
    - Test multiple roles assigned to single user
    - Test OR logic evaluation for multiple roles
    - Test permission resolution with role hierarchy
    - Test edge cases: user with no roles, conflicting roles
    - _Requirements: 7.4, 7.5, 7.6_
  
  - [x] 23.3 Test middleware enforcement (403 cases)
    - Test checkPermission middleware on protected routes
    - Test 403 responses for unauthorized access attempts
    - Test middleware integration with auth middleware
    - Test error message format for permission denials
    - Use Supertest for route testing
    - Test various permission scenarios across different endpoints
    - _Requirements: 7.3, 13.4_
  
  - [x] 23.4 Test resource-level access (public/private/shared)
    - Test public resource access by any authenticated user
    - Test private resource restriction to owner only
    - Test shared resource access by explicitly granted users
    - Test resource ownership verification
    - Test access grant and revocation
    - Test automatic access revocation on resource deletion
    - Test edge cases: access to non-existent resource, invalid user IDs
    - Use Supertest for integration testing
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [x] 23.5 Test session access control
    - Test join_quiz permission verification on session join
    - Test private quiz session access restrictions
    - Test access policy inheritance from parent quiz
    - Test session-specific access overrides
    - Test real-time disconnection on permission revocation (<30 seconds)
    - Mock WebSocket connections for real-time testing
    - Test concurrent session joins with different permissions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 24. Comprehensive Testing - Audit Logging
  - [x] 24.1 Test logging of permission failures
    - Test audit log creation on permission check failure
    - Test log includes: userId, resourceType, resourceId, action, result
    - Test correlation ID inclusion in audit logs
    - Test repeated failure detection
    - Verify log format and data integrity
    - _Requirements: 9.1, 9.3_
  
  - [x] 24.2 Test logging of sensitive operations
    - Test audit log creation for delete operations
    - Test audit log creation for ownership transfer
    - Test audit log creation for role changes
    - Test sensitive operation flagging
    - Test audit logs for payment configuration changes
    - _Requirements: 9.2, 9.6_
  
  - [x] 24.3 Test audit log query endpoint
    - Test filtering by user, resource type, and time range
    - Test pagination of audit log results
    - Test admin-only access to audit endpoint (403 for non-admins)
    - Test query performance with large datasets
    - Test edge cases: invalid filters, empty results
    - Use Supertest for API testing
    - _Requirements: 9.4, 9.7_
  
  - [x] 24.4 Test retention policy
    - Test archival of logs older than 90 days
    - Test retention job execution
    - Test log accessibility within retention period
    - Mock date/time for retention testing
    - _Requirements: 9.5_
  
  - [x] 24.5 Test suspicious activity detection
    - Test flagging of repeated permission failures (>5 in 10 minutes)
    - Test flagging of unusual access patterns
    - Test suspicious activity alerts
    - Test edge cases: legitimate repeated access, false positives
    - _Requirements: 9.6_

- [ ] 25. Comprehensive Testing - Role Management API
  - [x] 25.1 Test role CRUD operations
    - Test role creation with permission sets
    - Test role update (add/remove permissions)
    - Test role deletion with user reassignment
    - Test admin-only access to role management (403 for non-admins)
    - Test edge cases: duplicate role names, invalid permissions
    - Use Supertest for API testing
    - _Requirements: 15.1, 15.7_
  
  - [x] 25.2 Test user role assignment
    - Test assigning roles to users
    - Test revoking roles from users
    - Test multiple role assignment
    - Test role assignment validation
    - Test edge cases: assigning non-existent role, invalid user ID
    - _Requirements: 15.2_
  
  - [x] 25.3 Test permission discovery endpoints
    - Test listing all available permissions
    - Test querying user's effective permissions
    - Test permission resolution with multiple roles
    - Test edge cases: user with no roles, admin user
    - Use Supertest for API testing
    - _Requirements: 15.5, 15.6_
  
  - [x] 25.4 Test safety validations (admin presence)
    - Test validation that at least one admin exists
    - Test prevention of last admin role removal
    - Test default role assignment on role deletion
    - Test edge cases: attempting to delete admin role, removing admin from last admin user
    - _Requirements: 15.3, 15.4_

- [ ] 26. Comprehensive Testing - Payment + RBAC Integration
  - [x] 26.1 Test RBAC protection on payment config endpoints
    - Test admin-only access to gateway configuration
    - Test process_payment permission for payment creation
    - Test view_revenue permission for financial reports
    - Test manage_payouts permission for payout operations
    - Test owner/admin restriction for revenue data access
    - Test 403 responses for unauthorized access
    - Use Supertest for integration testing
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [x] 26.2 Test dynamic gateway configuration reload
    - Test enabling/disabling gateways without restart
    - Test configuration reload on file changes
    - Test configuration validation
    - Test audit logging of configuration changes
    - Test edge cases: invalid configuration, missing credentials
    - Mock file system watchers
    - _Requirements: 14.2, 14.5, 14.6, 14.7_

- [ ] 27. End-to-End Integration Tests
  - [x] 27.1 Test full quiz lifecycle
    - Test: create quiz → schedule → start session → participants join → play questions → view leaderboard → complete
    - Test state transitions throughout lifecycle
    - Test participant interactions at each stage (submissions, scoring)
    - Test data persistence across lifecycle
    - Test error recovery during lifecycle (disconnect/reconnect)
    - Test both auto and tutor modes end-to-end
    - Test pause/resume during live session
    - Use Supertest + socket.io-client for full integration
    - _Requirements: 1.1, 1.4, 1.5, 2.5, 2.6_
  
  - [x] 27.2 Test payment flow with gateway failover
    - Test: initiate payment → primary gateway fails → automatic failover → payment success
    - Test transaction metadata recording throughout flow
    - Test failed attempt logging
    - Test gateway health status updates
    - Test end-to-end payment with multiple gateway attempts
    - Test user experience with gateway failures (error messages)
    - Mock external payment gateway APIs
    - Use Supertest for API testing
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_
  
  - [x] 27.3 Test RBAC enforcement across system
    - Test permission checks on all protected endpoints
    - Test resource access control across quiz operations
    - Test session access control with various policies
    - Test payment permission enforcement
    - Test audit logging throughout system
    - Test role management operations
    - Test cross-service RBAC (server + payment-service)
    - Use Supertest for comprehensive endpoint testing
    - Test with multiple user roles (admin, host, participant)
    - _Requirements: 7.2, 7.3, 8.2, 10.1, 11.1, 15.1_

- [x] 28. Final Testing Checkpoint
  - Run complete test suite with Jest + Supertest
  - Verify high coverage for critical flows (>80%)
  - Ensure all success, failure, and edge cases covered
  - Verify proper mocking of Redis, DB, and external services
  - Review test maintainability and structure
  - Generate coverage report: `npm test -- --coverage`
  - Fix any failing tests
  - Ensure all tests pass, ask the user if questions arise.

## Testing Notes

- Use Jest as the test framework with Supertest for HTTP endpoint testing
- Mock Redis using jest.mock() or redis-mock library
- Mock MongoDB using mongodb-memory-server or jest mocks
- Mock external payment gateway APIs (Razorpay, Stripe)
- Structure tests by module: separate test files for each service/controller
- Cover success paths, failure paths, and edge cases for all critical flows
- Use beforeEach/afterEach for test isolation and cleanup
- Aim for >80% code coverage on critical business logic
- Use descriptive test names following pattern: "should [expected behavior] when [condition]"
- Group related tests using describe() blocks
- Use test fixtures for common test data
- Mock WebSocket connections for real-time testing using socket.io-client
- Use supertest for integration testing of REST endpoints
- Test concurrent operations where applicable (e.g., multiple participants joining simultaneously)
- Use jest.useFakeTimers() for testing time-dependent functionality
- Ensure tests are isolated and can run in any order
- Mock external dependencies to avoid network calls during tests
- Use test databases or in-memory databases for integration tests
- Clean up test data after each test to prevent interference
