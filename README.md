# Telltale

AI-powered life story platform — conversational AI that draws out rich, deep stories through natural follow-up questions.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript (strict)
- **API:** tRPC v11, Zod 4
- **Database:** PostgreSQL 16 (Prisma 6)
- **Auth:** Better Auth with Google OAuth
- **AI:** Anthropic Claude API
- **Testing:** Vitest + Playwright
- **Deployment:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Start local database
npm run db:up

# Apply migrations
npm run db:migrate

# Start dev server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run db:up` / `db:down` | Start/stop local Postgres |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |
