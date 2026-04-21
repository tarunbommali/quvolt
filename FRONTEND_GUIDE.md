# 🚀 Quvolt Frontend Architecture (Enterprise Standard)

This project follows a **Feature-First + Layered Architecture**, optimized for enterprise-grade SaaS scalability.

---

## 🏗️ 1. Core Structure: Feature Modules

Features are self-contained domains. Each feature exposes a **Public API** (`index.js`) to prevent deep-import leakage.

### 📁 Feature Pattern
```bash
features/x/
├── index.js          # 🔥 Public API (Export pages/hooks/services)
├── pages/            # Route entry points
├── components/       # Feature-specific UI
├── hooks/            # Business logic (Side effects + State)
├── services/         # API endpoints (specific to feature)
├── constants/        # Feature constants/enums
└── config/           # Feature-level configuration
```

---

## 🛠️ 2. The Service Layer (Consolidated)

We strictly separate the **Infrastructure** from the **Domain Logic**.

*   **`src/services/apiClient.js`**: Pure Axios instance with global interceptors (Auth, Logging). No domain logic here.
*   **`features/x/services/x.service.js`**: Defines endpoints for a specific feature.

---

## 📦 3. State & Caching Layer

*   **Zustand**: Used for **Global Client State** (Auth, UI theme, sidebar state).
*   **React Query**: (Recommended) Use for **Server State** (Caching, Retries, Sync).
    *   Initialize in `src/lib/react-query/queryClient.js`.

---

## 🛡️ 4. Enterprise Guardrails

### 💎 Types & Schemas (`src/types/`)
Define shared data structures using JSDoc or TypeScript. This prevents "undefined" errors and improves IDE auto-complete.

### ⚠️ Centralized Error Handling (`src/utils/errorHandler.js`)
Never use `alert()` or raw `console.error` for users. Use the `handleApiError` utility to convert API failures into human-readable messages for Toast notifications.

### 🔌 Socket Architecture (`src/sockets/`)
Real-time logic is isolated. Feature-specific handlers should be created to manage socket events without cluttering components.

---

## ⚡ Scaling Rules & Best Practices

1.  **Public API Enforcement**: Only import from a feature's root `index.js`.
    *   ❌ `import { X } from '@/features/billing/pages/X'`
    *   ✅ `import { X } from '@/features/billing'`
2.  **The 200-Line Rule**: If any file (Component or Hook) exceeds 200 lines, it's time to refactor/split.
3.  **Cross-Feature Communication**: If Feature A needs data from Feature B, use a **Shared Store** or **Shared Service**. Never deep-link logic between features.
4.  **No Logic in Components**: Components should be "humble". If you see a `useEffect` fetching data, move it to a feature hook.

---

## 🗺️ Project Map

```bash
src/
├── app/               # Providers & Globals
├── features/          # 🔥 Domain Modules (Self-contained)
├── components/        # Shared UI Primitives (Button, Card, Input)
├── services/          # apiClient.js (Infrastructure only)
├── lib/               # Third-party configs (React Query)
├── types/             # Domain Schemas
├── sockets/           # Real-time orchestration
├── utils/             # Helpers & Error Handlers
├── stores/            # Client State (Zustand)
└── routes/            # Routes & RBAC
```
