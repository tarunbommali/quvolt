# Requirements Document

## Introduction

This document specifies requirements for three major enhancements to the SaaS quiz application: a robust quiz engine workflow with enhanced state management, payment gateway routing for multi-provider support, and comprehensive role-based access control (RBAC) for fine-grained permissions.

## Glossary

- **Quiz_Engine**: The core system component responsible for managing quiz sessions, question flow, and state transitions
- **Session**: A live quiz instance with participants, identified by a unique session code
- **State_Machine**: The component that enforces valid state transitions for quiz sessions
- **Payment_Router**: The system component that routes payment requests to appropriate payment gateways
- **Payment_Gateway**: An external payment provider (e.g., Razorpay, Stripe) that processes transactions
- **RBAC_System**: The role-based access control system that manages user permissions
- **Permission**: A specific action that can be performed (e.g., create_quiz, manage_users)
- **Role**: A collection of permissions assigned to users (e.g., admin, host, participant)
- **Resource**: An entity that requires access control (e.g., quiz, session, payment)
- **Host**: A user who creates and manages quizzes
- **Participant**: A user who joins and takes quizzes
- **Admin**: A user with system-wide management capabilities
- **Session_Mode**: The operational mode of a quiz session (auto or tutor)
- **Question_State**: The current state of a question during a live session (waiting, live, review, paused)
- **Workflow_Transition**: A valid state change in the quiz engine state machine
- **Gateway_Health**: The operational status of a payment gateway (active, degraded, unavailable)
- **Fallback_Gateway**: A secondary payment gateway used when the primary is unavailable
- **Access_Policy**: A rule that determines whether a user can perform an action on a resource

## Requirements

### Requirement 1: Quiz Session State Management

**User Story:** As a host, I want the quiz engine to enforce valid state transitions, so that sessions maintain data integrity and prevent invalid operations.

#### Acceptance Criteria

1. THE State_Machine SHALL enforce transitions only between valid session states (draft → scheduled → waiting → live → completed)
2. WHEN an invalid state transition is attempted, THE State_Machine SHALL reject the transition and return an error code
3. THE State_Machine SHALL allow abort transitions from any state except completed
4. WHEN a session is in waiting state, THE Quiz_Engine SHALL allow participants to join
5. WHEN a session transitions to live state, THE Quiz_Engine SHALL prevent new participants from joining
6. THE State_Machine SHALL persist the current state to the database before acknowledging any transition
7. WHEN a session is paused, THE Quiz_Engine SHALL preserve the current question state and remaining time
8. WHEN a paused session is resumed, THE Quiz_Engine SHALL restore the question state and adjust timing accordingly

### Requirement 2: Quiz Mode Workflow Control

**User Story:** As a host, I want to control quiz progression in tutor mode, so that I can manually advance questions at my own pace.

#### Acceptance Criteria

1. WHERE session mode is tutor, THE Quiz_Engine SHALL disable automatic question advancement
2. WHERE session mode is tutor, THE Quiz_Engine SHALL expose manual next-question controls to the host
3. WHERE session mode is auto, THE Quiz_Engine SHALL automatically advance questions when time expires
4. WHEN a host triggers next-question in tutor mode, THE Quiz_Engine SHALL transition to the next question within 500ms
5. THE Quiz_Engine SHALL broadcast question state changes to all connected participants within 1 second
6. WHEN the final question is completed, THE Quiz_Engine SHALL transition the session to completed state
7. WHERE session mode is tutor, THE Quiz_Engine SHALL allow the host to pause and resume at any time

### Requirement 3: Session Recovery and Resilience

**User Story:** As a host, I want sessions to recover from server restarts, so that technical issues don't disrupt live quizzes.

#### Acceptance Criteria

1. WHEN the Quiz_Engine restarts, THE Quiz_Engine SHALL restore all active sessions from the database
2. WHEN a session is restored, THE Quiz_Engine SHALL reconnect participants who rejoin within 5 minutes
3. THE Quiz_Engine SHALL persist question state updates to the database within 2 seconds of any change
4. WHEN a participant disconnects, THE Quiz_Engine SHALL preserve their submission history
5. WHEN a participant reconnects, THE Quiz_Engine SHALL restore their current question and score
6. IF a session has been in live state for more than 24 hours, THEN THE Quiz_Engine SHALL automatically abort the session

### Requirement 4: Payment Gateway Routing

**User Story:** As a system administrator, I want to route payments through multiple gateways, so that the system remains operational if one provider fails.

#### Acceptance Criteria

