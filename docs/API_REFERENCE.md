# Quvolt API Reference

This document outlines the core REST API endpoints used by the Quvolt application. 
All responses are standardized to the following format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

---

## 1. Authentication (`/api/auth`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/register` | POST | Register a new host/user | No |
| `/login` | POST | Authenticate and receive JWT | No |
| `/me` | GET | Get current user profile and active subscription | Yes |
| `/logout` | POST | Clear auth cookies/tokens | Yes |

---

## 2. Quiz Templates (`/api/quiz` / `/api/templates`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/` | GET | List all templates owned by the user | Yes |
| `/` | POST | Create a new blank template | Yes |
| `/:id` | GET | Get a specific template | Yes |
| `/:id` | PUT | Update template metadata and rules | Yes |
| `/:id` | DELETE | Delete a template | Yes |
| `/default` | GET | Fetch or auto-create a default template | Yes |
| `/:id/ai-generate` | POST | Generate questions via AI | Yes (Creator+) |

---

## 3. Session Lifecycle (`/api/quiz/:id`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/start-live` | POST | Transitions session to LIVE. Snapshots config into Redis. | Yes (Host) |
| `/abort` | POST | Forcefully ends a session | Yes (Host) |
| `/pause` | POST | Pauses the timer for the active session | Yes (Host) |
| `/resume` | POST | Resumes the timer | Yes (Host) |
| `/next` | POST | Manually advance to the next question (Tutor mode) | Yes (Host) |

---

## 4. Participant & Gameplay (`/api/participant`)

*(Note: Most gameplay happens over WebSockets. These are HTTP fallbacks/init endpoints)*

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/join` | POST | Validate room code and return session data | No |
| `/submit` | POST | Submit an answer | Token |

---

## 5. Billing & Subscriptions (`/api/billing`)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/plans` | GET | List available SaaS plans | No |
| `/checkout` | POST | Create a Razorpay checkout session | Yes |
| `/webhook` | POST | Razorpay webhook receiver | Signature |
| `/portal` | GET | Get user billing portal link | Yes |

---

## Error Handling

Standard HTTP status codes are used:
- `200 OK` - Success
- `400 Bad Request` - Validation failure
- `401 Unauthorized` - Missing or invalid JWT
- `403 Forbidden` - User lacks plan entitlement (e.g., Free user trying to use AI)
- `404 Not Found` - Resource does not exist
- `500 Internal Server Error` - Server crash
