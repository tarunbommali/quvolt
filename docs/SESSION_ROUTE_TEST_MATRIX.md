# Session Route Test Matrix

Date: 2026-04-10
Scope: Organizer session flow route resolution and guard normalization.
Resolver source: `client/src/utils/sessionRouteResolver.js`
Guard source: `client/src/components/RouteGuard.jsx`

## State To Route Mapping

| Session State | Representative Quiz Shape | Expected Route | Simulation Output | Result |
|---|---|---|---|---|
| draft | `{ _id: 'q1', status: 'draft' }` | `/launch/q1` | `/launch/q1` | PASS |
| scheduled | `{ _id: 'q1', status: 'scheduled', scheduledAt: future }` | `/invite/q1` | `/invite/q1` | PASS |
| waiting | `{ _id: 'q1', status: 'waiting' }` | `/invite/q1` | `/invite/q1` | PASS |
| live | `{ _id: 'q1', status: 'live' }` | `/live/q1` | `/live/q1` | PASS |
| completed | `{ _id: 'q1', status: 'completed' }` | `/results/q1` | `/results/q1` | PASS |
| aborted | `{ _id: 'q1', status: 'aborted' }` | `/studio` | `/studio` | PASS |

## Deep-Link Guard Checklist

| Current URL | Quiz State | Expected Guard Redirect |
|---|---|---|
| `/launch/q1` | live | `/live/q1` |
| `/launch/q1` | waiting/scheduled | `/invite/q1` |
| `/invite/q1` | draft | `/launch/q1` |
| `/invite/q1` | live | `/live/q1` |
| `/live/q1` | draft/scheduled/waiting | `/launch/q1` or `/invite/q1` based on resolver |
| `/live/q1` | completed | `/results/q1` |
| `/inviteroom/q1` (legacy) | any | `/invite/q1` (legacy alias redirect) |

## Quick Command Used

```bash
node --input-type=module -e "import { resolveSessionRoute } from './client/src/utils/sessionRouteResolver.js'; const now = new Date(); const future = new Date(now.getTime()+3600_000).toISOString(); const cases=[['draft',{_id:'q1',status:'draft'}],['scheduled',{_id:'q1',status:'scheduled',scheduledAt:future}],['waiting',{_id:'q1',status:'waiting'}],['live',{_id:'q1',status:'live'}],['completed',{_id:'q1',status:'completed'}],['aborted',{_id:'q1',status:'aborted'}]]; for (const [name,quiz] of cases){ console.log(name+': '+resolveSessionRoute(quiz)); }"
```

## Security Contract Validation

Lifecycle routes are also protected by auth/RBAC/ownership tests.

Related suites:
- `server/tests/sessionLifecycle.test.js`
- `server/tests/sessionAuth.test.js`
- `server/tests/middlewareContract.test.js`

Lifecycle and auth-sensitive API responses are standardized as:

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
