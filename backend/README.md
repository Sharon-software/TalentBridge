# TalentBridge Backend

Spring Boot 3 backend using Java 21, Maven, PostgreSQL, Spring Data JPA, and Flyway. The initial domain schema and repositories are in place; application controllers have not been added.

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

## Assignments and submissions

- `POST /api/assignments` creates an assignment for a cohort and requires the `COACH` role. Supply `cohortId`, `title`, and an ISO-8601 `dueAt` timestamp.
- `GET /api/assignments` and `GET /api/assignments/{id}` list and retrieve assignments for authenticated users.
- `POST /api/submissions?assignmentId={id}` accepts multipart form data with a `file` field and requires the `STUDENT` role. Each student can submit once per assignment; the server records `ON_TIME` or `LATE` against the deadline.
- `GET /api/submissions/mine` lists the current student's submissions, and `GET /api/submissions/me/punctuality` returns their on-time percentage.
- `GET /api/submissions/students/punctuality?studentProfileId={id}` returns a student's punctuality summary for coaches and admins.
- `POST /api/submissions/{submissionId}/external-access-grants` grants an external mentor access; only coaches and mentors can grant, and `expiresAt` is optional.
- `DELETE /api/submissions/{submissionId}/external-access-grants/{grantId}` revokes a grant. External mentors can download the file or view the analysis only while a matching grant is active and unexpired.

Uploads are stored under `UPLOAD_DIRECTORY` (default `./uploads`) using generated storage keys. The maximum upload size defaults to 10 MB and can be changed with `MAX_UPLOAD_SIZE` and `MAX_UPLOAD_REQUEST_SIZE`.

## Automated Analysis

Student uploads are analyzed asynchronously. PDF, DOCX, and TXT files are supported. Set `ANTHROPIC_API_KEY` to enable Claude analysis; `CLAUDE_MODEL` selects the model. The scorecard exposes an analysis status (`PENDING`, `COMPLETED`, or `FAILED`) and four rubric scores. Failed API calls are retried up to three times.

The four rubric dimensions are averaged for each assignment. A student's overall score is 80% of their average completed assignment score and 20% of their on-time submission percentage. `/api/submissions/{id}/analysis` returns the analysis result; students can view only their own, while coaches and admins can view any.

## Build

```powershell
mvn clean verify
```