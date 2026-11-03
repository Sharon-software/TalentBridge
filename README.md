Block 12: Auth, layout and role routing

Build the login page, an AuthContext (token + user + role from /api/me), and
protected routes by role: STUDENT, COACH, MENTOR, EXTERNAL_TUTOR,
EXTERNAL_MENTOR, RECRUITER, ADMIN. Build the app shell: sidebar with role-based
navigation, top bar with profile menu and logout, light/dark mode. Design:
deep navy (#14213d) and teal (#0f9d8a), clean cards, responsive. Add shared
components: ScoreRing, StatCard, DataTable, Badge, EmptyState, Skeleton, Toast.
Each role lands on a placeholder dashboard page. Test with the seeded demo users.

Block 13: Student dashboard

Build the Student dashboard using real API data: overall score ring, scorecard
breakdown (quality, correctness, originality, communication, punctuality),
on-time vs late chart, upcoming deadlines, recent assignments with status and
score, and a month-of-6 progress bar. Add loading, empty and error states.
Tell me what to test.

Block 14: Student submissions, CV and messages

Build for the student: (1) assignment list and submission page with drag-and-drop
upload, deadline countdown, and an AI analysis status that polls until the score
card is ready, then shows the full report; (2) the editable CV page (CRUD for
education, experience, skills, certifications) with a PDF download; (3) a
published recommendation letters page; (4) a private messages page with the
WebSocket connection to external mentors. Stop after each of the four and tell
me what to test.

Block 15: Coach and Mentor

Build the Coach and Mentor dashboards: cohort list, student table sortable by
overall score with "falling behind" flags, student detail (scorecard,
submissions, punctuality), create-assignment form for coaches, a "Share with
external mentor" modal (mentor, assignment, expiry) with a list of active grants
and a revoke button, a recommendation letter editor (draft, publish), and a
"Hire / Recommend" button. Tell me what to test.

Block 16: External Tutor and External Mentor

Build the External Tutor dashboard (assigned cohorts, submissions, feedback
form) and the External Mentor dashboard: ONLY assignments with an active grant,
an expiry indicator, a review panel (comments, rating) and private chat with the
student. Confirm in the UI that a revoked or expired grant disappears and the
API returns 403 for anything not shared.

Block 17: Recruiter

Build the Recruiter dashboard: ranked talent board (highest overall score
first) with paginated cards, filters for ICT qualification (multi-select),
years of experience, skills and search, a student detail page (CV, scorecard,
published letters), a Hire button with confirmation, and a shortlist page.
Only students at 6+ months should appear. Tell me what to test.

Block 18: Admin

Build the Admin dashboard: user list, create user, role assignment, cohort
management, and platform stats. Use the existing admin endpoints; if stats
endpoints are missing, add them to the backend with tests first.

Block 19: Hardening

Add global exception handling, rate limiting on login, audit logging for access
grants and hire requests, file size and type validation, OpenAPI docs, and
Dockerfiles for backend and frontend plus a docker-compose that runs the whole
stack. On the frontend, add an error boundary, a friendly 403/404 page, and
form validation messages.
