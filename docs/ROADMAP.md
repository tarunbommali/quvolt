# Quvolt Roadmap

Updated: 2026-04

## Near-Term Priorities

1. Reliability and Release Quality
- Add API-level rate-limit regression tests for lifecycle endpoints.
- Add staging smoke tests for websocket reconnect and live continuity.
- Add migration dry-run checks in CI for status enum consistency.

2. Product and UX
- Expand analytics dashboards with host trend drill-downs.
- Improve participant live-room resilience and reconnect UX. [DONE]
- Refine quiz authoring and AI insertion validation UX.
- Complete design system application across all non-core pages (Legal, Billing, Analytics). [DONE]

3. Monetization and Operations
- Run payment webhook replay simulation in staging.
- Add payout reconciliation dashboards and alerting.
- Improve plan-limit enforcement visibility in host billing.

4. Scale and Platform
- Load test high fanout rooms and leaderboard churn.
- Optimize Redis key lifecycle and memory profile.
- Add tracing dashboards for realtime latency bottlenecks.

## Governance

- Priorities are reviewed each sprint.
- Scope changes should be reflected in this file and linked PRs.
