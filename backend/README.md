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

## Build

```powershell
mvn clean verify
```