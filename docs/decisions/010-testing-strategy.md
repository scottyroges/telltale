# ADR 010: Testing Strategy

**Status:** Accepted
**Date:** 2026-02

## Context

Telltale has no test infrastructure yet. Before implementing Phase 0 plans (Prisma, Better Auth, tRPC), we need a testing strategy so all new code ships with tests from the start. We want a testing pyramid: strong unit tests for business logic, integration tests for service/router composition, and a few E2E tests for critical user flows.

## Decision

Use **Vitest** for unit and integration tests, **React Testing Library** for component tests, and **Playwright** for E2E tests.

### Unit & Integration — Vitest

- Native ESM support — matches Next.js 15 / TypeScript ESM config
- Native TypeScript — no `ts-jest` config needed
- 3-5x faster than Jest in benchmarks
- Next.js App Router docs recommend Vitest over Jest for unit testing
- `vite-tsconfig-paths` resolves the `@/*` path alias from tsconfig

### Component Testing — React Testing Library

- Standard for behavior-driven component tests with React 19
- `@testing-library/react` ^16.x supports React 19
- Caveat: async Server Components aren't unit-testable yet — cover with E2E instead

### E2E — Playwright

- Cross-browser (Chromium, Firefox, WebKit/Safari) — Cypress lacks WebKit
- Native parallel execution — no paid tier needed
- `webServer` config auto-starts Next.js for tests
- MIT-licensed, no vendor lock-in

## Testing Pyramid

| Layer | Coverage Target | Scope | What to Test |
|-------|----------------|-------|-------------|
| Unit | 70-80% | `services/`, `domain/`, `lib/`, `hooks/`, `components/ui/` | Business logic, type guards, utilities, hooks, presentational components |
| Integration | 15-20% | `server/routers/`, service+repo combos, feature components | tRPC procedures via `createCallerFactory`, service orchestration, component composition |
| E2E | 5-10% | Critical user flows | Auth flow, conversation flow, dashboard load |

## File Organization

Frontend and backend tests follow different conventions to support future backend extraction.

| Code | Test Location | Rationale |
|------|--------------|-----------|
| `src/components/`, `src/hooks/`, `src/app/` | Co-located `*.test.tsx` next to source | React convention, tightly coupled, won't be extracted |
| `src/server/`, `src/services/`, `src/domain/`, `src/lib/` | `tests/` directory mirroring `src/` | Backend convention, clean extraction — grab `src/server/` + `tests/server/` and go |
| Critical user flows | `e2e/` directory | Cross-cutting, browser-driven |

- Backend test mirrors source: `src/services/conversation.ts` → `tests/services/conversation.test.ts`
- Shared test helpers (factories, fixtures, mocks) in `tests/helpers/`
- E2E tests in top-level `e2e/` directory

## Alternatives Considered

- **Jest** — experimental ESM support, slower, requires `ts-jest` config overhead
- **Cypress** — no WebKit support, parallel execution requires paid Cloud tier

## Consequences

- All new code should ship with tests — co-located for frontend, mirrored in `tests/` for backend
- Server Components tested via E2E rather than unit tests until the ecosystem catches up
- CI pipeline will run Vitest (fast, on every push) and Playwright (slower, on PRs to main)
- Developers run `npm test` for Vitest and `npm run test:e2e` for Playwright locally
