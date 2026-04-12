# Qubolt Design Index

This file has been intentionally trimmed to avoid duplicated design content.

Use the dedicated documents:
- High Level Design: [QUIZBOLT_HLD.md](QUIZBOLT_HLD.md)
- Low Level Design: [QUIZBOLT_LLD.md](QUIZBOLT_LLD.md)

Notes:
- [QUIZBOLT_HLD.md](QUIZBOLT_HLD.md) contains architecture, system context, container view, major flows, and non-functional design.
- [QUIZBOLT_LLD.md](QUIZBOLT_LLD.md) contains module-level design, data model, API surface, realtime contracts, and implementation details.

Current addendum highlights:
- Explicit backend session lifecycle state machine is now active (`draft`, `scheduled`, `waiting`, `live`, `completed`, `aborted`).
- Frontend route resolution is centralized and status-only.
- Lifecycle routes are protected by ownership-aware RBAC middleware.
- Integration and middleware contract tests lock lifecycle and security behavior.
