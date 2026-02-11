# Telltale

AI-powered life story platform — conversational AI that draws out rich, deep stories through natural follow-up questions.

## Commands

- **Dev:** `npm run dev`
- **Build:** `npm run build`
- **Test:** `npm test` (Vitest)
- **Test Watch:** `npm run test:watch`
- **Test Coverage:** `npm run test:coverage`
- **Test E2E:** `npm run test:e2e` (Playwright)
- **Lint:** `npm run lint`

## Backend Extraction Rules

The backend lives in Next.js for speed, but must stay extractable. These rules apply to all backend code (`src/server/`, `src/services/`, `src/domain/`, `src/lib/`, `src/repositories/`):

- **Services are framework-agnostic.** No Next.js, tRPC, or React imports in `src/services/`. Services import only from `repositories/`, `domain/`, and `lib/`.
- **tRPC routers are thin wrappers.** Input validation, auth checks, then delegate to a service. No business logic in routers.
- **Repositories abstract the database.** Services never import Prisma directly — they go through `src/repositories/`.
- **Domain types have no runtime code.** `src/domain/` is TypeScript types and interfaces only.
- **Backend tests live in `tests/`, not co-located.** Mirror the `src/` structure so tests travel with the code during extraction (see ADR 010).

For full architecture details, see `docs/architecture/system-overview.md`.

## Code Organization

- **Keep files small and focused.** Each file should have a single clear responsibility.
- **Split when files grow.** When a file becomes large or cluttered, find abstractions and seams to break it into smaller pieces.
- **Group files into directories.** Related files belong together — use directories to make the codebase easy to navigate.

## Documentation

For project documentation, see `docs/INDEX.md`.
