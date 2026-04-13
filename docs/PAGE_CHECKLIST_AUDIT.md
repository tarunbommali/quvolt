# Page Checklist Audit

Date: 2026-04-13
Scope: All client page files under `client/src/pages/`
Checks performed:
- Compile/lint errors via editor diagnostics
- Component line-count check against the 150-line guideline

## Summary

- All checked page files are clean in diagnostics.
- 4 of 16 page files are under 150 lines.
- 12 of 16 page files still exceed the 150-line guideline.

## Line Count Results

| Page | Lines | 150-line Rule |
|---|---:|---|
| [Analytics.jsx](../client/src/pages/Analytics.jsx) | 116 | PASS |
| [Billing.jsx](../client/src/pages/Billing.jsx) | 397 | FAIL |
| [History.jsx](../client/src/pages/History.jsx) | 202 | FAIL |
| [HistoryDetail.jsx](../client/src/pages/HistoryDetail.jsx) | 364 | FAIL |
| [Home.jsx](../client/src/pages/Home.jsx) | 36 | PASS |
| [JoinRoom.jsx](../client/src/pages/JoinRoom.jsx) | 263 | FAIL |
| [Login.jsx](../client/src/pages/Login.jsx) | 164 | FAIL |
| [OrganizerEdit.jsx](../client/src/pages/OrganizerEdit.jsx) | 18 | PASS |
| [OrganizerInviteRoom.jsx](../client/src/pages/OrganizerInviteRoom.jsx) | 157 | FAIL |
| [OrganizerLaunch.jsx](../client/src/pages/OrganizerLaunch.jsx) | 146 | PASS |
| [OrganizerLive.jsx](../client/src/pages/OrganizerLive.jsx) | 217 | FAIL |
| [Profile.jsx](../client/src/pages/Profile.jsx) | 352 | FAIL |
| [QuizResults.jsx](../client/src/pages/QuizResults.jsx) | 182 | FAIL |
| [QuizRoom.jsx](../client/src/pages/QuizRoom.jsx) | 182 | FAIL |
| [Register.jsx](../client/src/pages/Register.jsx) | 246 | FAIL |
| [StudioDashboard.jsx](../client/src/pages/StudioDashboard.jsx) | 656 | FAIL |

## Diagnostics

No compile or lint errors were reported for the checked page files.

## Notes

- The 150-line rule is already satisfied by `Home`, `Analytics`, `OrganizerEdit`, and `OrganizerLaunch`.
- The largest refactor candidates are `StudioDashboard`, `Billing`, `HistoryDetail`, and `Profile`.
- Other checklist items such as SRP, JSDoc coverage, accessibility, and render optimization still need page-by-page manual review.
