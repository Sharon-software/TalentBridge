# TalentBridge Frontend

Vite + React + TypeScript application with role-specific workspaces for students, coaches, mentors, external reviewers, recruiters, and administrators. It uses Tailwind CSS, React Router, Axios, and TanStack Query to communicate with the Spring Boot API.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `VITE_API_URL` in `.env.local` if the backend is not at `http://localhost:8080`. Vite serves the app at `http://localhost:5173` by default.

## Checks

```powershell
npm run lint
npm run build
```

See the root [TalentBridge README](../README.md) for the full-stack demo setup and demo account details.