1. THE Payment_Router SHALL maintain a list of configured payment gateways with priority ordering
2. WHEN a payment request is received, THE Payment_Router SHALL route it to the highest priority available gateway
3. THE Payment_Router SHALL monitor gateway health status every 30 seconds
4. WHEN a gateway fails health checks, THE Payment_Router SHALL mark it as unavailable and route to the next gateway
5. WHEN a payment request fails, THE Payment_Router SHALL retry with the next available gateway
6. THE Payment_Router SHALL log all routing decisions with gateway selection reasoning
7. THE Payment_Router SHALL expose gateway health status via a monitoring endpoint

### Requirement 5: Payment Gateway Failover

**User Story:** As a user, I want payments to succeed even when a gateway is down, so that I can complete transactions reliably.

#### Acceptance Criteria

1. WHEN the primary gateway is unavailable, THE Payment_Router SHALL automatically route to the Fallback_Gateway
2. THE Payment_Router SHALL attempt payment with a maximum of 3 gateways before returning failure
3. WHEN a gateway returns a timeout error, THE Payment_Router SHALL retry with the next gateway within 5 seconds
4. THE Payment_Router SHALL record failed gateway attempts in a failed jobs queue for analysis
5. WHEN all gateways are unavailable, THE Payment_Router SHALL return a descriptive error with retry guidance
6. THE Payment_Router SHALL restore routing to the primary gateway when health checks pass

### Requirement 6: Payment Transaction Tracking

**User Story:** As a host, I want to track which gateway processed each payment, so that I can reconcile transactions and analyze gateway performance.

#### Acceptance Criteria

1. THE Payment_Router SHALL record the gateway used for each successful transaction
2. THE Payment_Router SHALL store gateway routing metadata including attempt count and fallback reason
3. THE Payment_Router SHALL expose transaction history with gateway information via API
4. WHEN a payment uses a fallback gateway, THE Payment_Router SHALL flag the transaction for review
5. THE Payment_Router SHALL calculate gateway success rates over rolling 24-hour windows
6. THE Payment_Router SHALL expose gateway performance metrics via the monitoring endpoint

### Requirement 7: Role-Based Permission System

**User Story:** As a system administrator, I want to define granular permissions for different roles, so that users have appropriate access levels.

#### Acceptance Criteria

1. THE RBAC_System SHALL support defining custom roles with specific permission sets
2. THE RBAC_System SHALL enforce permission checks before allowing any protected operation
3. WHEN a user attempts an action without required permission, THE RBAC_System SHALL return a 403 Forbidden error
4. THE RBAC_System SHALL support hierarchical roles where admin inherits all permissions
5. THE RBAC_System SHALL allow assigning multiple roles to a single user
6. THE RBAC_System SHALL evaluate permissions using OR logic when a user has multiple roles
7. THE RBAC_System SHALL cache permission lookups for 5 minutes to optimize performance

### Requirement 8: Resource-Level Access Control

**User Story:** As a host, I want to control who can access my quizzes, so that I can protect my content and manage visibility.

#### Acceptance Criteria

1. THE RBAC_System SHALL enforce resource ownership checks for quiz operations
2. WHEN a user attempts to modify a quiz, THE RBAC_System SHALL verify the user is the owner or has admin role
3. THE RBAC_System SHALL support resource-level access policies (public, private, shared)
4. WHERE a quiz is marked private, THE RBAC_System SHALL restrict access to the owner and explicitly granted users
5. WHERE a quiz is marked public, THE RBAC_System SHALL allow any authenticated user to view it
6. THE RBAC_System SHALL allow hosts to grant specific permissions to other users for their quizzes
7. WHEN a quiz is deleted, THE RBAC_System SHALL revoke all associated access grants

### Requirement 9: Permission Audit Logging

**User Story:** As a system administrator, I want to audit permission checks and access attempts, so that I can investigate security incidents.

#### Acceptance Criteria

1. THE RBAC_System SHALL log all permission check failures with user, resource, and attempted action
2. THE RBAC_System SHALL log successful access to sensitive operations (delete, transfer ownership)
3. THE RBAC_System SHALL include correlation IDs in audit logs for request tracing
4. THE RBAC_System SHALL expose audit logs via a protected admin API endpoint
5. THE RBAC_System SHALL retain audit logs for a minimum of 90 days
6. WHEN suspicious access patterns are detected, THE RBAC_System SHALL flag them for review
7. THE RBAC_System SHALL support filtering audit logs by user, resource type, and time range

### Requirement 10: Session Access Control Integration

**User Story:** As a host, I want session access to respect quiz permissions, so that only authorized users can join my sessions.

