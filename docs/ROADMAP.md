# Quvolt Roadmap

Updated: 2026-04-21

## ✅ Recently Completed
- **Architecture Refactor**: Successfully migrated core quiz lifecycle to an **OOP State and Observer Pattern**.
- **Stability Hardening**: Resolved initialization race conditions and "Internal Server Error" on session launch.
- **Persistence Layer**: Implemented transactional state updates and sharded Redis keys for scalability.
- **Design System**: Completed design system application across all non-core pages (Legal, Billing, Analytics).

## 🚀 Near-Term Priorities

1. **Reliability and Release Quality**
- Add API-level rate-limit regression tests for lifecycle endpoints.
- Add staging smoke tests for websocket reconnect and live continuity.
- Implement **BullMQ** for background tasks (AI generation, analytics) to improve API responsiveness.

2. **Product and UX**
- Expand analytics dashboards with host trend drill-downs.
- Improve participant live-room resilience and reconnect UX.
- Refine quiz authoring and AI insertion validation UX.

3. **Monetization and Operations**
- Run payment webhook replay simulation in staging.
- Add payout reconciliation dashboards and alerting.
- Improve plan-limit enforcement visibility in host billing.

4. **Scale and Platform**
- Load test high fanout rooms and leaderboard churn.
- Optimize Redis key lifecycle and memory profile.
- Add tracing dashboards for realtime latency bottlenecks using Winston-structured logs.

## 🏛️ Governance
- Priorities are reviewed each sprint.
- Scope changes should be reflected in this file and linked PRs.
