Run tests and report results concisely.

Usage:
  /test                     — run all unit tests
  /test auth                — run tests matching "auth"
  /test e2e                 — run Playwright E2E tests
  /test coverage            — run tests with coverage
  /test src/app/(app)/sign-out-button.test.tsx — run a specific file

Dispatch this to the test-runner agent with the requested scope. If no argument is given, run all unit tests.