#### Acceptance Criteria

1. WHEN a participant attempts to join a session, THE RBAC_System SHALL verify they have join_quiz permission
2. WHERE a quiz is private, THE RBAC_System SHALL restrict session access to explicitly authorized users
3. THE RBAC_System SHALL allow hosts to manage session access independently of quiz access
4. WHEN a session is created, THE RBAC_System SHALL inherit access policies from the parent quiz
5. THE RBAC_System SHALL allow hosts to override session access policies for specific sessions
6. WHEN a user's permissions are revoked, THE RBAC_System SHALL disconnect them from active sessions within 30 seconds

### Requirement 11: Payment Permission Controls

**User Story:** As a system administrator, I want to control who can process payments and view financial data, so that sensitive operations are protected.

#### Acceptance Criteria

1. THE RBAC_System SHALL require process_payment permission for creating payment orders
2. THE RBAC_System SHALL require view_revenue permission for accessing financial reports
3. THE RBAC_System SHALL restrict payout operations to users with manage_payouts permission
4. WHEN a user attempts to view another user's revenue data, THE RBAC_System SHALL verify admin or owner permissions
5. THE RBAC_System SHALL allow hosts to view only their own payment and revenue data
6. THE RBAC_System SHALL require admin role for configuring payment gateway settings
7. THE RBAC_System SHALL log all payment-related permission checks for compliance auditing

### Requirement 12: Quiz Engine State Persistence

**User Story:** As a developer, I want all quiz state changes persisted atomically, so that data remains consistent during failures.

#### Acceptance Criteria

1. THE Quiz_Engine SHALL use database transactions for state transitions that modify multiple records
2. WHEN a state transition fails, THE Quiz_Engine SHALL roll back all related changes
3. THE Quiz_Engine SHALL validate state consistency before committing any transaction
4. THE Quiz_Engine SHALL persist participant submissions within 1 second of receipt
5. THE Quiz_Engine SHALL maintain an event log of all state transitions for debugging
6. WHEN database writes fail, THE Quiz_Engine SHALL retry up to 3 times with exponential backoff
7. IF persistence fails after retries, THEN THE Quiz_Engine SHALL queue the operation for later processing

### Requirement 13: Real-time State Synchronization

**User Story:** As a participant, I want to see quiz state updates in real-time, so that I stay synchronized with the host and other participants.

#### Acceptance Criteria

1. THE Quiz_Engine SHALL broadcast state changes to all connected clients via WebSocket within 1 second
2. WHEN a question transitions to live, THE Quiz_Engine SHALL send the question data to all participants simultaneously
3. THE Quiz_Engine SHALL include sequence numbers in state updates to detect missed messages
4. WHEN a client detects a missed update, THE Quiz_Engine SHALL provide a state reconciliation endpoint
5. THE Quiz_Engine SHALL compress state updates larger than 1KB before transmission
6. THE Quiz_Engine SHALL batch multiple rapid state changes into single updates when possible
7. WHEN a client reconnects, THE Quiz_Engine SHALL send the current complete state within 2 seconds

### Requirement 14: Payment Gateway Configuration

**User Story:** As a system administrator, I want to configure payment gateways dynamically, so that I can add or remove providers without code changes.

#### Acceptance Criteria

1. THE Payment_Router SHALL load gateway configurations from environment variables or configuration files
2. THE Payment_Router SHALL support enabling or disabling gateways without service restart
3. THE Payment_Router SHALL validate gateway credentials on configuration load
4. WHEN gateway configuration is invalid, THE Payment_Router SHALL log errors and skip that gateway
5. THE Payment_Router SHALL expose a configuration endpoint for viewing active gateway settings (credentials redacted)
6. THE Payment_Router SHALL support configuring gateway-specific parameters (timeout, retry count)
7. THE Payment_Router SHALL reload configuration when a configuration file changes

### Requirement 15: Role Management API

**User Story:** As a system administrator, I want to manage roles and permissions via API, so that I can automate access control administration.

#### Acceptance Criteria

1. THE RBAC_System SHALL expose endpoints for creating, updating, and deleting roles
2. THE RBAC_System SHALL expose endpoints for assigning and revoking user roles
3. THE RBAC_System SHALL validate that role operations maintain at least one admin user
4. WHEN a role is deleted, THE RBAC_System SHALL reassign affected users to a default role
5. THE RBAC_System SHALL expose an endpoint for listing all permissions available in the system
6. THE RBAC_System SHALL expose an endpoint for querying a user's effective permissions
7. THE RBAC_System SHALL require admin role for all role management operations
