# Doc Updater Memory

## Project Structure
- `docs/INDEX.md` is the central documentation index with "When to Consult" quick-reference + detailed sections
- INDEX.md style: bold file paths with dash-separated descriptions, one line per entry
- Plans live in `docs/plans/active/` (numbered by phase, e.g., `0.1-nextjs-scaffold.md`) and move to `docs/plans/completed/` when done
- Decision records in `docs/decisions/`, numbered sequentially (001-020 exist)
- Architecture docs in `docs/architecture/`
- Idea docs in `docs/ideas/` (deferred concepts, visions, critiques)
- Operational guides in `docs/guides/` (admin workflows, deployment procedures)

## Conventions
- Active Plans section header includes the current phase name in parens, e.g., "Active Plans (Phase 0: Foundation)"
- Plan descriptions are terse: key technologies/concepts only, no sentences
- Roadmap is a separate top-level file at `docs/roadmap.md`
- `docs/stack.md` lists the tech stack — one line per technology, terse

## Completed Plans
- 0.1: Next.js scaffold
- 0.2: Testing infrastructure (Vitest 4, Playwright, RTL, Node 22)
- 0.3: Prisma + Database (Prisma 6, PostgreSQL 16, Docker Compose, auth models)
- 0.4: Better Auth configuration (Better Auth 1.4, Google OAuth, middleware, login/dashboard pages)
- 0.5: tRPC setup (tRPC v11, React Query 5, Zod 4, superjson, first service + repository)
- 1.1: Data model, domain types, repository layer (Prisma schema, 10 repos, 9 test files)
- 1.1.1: Kysely migration (Prisma client -> Kysely queries, cuid2 IDs, mock-db helper)
- 1.2: LLM provider + conversation service (LLMProvider interface, Anthropic SDK, conversation service, system prompt)
- 1.3: tRPC routers (question, book, interview routers; ownership verification helpers)
- 1.4: Interview UI (books list, book interviews, interview session, dashboard "Continue Your Story" link — 4 PRs)
- 1.5: Insight extraction (JSON response parsing, parseWithRetry, insight injection as user message, getInsights/getBookInsights — 2 PRs)
- 1.6: Context window management (prompt organization, context service, summarization, insight injection — 3 PRs)
- 1.7: Email/password authentication (Resend integration, signup/forgot-password/reset-password flows, multi-method login page — 3 PRs, originally planned Apple Sign-In removed from scope)

## Code Organization Patterns
- **Prompts directory:** As of Plan 1.6 PR 1, all LLM prompts live in `src/prompts/` (not `src/services/`). This keeps prompt engineering visible and centralized.
  - `src/prompts/interviewer.ts` — interviewer system prompt (moved from `src/services/prompt.ts`)
  - `src/prompts/summarization.ts` — summarization prompt
  - Completed plans that reference `src/services/prompt.ts` should NOT be updated retroactively — they are historical records
- **Email provider (1.7 PR 1):** `src/lib/email.ts` abstracts email sending (Resend) — server-only guard, env var validation
- **Auth pages (1.7):** Signup, forgot-password, reset-password, email-sign-in-form at `src/app/(auth)/` — colocated tests, CSS modules, multi-method login layout
- **Dashboard UI patterns (Enhancement 8):** Card-based layout with styled borders, definition lists for structured data, status badges, responsive breakpoints at 640px, animated hover states on CTAs
- **App-shell layout (Enhancement 3):** Parent `(app)` layout uses `height: 100svh` + `overflow: hidden` on shell; `.main` is `flex: 1` + `overflow-y: auto` + `display: flex; flex-direction: column` (flex column required so child `flex: 1` fills space). Interview layout escapes parent padding with negative margins, adds `overflow: hidden` on its container to contain scroll within transcript.
- **User approval system (Enhancement 6):** User model extended with `approvalStatus` (PENDING/APPROVED/REJECTED) and `role` (USER/ADMIN). `approvedProcedure` middleware blocks unapproved users from expensive operations. Admin router at `src/server/routers/admin.ts` uses `adminProcedure` middleware. Admin UI at `src/app/(app)/admin/users/`. Guide at `docs/guides/admin-approval-flow.md`.
- **AI response JSON contract:** The interviewer's JSON response includes `response` (text), `insights` (array), and `shouldComplete` (boolean). `shouldComplete` enables AI-initiated interview completion — when true, the conversation service auto-completes the interview server-side.
- **Hidden messages (Enhancement 8):** Message model has `hidden` boolean (default false). Hidden messages are included in LLM context (`includeHidden: true` in context service) but excluded from user-facing queries (default behavior of `findByInterviewId`). Used for: (1) topic messages created by `startInterview` (hidden from transcript but visible to LLM), (2) redirect steering prompts injected by `conversationService.redirect()`. Transcript filters via `messages.filter(m => !m.hidden)` -- no positional hacks.
- **Conversation redirect (Enhancement 8, complete):** Backend: `conversationService.redirect()` injects a hidden USER message (REDIRECT_PROMPT), calls LLM, persists visible ASSISTANT response + insights. Intentionally ignores `shouldComplete`. Frontend: `redirectMutation` in interview-session, "Ask me something else" button in `InterviewInput`, disabled until user has sent at least one message. No optimistic user message — only ASSISTANT response added to state.
- **Interview decoupling (decouple-interviews plan, PR 1):** Interview model owns `topic` (plain text) instead of `questionId` FK. BookQuestion uses optional `interviewId` FK instead of `status` enum. `BookQuestionStatus` enum removed. `conversationService.startInterview(bookId, topic, userName)` — single entry point, no question/bookQuestion lookup. Router handles optional `bookQuestionId` linking.

## Lessons
- When a plan is marked Complete, move it from Active to Completed in INDEX.md and note that the file should also be moved from `active/` to `completed/` on disk
- `docs/stack.md` should be checked when runtime/tooling changes (e.g., Node version bump)
- Completed plan documents are historical records — don't update old file paths retroactively when code reorganizes
- Multi-PR plans stay in active/ until all PRs complete — update plan status in-place to track progress
- New architecture docs (like auth-patterns.md) get added to INDEX.md Architecture section
- When auth.ts gets new dependencies requiring env vars, ALL router tests break — testing-patterns.md documents the env stub pattern
- Enhancement plans track implementation details inline (design decisions, acceptance criteria) — when enhancement completes, mark criteria as checked and add "Status: Complete (PR pending)"
- New ADRs and idea docs are often created during enhancement work, not just during initial planning — check staged changes for new decision records
- Guides (`docs/guides/`) document operational workflows — typically created during feature implementation, not planning (e.g., admin approval flow, deployment procedures)
- When new tRPC middleware is added (like `approvedProcedure`), update both system-overview.md (document the middleware) and testing-patterns.md (show how to test it)
- Multi-PR enhancements track progress inline with "Status: In Progress (N of M PRs complete)" + summary of what each PR delivered — update acceptance criteria checkboxes as each PR completes
- UI-only changes (styling, confirmation dialogs, success messages) don't need architecture doc updates — enhancement plan tracking is sufficient
