# TalentBridge

TalentBridge connects students, coaches, mentors, external reviewers, recruiters, and administrators around cohort learning and career readiness. It includes role-specific workspaces backed by a Spring Boot API and PostgreSQL.

## Features

- Students track progress, submit assignments for analysis, maintain a CV, view recommendations, and message external mentors.
- Coaches and mentors review cohort progress, manage student access, write recommendations, and support hiring.
- External mentors review only work shared with them and provide feedback and private messages.
- Recruiters search eligible student profiles, build shortlists, and manage hire requests.
- Administrators manage users, assign students to cohorts, and view platform activity.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router
- Backend: Java 21, Spring Boot, Spring Security, JWT, JPA, Flyway
- Database: PostgreSQL; an in-memory H2 database is available in demo mode

## Run Locally

Requirements: Node.js 20.19+ or 22.12+, npm, Java 21, and Maven 3.9+.

For a quick demo without Docker or PostgreSQL, start the backend in demo mode:

```powershell
cd backend
$env:SPRING_PROFILES_ACTIVE = "demo"
mvn spring-boot:run
```

In a second terminal, start the frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The demo backend is at `http://localhost:8080`. Demo accounts and their shared password are documented in [backend/README.md](backend/README.md). Demo data is temporary and credentials are for local testing only.

To use PostgreSQL instead, start the database with `docker compose up -d` from `backend/`, then run `mvn spring-boot:run` without the demo profile.

## Checks

```powershell
cd frontend
npm run lint
npm run build
```

```powershell
cd backend
mvn test
```

## Deploy on Render

The root `render.yaml` defines a single Docker web service with the frontend and API served from the same origin, plus a managed PostgreSQL database. To deploy:

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and connect `Sharon-software/TalentBridge` on the `main` branch.
3. Enter `BOOTSTRAP_ADMIN_EMAIL` and a unique `BOOTSTRAP_ADMIN_PASSWORD` of at least 12 characters when prompted. Render generates the JWT signing secret.
4. Deploy the Blueprint. Render will provide the public `onrender.com` URL when provisioning finishes.

This Blueprint uses free-tier resources for a demo. Free databases may expire, and uploaded files on the free web service are not durable across restarts. For production, use a paid persistent database and object storage for uploads. Set `ANTHROPIC_API_KEY` in the Render service settings to enable automated analysis.

## Repository Layout

```text
backend/   Spring Boot API, migrations, and integration tests
frontend/  React application
Dockerfile Root full-stack container used by Render
render.yaml Render web service and PostgreSQL Blueprint
```
