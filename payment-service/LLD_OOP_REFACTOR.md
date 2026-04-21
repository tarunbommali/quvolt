# 🏛️ Quvolt Low-Level Design (LLD) - OOP Refactor

## 🏗️ Architecture Overview

The Quvolt backend has been refactored from a functional/mixed architecture into a clean **OOP-based LLD architecture**. This design follows **SOLID** principles and utilizes several **Design Patterns** to ensure scalability, testability, and maintainability.

### 📂 Directory Structure

```txt
modules/
  core/           # Base classes, Logger, EventBus (Observer)
  payment/        # PaymentService, Gateway Adapters, Factory
  subscription/   # SubscriptionService, Plan Management
  kyc/            # KycService, Host Onboarding
  realtime/       # SocketManager, EventDispatcher
  quiz/           # SessionManager (State), QuestionEngine, Builder
```

---

## 🧩 Design Patterns Applied

### 1. Factory Pattern (Creational)
- **Used in**: `PaymentGatewayFactory.js`, `ScoringFactory.js`
- **Purpose**: Decouples the creation of specific instances (gateways, scoring algorithms) from the service logic.
- **Example**: `ScoringFactory.getStrategy(config)` returns different scoring behaviors based on template settings.

### 2. Builder Pattern (Creational)
- **Used in**: `QuizBuilder.js`
- **Purpose**: Provides a fluent interface for constructing complex `QuizTemplate` configurations.
- **Example**: `new QuizBuilder(hostId).setName('SaaS Quiz').setTimer(20).build()`

### 3. Singleton Pattern (Creational)
- **Used in**: `PaymentRouter.js`, `SocketManager.js`, `EventBus.js`
- **Purpose**: Ensures single points of truth for routing, real-time communication, and system-wide event dispatching.

### 4. Adapter Pattern (Structural)
- **Used in**: `RazorpayGateway.js`, `MockGateway.js`
- **Purpose**: Wraps third-party SDKs into a consistent `GatewayInterface`, allowing the system to depend on abstractions (DIP).

### 5. Strategy Pattern (Behavioral)
- **Used in**: `ScoringStrategy.js` (Standard, Competitive, Binary)
- **Purpose**: Encapsulates scoring algorithms so they can be switched at runtime based on the quiz type.

### 6. Observer Pattern (Behavioral)
- **Used in**: `EventBus.js` and `SocketManager.js`
- **Purpose**: Decouples domain logic from real-time delivery. Services emit events to the `EventBus`, which `SocketManager` listens to and bridges to clients.

### 7. State Pattern (Behavioral)
- **Used in**: `SessionManager.js` and `SessionStates.js`
- **Purpose**: Manages complex quiz session lifecycles (Waiting -> Live -> Paused -> Completed) by delegating behavior to state-specific classes.

---

## 🛠️ SOLID Principles Implementation

- **S (Single Responsibility)**: Logic is partitioned into specialized services and modules.
- **O (Open/Closed)**: New states, scoring strategies, or gateways can be added without modifying existing code.
- **L (Liskov Substitution)**: All `ScoringStrategy` or `GatewayInterface` implementations are fully interchangeable.
- **I (Interface Segregation)**: Interfaces/Base classes provide specific contracts (e.g., `GatewayInterface`).
- **D (Dependency Inversion)**: High-level modules (Services) depend on abstractions (EventBus, Strategies) rather than low-level implementations (Socket.io, specific scoring math).

---

## 🔄 Dependency Injection

We use a central **Service Registry** (`modules/index.js`) to manage dependencies:

```javascript
const subscriptionService = new SubscriptionService({ paymentRouter, idempotencyUtil });
const paymentService = new PaymentService({ paymentRouter, subscriptionService, idempotencyUtil });
```

---

## 📅 Migration Roadmap

1. ✅ **Core Infrastructure**: Implementation of `BaseService`, `EventBus`, `Logger`.
2. ✅ **Payment Module**: Refactored to `PaymentService` class.
3. ✅ **Subscription Module**: Refactored to `SubscriptionService` class.
4. ✅ **KYC Module**: Refactored to `KycService` class.
5. ✅ **Realtime Module**: Refactored to `SocketManager` (Observer bridge).
6. ✅ **Quiz Module**: Refactored to `SessionManager` (**State Pattern**) and `QuestionEngine` (**Strategy Pattern**).
7. ⏳ **Integration**: Full deprecation of legacy functional services in `quiz.socket.js`.
