# Visionary Academy LMS — Wasp Edition

This is the full-stack LMS migrated from Next.js/NextAuth/custom API routes to **Wasp 0.21**.

## Architecture

```
main.wasp          ← app config, auth, routes, pages, queries, actions
schema.prisma      ← database schema (PostgreSQL)
src/
  auth/            ← userSignupFields for role & name
  queries/         ← read operations (no HTTP routes needed)
  actions/         ← write operations + AI integrations
  pages/           ← React pages (teacher/*, student/*, auth/*)
  components/      ← shadcn UI, shared, layout components
  lib/utils.ts     ← cn(), formatDate(), gradeColor(), etc.
  Main.css         ← Tailwind + CSS variables + custom utilities
```

## What Wasp handles (zero custom code needed)
- **Auth**: Email/password signup & login, JWT sessions, email verification
- **HTTP**: All query/action endpoints generated automatically
- **Client-side auth**: `useAuth()`, `user` prop on protected pages
- **Database**: Prisma integration via `context.entities.*`
- **Routing**: React Router wired from `main.wasp` declarations

## What lives in `src/` (custom code only)
- React page components (shadcn UI)
- Query/action business logic (Prisma calls, role checks)
- AI study guide & AI grading (Anthropic API calls)

## Setup

### 1. Prerequisites
- Node.js 18+
- Wasp CLI: `npm install -g @wasp.sh/wasp-cli`
- PostgreSQL running locally (or use a cloud DB)

### 2. Configure environment
```bash
cp .env.server .env.server.local
# Edit .env.server.local and set:
#   DATABASE_URL=postgresql://...
#   ANTHROPIC_API_KEY=sk-ant-...  (optional)
```

### 3. Run migrations and start
```bash
wasp db migrate-dev   # creates DB schema
wasp start            # starts client + server
```

The app will open at http://localhost:3000.

### 4. Create your first account
- Go to http://localhost:3000/signup
- Enter name, email, password
- Enter role: `TEACHER` or `STUDENT`
- Log in

> In development, email verification is skipped by setting `SKIP_EMAIL_VERIFICATION_IN_DEV=true`
> (or the Dummy email provider prints verification links to the console).

## Features by role

### Teacher
- Dashboard with stats (assignments, tests, pending grades, students)
- Create/edit/delete assignments
- View assignment submissions, grade them manually or with AI
- Create tests with MCQ, True/False, Short Answer questions
- Publish/unpublish tests
- View test attempts and scores
- Manage resource library (links/files with tags)
- AI-assisted grading via Anthropic

### Student
- Dashboard with upcoming assignments and recent grades
- View and submit assignments (text response)
- Take published tests with optional timer, auto-graded MCQ/T-F
- View library resources
- AI Study Hub: generate study guides, flashcards, practice questions for any topic

## Deployment

Wasp apps can be deployed to any platform that supports Node.js + PostgreSQL:

```bash
wasp build        # generates deployable artifacts in .wasp/build/
```

See [Wasp deployment docs](https://wasp-lang.dev/docs/advanced/deployment) for guides
on deploying to Fly.io, Railway, Render, and more.
