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

## Build

```powershell
mvn clean verify
```