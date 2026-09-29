# LMS Platform

A learning management backend built with Spring Boot 3, Spring Security (JWT), and Spring Data JPA.
It implements user auth, roles, courses, enrollment, a role-aware dashboard, persisted notifications,
instructor-to-student messaging, and real-time delivery of both over WebSocket — all enforced
server-side.

## Stack

- Java 17, Spring Boot 3.3.5
- Spring Web, Spring Security (stateless JWT via `jjwt`), Spring Data JPA
- Spring WebSocket + STOMP (real-time notification/message delivery)
- springdoc-openapi (Swagger UI)
- H2 (file-backed, `dev` profile — default) / PostgreSQL (`postgres` profile)
- JUnit 5 + MockMvc integration tests

## Running

```bash
mvn spring-boot:run
```

The app starts on `http://localhost:8080` using the `dev` profile (H2 file database at `./data/lmsdb`,
H2 console at `/h2-console`). Roles (`STUDENT`, `INSTRUCTOR`, `ADMIN`) and a default admin account are
seeded automatically on startup. In the `dev` profile, a set of demo users, courses, enrollments,
notifications and messages is also seeded on first run (skipped if any course already exists — see
[Demo data](#demo-data-dev-profile) below).

API docs (Swagger UI): `http://localhost:8080/swagger-ui.html`

Default admin (change immediately in any real deployment via env vars):

- Email: `admin@lms.local` (override with property `app.admin.email`)
- Password: `ChangeMe123!` (override with property `app.admin.password`)

To run against PostgreSQL instead:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=postgres
```

with `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` env vars set. Set `JWT_SECRET` (32+ bytes) and
`JWT_EXPIRATION_MS` in any non-dev environment.

CORS is restricted to an allowlist (default `http://localhost:5173`, `http://127.0.0.1:5173` — a
typical Vite dev server), overridable via `CORS_ALLOWED_ORIGINS` (comma-separated).

## Tests

```bash
mvn test
```

Integration tests boot the full Spring context against an in-memory H2 database and drive every
endpoint through real HTTP calls (MockMvc), including the access-control checks below.

## Data model

| Table | Purpose |
|---|---|
| `roles` | The three fixed roles: `STUDENT`, `INSTRUCTOR`, `ADMIN` |
| `users` | Account + `role_id` FK |
| `courses` | `instructor_id` FK -> `users` |
| `enrollments` | `student_id` + `course_id` FK, unique per pair |
| `notifications` | `user_id` FK (owner), content, type, `is_read` |
| `messages` | `sender_id`, `recipient_id`, `course_id` FKs, content |

`ddl-auto: update` is used for the `dev`/`postgres` profiles (no existing schema/data to preserve, since
this is a new project); tests use `create-drop` against an isolated in-memory database.

## Authentication

All endpoints except `/api/auth/**`, `/h2-console/**`, the Swagger/OpenAPI paths
(`/swagger-ui/**`, `/v3/api-docs/**`), and the WebSocket handshake (`/ws/**`, authenticated
separately — see [Real-time](#real-time-websocket) below) require a JWT bearer token:

```
Authorization: Bearer <token>
```

### `POST /api/auth/register`

```json
{ "name": "Alice Student", "email": "alice@example.com", "password": "password123", "role": "STUDENT" }
```
`role` is one of `STUDENT` | `INSTRUCTOR` (public registration as `ADMIN` is rejected with `409 Conflict`).
Response `201 Created`:
```json
{ "token": "...", "userId": 2, "name": "Alice Student", "email": "alice@example.com", "role": "STUDENT" }
```

### `POST /api/auth/login`
```json
{ "email": "alice@example.com", "password": "password123" }
```
Response `200 OK`: same shape as register. Invalid credentials -> `401 Unauthorized`.

### `POST /api/auth/logout`
Stateless JWT has no server-side session; returns `204 No Content`. Clients log out by discarding the token.

## Courses & enrollment

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/courses` | INSTRUCTOR | Create a course |
| GET | `/api/courses` | any authenticated | List all courses |
| GET | `/api/courses/{id}` | any authenticated | View a course |
| POST | `/api/courses/{id}/enroll` | STUDENT | Enroll self in a course |
| GET | `/api/courses/{id}/students` | INSTRUCTOR (owner) / ADMIN | List a course's enrolled students |
| GET | `/api/enrollments/my` | STUDENT | List the caller's own enrollments |
| GET | `/api/dashboard` | any authenticated | Role-shaped summary (see below) |

## Notifications

| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications` | Returns **only the authenticated user's** notifications, newest first |
| PUT | `/api/notifications/{id}/read` | Marks **the caller's own** notification read |

Notifications are generated automatically by the system and pushed in real time (see
[Real-time](#real-time-websocket)) in addition to being persisted for the REST endpoint above:
- to a student, when they enroll in a course
- to an instructor, when a student enrolls in their course
- to a student, when they receive a new message

Example:
```
GET /api/notifications
Authorization: Bearer <student-token>
```
```json
[
  { "id": 5, "content": "New message from Meg Instructor (Messaging 101)", "type": "MESSAGE", "read": false, "createdAt": "2026-09-28T10:15:30Z" }
]
```

```
PUT /api/notifications/5/read
Authorization: Bearer <student-token>
```
`200 OK` with the updated notification, `read: true`.

**Access control:** `GET /api/notifications` never returns another user's rows (it is filtered by the
authenticated user's ID at the query level, not by trusting client input). `PUT /{id}/read` looks up the
notification by `id` **and** owner ID together — a request for someone else's notification (or one that
doesn't exist) returns an identical `404 Not Found`, so the endpoint can't be used to probe which
notification IDs exist for other users.

## Instructor -> student messaging

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/messages` | INSTRUCTOR | Send a message to a student enrolled in one of the sender's courses |
| GET | `/api/messages/{id}` | sender or recipient only | Read a single message |
| GET | `/api/messages` | any authenticated | List the caller's own sent + received messages |

Messages can also be sent over the WebSocket connection (`/app/messages`, see below); it enforces the
exact same rules by calling the same service method as `POST /api/messages`.

### `POST /api/messages`
```json
{ "studentId": 7, "courseId": 3, "content": "Welcome to the course!" }
```
Server-side checks, in order:
1. Caller must hold `INSTRUCTOR` (`403` otherwise — students cannot send instructor-only messages).
2. `courseId` must belong to a course **taught by the caller** (`403` if it's someone else's course).
3. `studentId` must reference a user with role `STUDENT` (`403`/`404` otherwise).
4. That student must have an **enrollment row** for that course (`403` if not enrolled) — this is the
   Instructor -> Course -> Enrollment -> Student chain the requirement describes.

On success (`201 Created`), the message is persisted and the student receives a `MESSAGE` notification.

### `GET /api/messages/{id}`
Returns the message only if the authenticated user is its sender or recipient. Any other caller
(including a valid but unrelated student, or a different instructor) gets `404 Not Found` — identical to
the "doesn't exist" case, which is what prevents an ID-enumeration/IDOR attack from distinguishing
"not yours" from "never existed."

## Real-time (WebSocket)

STOMP over WebSocket at `/ws` (no SockJS fallback), for real-time delivery of notifications, messages,
and send errors without polling.

**Connect:** open a STOMP connection to `/ws` and send the `Authorization: Bearer <token>` header on
the STOMP `CONNECT` frame (the WebSocket handshake itself is unauthenticated — browsers can't attach
headers to it — so the JWT is validated at `CONNECT` instead, using the same `JwtUtil` as the REST API).
An invalid/missing token rejects the connection.

**Subscribe** (client -> only these three private, per-user queues are allowed):

| Destination | Receives |
|---|---|
| `/user/queue/notifications` | A `Notification` pushed the moment it's created (enrollment, new message, etc.) |
| `/user/queue/messages` | A `Message` pushed the moment it's created, to sender and recipient |
| `/user/queue/errors` | A `WsErrorResponse` when a `SEND` to `/app/messages` is rejected |

**Send** (client -> server):

| Destination | Role | Body | Description |
|---|---|---|---|
| `/app/messages` | INSTRUCTOR | Same shape as `POST /api/messages` | WebSocket equivalent of sending a message |

Delivery is push-only and best-effort: the database write always happens first and commits regardless
of WebSocket state, so an offline recipient loses nothing — the data is still reachable via the normal
REST endpoints when they reconnect.

## Dashboard shape by role

`GET /api/dashboard` returns different fields depending on the caller's role:

- **STUDENT**: `enrollments` (their own), `unreadNotificationCount`
- **INSTRUCTOR**: `createdCourses`, `totalEnrolledStudents`, `unreadNotificationCount`
- **ADMIN**: `totalUsers`, `totalCourses`, `totalEnrollments`, `unreadNotificationCount`

## Admin

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/courses` | List all courses |
| GET | `/api/admin/enrollments` | List all enrollments |

All require `ADMIN`.

## Demo data (dev profile)

On first startup in the `dev` profile, `DemoDataSeeder` populates realistic sample content so the API
isn't empty (skipped on later restarts once any course already exists):

| User | Email | Password | Role |
|---|---|---|---|
| Priya Sharma | `priya.instructor@lms.local` | `Instructor123!` | INSTRUCTOR |
| Rahul Verma | `rahul.instructor@lms.local` | `Instructor123!` | INSTRUCTOR |
| Aditya Kumar | `aditya.student@lms.local` | `Student123!` | STUDENT |
| Meera Iyer | `meera.student@lms.local` | `Student123!` | STUDENT |
| Sanjay Patel | `sanjay.student@lms.local` | `Student123!` | STUDENT |

Plus 3 courses, 5 enrollments, and a handful of notifications and messages generated from that
activity. The seeded admin account (`app.admin.email`/`app.admin.password`, see [Running](#running))
is created separately by `DataSeeder` and always runs, in every profile.

## Error format

Every error response (validation, auth, not-found, forbidden, conflict) uses the same shape:
```json
{ "timestamp": "...", "status": 404, "error": "Not Found", "message": "Message not found", "path": "/api/messages/99" }
```
Validation errors additionally include a `details` array of `field: reason` strings. Unhandled
exceptions return a generic `500` message with no internal detail or stack trace exposed.

## Known limitations

- No refresh-token flow; JWTs simply expire (`app.jwt.expiration-ms`, default 24h) and logout is
  client-side only.
- No email/password-reset flow.
- No course update/delete, and no pagination on messages/notifications.
- Admin endpoints are read-only (listing only; no user/course management actions).
- WebSocket messaging (`/app/messages`) only covers instructor -> student sends; there's no
  student -> instructor equivalent over WebSocket or REST.
