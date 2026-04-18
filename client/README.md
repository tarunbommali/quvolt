# QuizBolt Client

This is the frontend application for QuizBolt, built with React and Vite.

Status snapshot (April 2026):
- host and participant flows are active
- session-aware host route resolution is active
- AI generation editor flow includes preview + JSON workflows
- e2e coverage is available through Playwright tests
- UI/UX consistency pass across Legal and Billing modules
- Theme-aware analytics system with refined typographic standards

## Responsibilities

- Authentication screens (login/register/profile)
- host workflows (dashboard, quiz editing, live control, results)
- AI quiz generation workflow inside the quiz editor flow
- Participant workflows (join room, play quiz, history)
- Real-time updates through Socket.IO

## Stack

- React
- Vite
- Tailwind CSS
- Axios
- Socket.IO client
- Recharts

## Prerequisites

- Node.js 18+
- Main API server running (`server/`)
- Payment service running (`payment-service/`) for paid quiz flows

## Environment

The client reads API config from the shared root `.env`:

- `VITE_API_URL=/api`

Vite proxy settings are defined in `vite.config.js` for:

- `/api` -> main server
- `/socket.io` -> main server websocket
- `/payment` -> payment service

## Development

```bash
cd client
npm install
npm run dev
```

## Build

```bash
cd client
npm run build
npm run preview
```

## Validation

```bash
cd client
npm run lint
npm run test
npm run test:e2e
```

## Folder Notes

- `src/pages/` - Route-level screens
- `src/components/` - UI and feature components
- `src/stores/` - Zustand state stores for auth, quiz, and realtime state
- `src/services/api.js` - API client layer
- `src/hooks/` - Reusable UI/realtime hooks
- `src/utils/` - Route resolvers and helper utilities

AI quiz generator notes:
- Difficulty inputs are explicit dropdowns in 5% steps from 0% to 100%.
- Changing one difficulty automatically rebalances the others so the total stays at 100%.
- The generator supports Preview and JSON tabs, plus copy-to-clipboard for raw JSON output.

## UX Direction

The frontend is designed for fast, clear quiz interactions with:

- High readability for question flow
- Responsive layouts across desktop/mobile
- host-first controls for live sessions
- Participant-first feedback on submissions and standings

## host Session Routing (Current)

The client uses centralized status-based route resolution:
- `draft` -> `/launch/:id`
- `scheduled` or `waiting` -> `/invite/:id`
- `live` -> `/live/:id`
- `completed` -> `/results/:id`
- `aborted` -> `/studio`

Implementation files:
- `src/utils/sessionRouteResolver.js`
- `src/components/RouteGuard.jsx`
- `src/pages/hostLaunch.jsx`
- `src/pages/hostInviteRoom.jsx`
- `src/pages/hostLive.jsx`
