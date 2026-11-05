# TalentBridge Backend

Spring Boot 3 backend using Java 21, Maven, PostgreSQL, Spring Data JPA, Flyway, and JWT authentication.

## Requirements

- Java 21
- Maven 3.9+
- Docker Compose

## Run locally

From this directory, start PostgreSQL:

```powershell
docker compose up -d
```

Then run the application:

```powershell
mvn spring-boot:run
```

Flyway applies the schema on startup. The database defaults are for local development and can be overridden with `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD`. Compose also accepts `DB_NAME` and `DB_PORT`. The application port can be changed with `SERVER_PORT`.

The public health endpoint is `http://localhost:8080/actuator/health`. Other routes require Spring Security authentication.

## Authentication

- `POST /api/auth/register` creates a student account and returns access and refresh tokens.
- `POST /api/auth/login` verifies credentials and returns a token pair.
- `POST /api/auth/refresh` accepts `{"refreshToken":"..."}` and returns a new token pair.
- `GET /api/me` returns the authenticated user's profile.

Send access tokens as `Authorization: Bearer <token>`. Access tokens last 15 minutes by default and refresh tokens 7 days. Set `JWT_SECRET` to a Base64-encoded secret of at least 32 bytes outside local development. Token TTLs can be changed with `JWT_ACCESS_TOKEN_TTL` and `JWT_REFRESH_TOKEN_TTL`. Configure browser origins with the comma-separated `CORS_ALLOWED_ORIGINS` variable.

### Local demo accounts

To start the demo backend without installing PostgreSQL or Docker, activate the `demo` Spring profile. It uses an in-memory H2 database and seeds one account for each supported sign-in role:

```powershell
$env:SPRING_PROFILES_ACTIVE = "demo"
mvn spring-boot:run
```

Each demo account uses the password `TalentBridgeDemo!2026` by default. Override it with `DEMO_ACCOUNT_PASSWORD` before starting the backend. Accounts are recreated on each startup and their data is temporary. The accounts are seeded only with the explicit `demo` profile; do not enable that profile on a publicly accessible or production deployment.

| Role | Email |
| --- | --- |
| Student | `student@talentbridge.example` |
| Coach | `coach@talentbridge.example` |
| Mentor | `mentor@talentbridge.example` |
| External tutor | `external-tutor@talentbridge.example` |
| External mentor | `external-mentor@talentbridge.example` |
| Recruiter | `recruiter@talentbridge.example` |
| Company | `company@talentbridge.example` |
| Admin | `admin@talentbridge.example` |

## Assignments and submissions

- `POST /api/assignments` creates an assignment for a cohort and requires the `COACH` role. Supply `cohortId`, `title`, and an ISO-8601 `dueAt` timestamp.
- `GET /api/assignments` and `GET /api/assignments/{id}` list and retrieve assignments for authenticated users.
- `POST /api/submissions?assignmentId={id}` accepts multipart form data with a `file` field and requires the `STUDENT` role. Each student can submit once per assignment; the server records `ON_TIME` or `LATE` against the deadline.
- `GET /api/submissions/mine` lists the current student's submissions, and `GET /api/submissions/me/punctuality` returns their on-time percentage.
- `GET /api/submissions/students/punctuality?studentProfileId={id}` returns a student's punctuality summary for coaches and admins.
- `POST /api/submissions/{submissionId}/external-access-grants` grants an external mentor access; only coaches and mentors can grant, and `expiresAt` is optional.
- `GET /api/submissions/{submissionId}/external-access-grants` lists active grants; `DELETE /api/submissions/{submissionId}/external-access-grants/{grantId}` revokes a grant.
- External mentors list only active shares with `GET /api/external-mentor/submissions`. File, analysis, review, and chat APIs reject unshared, revoked, or expired submissions with `403`.

## External Tutor and Mentor Workspaces

- Admins assign tutors with `PUT /api/admin/cohorts/{cohortId}/external-tutors/{tutorId}`, list assignments with `GET /api/admin/cohorts/{cohortId}/external-tutors`, and remove assignments with `DELETE` on the same tutor path.
- External tutors list assigned cohorts with `GET /api/external-tutor/cohorts` and submissions with `GET /api/external-tutor/cohorts/{cohortId}/submissions`. Access is limited to assigned cohorts.
- External tutors and external mentors save a 1-5 rating and comments with `PUT /api/submissions/{submissionId}/review`, for example `{"rating":4,"comments":"Clear approach; add more test coverage."}`. Tutors must be assigned to the submission's cohort; mentors need an active grant. Unshared work returns `403`.
- External mentors list active grants with `GET /api/external-mentor/submissions`; expired and revoked grants are omitted. Private messages use the `/api/messages` and authenticated `/ws` STOMP endpoints described below.

## Messaging

- `POST /api/messages/threads` starts or returns a thread for a submission; students provide `externalMentorId`, while external mentors may start their own thread. An active grant is required.
- `GET /api/messages/threads` lists the current participant's active-grant threads. `GET /api/messages/threads/{threadId}` reads messages and marks incoming messages as read.
- `POST /api/messages/threads/{threadId}/messages` sends a message. `GET /api/messages/unread-count` returns the participant's unread total.
- WebSocket STOMP clients connect to `/ws`, subscribe to `/user/queue/threads/{threadId}`, and send to `/app/threads/{threadId}/messages`. Send a JWT bearer token in the STOMP `CONNECT` frame's `Authorization` header. Thread subscriptions and sends are checked against participant identity and the active grant.

## CV and Recommendation Letters

- Students manage their own CV entries with `GET/POST /api/cv` and `GET/PUT/DELETE /api/cv/{entryId}`. Ownership comes from the authenticated account; another student's entry is forbidden.
- Mentors and coaches create drafts with `POST /api/recommendation-letters`, edit their drafts with `PUT /api/recommendation-letters/{letterId}`, and publish with `POST /api/recommendation-letters/{letterId}/publish`.
- Students list published letters with `GET /api/recommendation-letters/mine`; draft letters stay hidden until published, and students can only view letters belonging to their profile.

## Talent Search and Hiring

- Recruiters and mentors search eligible students with `GET /api/recruiters/students`. Results require a `startDate` at least six months old, are ordered by overall score descending, and support `qualification`, `minYearsExperience`, `skill`, `page`, and `size` query parameters.
- Experience filters use the earliest dated CV entry; skills are matched case-insensitively against CV skills. CV skills are supplied in the `skills` array when creating or updating an entry.
- `GET /api/recruiters/students/{studentProfileId}` returns the student's CV, scorecards, and published recommendation letters.
- Recruiters and mentors create and list their own hire requests with `POST /api/hire-requests` and `GET /api/hire-requests`.

Uploads are stored under `UPLOAD_DIRECTORY` (default `./uploads`) using generated storage keys. The maximum upload size defaults to 10 MB and can be changed with `MAX_UPLOAD_SIZE` and `MAX_UPLOAD_REQUEST_SIZE`.

## Automated Analysis

Student uploads are analyzed asynchronously. PDF, DOCX, and TXT files are supported. Set `ANTHROPIC_API_KEY` to enable Claude analysis; `CLAUDE_MODEL` selects the model. The scorecard exposes an analysis status (`PENDING`, `COMPLETED`, or `FAILED`) and four rubric scores. Failed API calls are retried up to three times.

The four rubric dimensions are averaged for each assignment. A student's overall score is 80% of their average completed assignment score and 20% of their on-time submission percentage. `/api/submissions/{id}/analysis` returns the analysis result; students can view only their own, while coaches and admins can view any.

## Build

```powershell
mvn clean verify
```