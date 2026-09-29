# LMS Platform — Features & Implementation

Two projects, one system:

- **`lms-platform/`** — Spring Boot 3 REST + WebSocket backend (Java 17)
- **`lms-frontend/`** — React 18 + TypeScript + Vite single-page app

The frontend talks to the backend over REST (`/api/**`) and a single WebSocket/STOMP connection
(`/ws`) for real-time push. In dev, Vite proxies both to the backend (`vite.config.ts` currently
points at `http://localhost:8081` / `ws://localhost:8081` — the backend's own default is `8080`
unless started with `SERVER_PORT=8081`, so make sure both sides agree on the port).

---

## 1. Backend features (`lms-platform`)

| Area | What it does |
|---|---|
| **Auth** | Register / login / logout. Passwords hashed with BCrypt. Login issues a signed JWT (`jjwt`), stateless — no server-side session. |
| **Roles** | Three fixed roles: `STUDENT`, `INSTRUCTOR`, `ADMIN`. Public registration only allows `STUDENT`/`INSTRUCTOR`; self-registering as `ADMIN` is rejected (`409`). |
| **Courses** | Instructors create courses. Anyone authenticated can list/view courses. |
| **Enrollment** | Students enroll themselves in a course (unique per student+course). Instructors/Admins can list a course's enrolled students. |
| **Dashboard** | One endpoint (`/api/dashboard`) returns a different, role-shaped payload depending on who's asking (see §3). |
| **Notifications** | Persisted, per-user notification rows, auto-generated on enrollment and on new messages. REST list/mark-read, filtered strictly to the caller's own rows. |
| **Messaging** | Instructors message a student enrolled in one of their own courses. Enforced server-side as a 4-step chain: caller is instructor → course belongs to caller → target is a student → target is enrolled in that course. |
| **Real-time (WebSocket/STOMP)** | `/ws` endpoint. On `CONNECT`, the JWT is validated the same way as REST (via the `Authorization` STOMP header, since browsers can't set headers on the raw WS handshake). Server pushes new notifications/messages the instant they're created (after DB commit), and instructors can also send a message directly over `/app/messages` instead of REST. Errors come back on a private `/user/queue/errors` queue. |
| **Admin** | Read-only listing of all users, courses, and enrollments. |
| **API docs** | springdoc-openapi generates a live spec; browsable at `/swagger-ui.html`. |
| **Error handling** | Every error (validation, auth, not-found, forbidden, conflict, 500) returns the same JSON shape (`timestamp`, `status`, `error`, `message`, `path`, optional `details[]`). No stack traces leak to clients. |
| **Persistence** | H2 file DB by default (`dev` profile), PostgreSQL via `postgres` profile. `ddl-auto: update` in both; tests use an isolated in-memory `create-drop` DB. |
| **Dev data** | On first boot (`dev` profile), an admin account is always seeded, plus a batch of realistic demo users/courses/enrollments/messages so the UI isn't empty. |

### Implementation notes
- **Stack**: Spring Web, Spring Security (stateless JWT filter chain), Spring Data JPA, Spring WebSocket, springdoc-openapi, Lombok, JUnit 5 + MockMvc.
- **Security boundary**: method-level `@PreAuthorize("hasRole(...)")` on controllers, backed by a `JwtAuthenticationFilter` that populates the `SecurityContext` from the bearer token on every REST request.
- **WebSocket security is separate from REST security**: `StompAuthChannelInterceptor` authenticates the STOMP `CONNECT` frame itself (not the HTTP handshake) and restricts `SUBSCRIBE` to exactly three private, per-user queues (`/user/queue/notifications`, `/user/queue/messages`, `/user/queue/errors`) — a client cannot subscribe to, or infer, another user's queue.
- **IDOR-safe by design**: notification/message lookups filter by owner ID at the query level (not just after fetching), and "not yours" vs. "doesn't exist" both return an identical `404`, so IDs can't be enumerated.
- **Real-time delivery is transactional**: pushes are registered via `TransactionSynchronizationManager.afterCommit`, so a client never sees a WebSocket event for a row that got rolled back — and if the client is offline, nothing is lost, since the row is already durable and reachable via REST.

---

## 2. Frontend features (`lms-frontend`)

| Page / Component | Purpose |
|---|---|
| **Login / Register** | Email+password login; registration lets the user pick `STUDENT` or `INSTRUCTOR` (no `ADMIN` option in the UI, matching the backend rule). |
| **Dashboard** | Renders a different view per role, driven entirely by `GET /api/dashboard`: student sees their enrollments, instructor sees their courses + total enrolled students, admin sees platform-wide totals. Always shows unread notification count. |
| **Courses** | Lists all courses. Instructors get an inline "create course" form. Students get an "Enroll" button per course (disabled once enrolled). |
| **Course detail** | Shows course info; enrolled-student roster is visible only to the owning instructor or an admin. Instructors get a "Message" button per student that opens a compose modal. |
| **Notifications** | Lists the user's notifications, newest first, with a "mark read" action. New notifications pushed over WebSocket are prepended live without a page refresh. |
| **Messages** | Lists the user's sent + received messages (labeled "From"/"To"). New messages pushed over WebSocket appear live. |
| **Admin panel** | Tabbed views (Users / Courses / Enrollments) backed by the three admin list endpoints. Only reachable by `ADMIN`. |
| **Navbar** | Shows the current user's name/role, a live-connection indicator dot (green when the WebSocket is connected), and a logout button. The "Admin" nav link only renders for `ADMIN`. |
| **Compose Message modal** | Instructor-only message form, used from the course detail page. |

### Implementation notes
- **Stack**: React 18, TypeScript, React Router v6, `@stomp/stompjs`, Vite (no CSS framework — hand-written `styles.css`).
- **Auth state**: JWT + user info stored in `localStorage`, restored on load, attached as `Authorization: Bearer <token>` on every API call by a thin `fetch` wrapper (`api/client.ts`). A global 401 handler clears stored auth and forces logout.
- **Route protection**: `ProtectedRoute` redirects unauthenticated users to `/login`, and optionally restricts a route to a role allowlist (used for `/admin`) — this is a UX guard only, not a security boundary; the real enforcement is server-side.
- **Real-time**: `RealtimeProvider` owns a single STOMP connection for the whole app, opened once a JWT exists and torn down on logout. It auto-reconnects with exponential backoff (1s → 30s cap) and exposes the latest pushed notification/message/error to any page via context, which is how the Notifications/Messages pages update live.
- **No client-side role logic duplicates backend rules** — the UI just hides/shows actions per role for a clean UX; every action is re-validated by the backend regardless.

---

## 3. Role-based access matrix

| Capability | STUDENT | INSTRUCTOR | ADMIN |
|---|:---:|:---:|:---:|
| Register / login | ✅ | ✅ | — (no self-registration; seeded only) |
| View courses | ✅ | ✅ | ✅ |
| Create a course | ❌ | ✅ (own) | ❌ |
| Enroll in a course | ✅ (self) | ❌ | ❌ |
| View a course's enrolled students | ❌ | ✅ (own courses only) | ✅ (any course) |
| View own enrollments | ✅ | — | — |
| Dashboard content | own enrollments + unread count | own courses + total students + unread count | platform totals (users/courses/enrollments) + unread count |
| View own notifications | ✅ | ✅ | ✅ |
| Mark own notification read | ✅ | ✅ | ✅ |
| Send a message | ❌ | ✅ (to a student enrolled in own course) | ❌ |
| Read a message | ✅ (if sender/recipient) | ✅ (if sender/recipient) | ❌ (no admin override) |
| List own sent/received messages | ✅ | ✅ | ✅ (empty unless admin ever sends/receives, which isn't supported) |
| Real-time notifications/messages (WebSocket) | ✅ (receive) | ✅ (send + receive) | ✅ (receive) |
| Admin: list all users/courses/enrollments | ❌ | ❌ | ✅ |

Enforcement is server-side in every row above (`@PreAuthorize` + ownership checks in the service
layer); the frontend only mirrors these rules to avoid showing actions that would be rejected.

---

## 4. End-to-end flow examples

**Enrollment → notification → live push**
1. Student calls `POST /api/courses/{id}/enroll`.
2. Backend persists the enrollment, then persists two notifications (student + instructor) in the same transaction.
3. On commit, `RealtimePublisher` pushes both notifications to each user's `/user/queue/notifications`, if they're connected.
4. Frontend's `RealtimeContext` receives the push and prepends it to the Notifications page instantly; if the user isn't looking at that page, the navbar dot / unread count still reflects it next time `/api/dashboard` or `/api/notifications` is fetched.

**Instructor sends a message (either REST or WebSocket)**
1. Instructor clicks "Message" on a student in Course Detail → `ComposeMessageModal` calls `POST /api/messages` (or, if sent from a WebSocket-only client, `/app/messages`) — same `MessageService` code path either way.
2. Backend validates the instructor→course→enrollment→student chain, persists the message, persists a `MESSAGE` notification for the student.
3. Both the message and the notification are pushed live to the student (and the message echoed back to the instructor) over their private queues.
