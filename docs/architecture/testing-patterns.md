# Testing Patterns

This document provides detailed examples and explanations for testing patterns in the Telltale project.

## General Patterns

### Test Imports Follow Production Patterns

Tests should follow the same import patterns as production code.

**✅ Correct:**

```typescript
import type { Message } from "@/domain/message";
import type { InterviewStatus } from "@/domain/interview";
```

**❌ Wrong:**

```typescript
// Tests should not use barrel exports either
import type { Message, InterviewStatus } from "@/domain";
```

**Why:**
- Ensures tests remain valid when refactoring production code
- Tests catch import issues early
- Maintains consistency between test and production environments

## Frontend Testing Patterns

### Test Visible Behavior

Write tests that verify what users see and experience, not internal implementation details.

**✅ Good Tests:**

```typescript
it("shows user message after clicking send", async () => {
  render(<InterviewSession {...props} />);

  const textarea = screen.getByPlaceholderText("Share your story...");
  await user.type(textarea, "Hello");

  const sendButton = screen.getByRole("button", { name: /send/i });
  await user.click(sendButton);

  expect(screen.getByText("Hello")).toBeInTheDocument();
});

it("disables input while sending", async () => {
  render(<InterviewSession {...props} />);

  const textarea = screen.getByPlaceholderText("Share your story...");
  await user.type(textarea, "Test");
  await user.keyboard("{Enter}");

  // Eventually the mutation completes and shows a response
  await waitFor(() => {
    expect(screen.getByText(/response/i)).toBeInTheDocument();
  });
});
```

**❌ Brittle Tests:**

```typescript
// Don't test CSS module class names - they're transformed
it("applies correct CSS class", () => {
  const { container } = render(<Message role="USER" content="Hi" />);
  const message = container.querySelector(".messageUser");
  expect(message).toBeInTheDocument(); // Will fail - class name is hashed
});

// Don't test exact callback sequences
it("calls onSuccess then updates state in exact order", async () => {
  // This tests implementation details, not user experience
  expect(mockOnSuccess).toHaveBeenCalledBefore(mockStateUpdate);
});

// Don't mock internal state transitions
it("sets isWaitingForResponse to true exactly when mutation starts", () => {
  // Too coupled to implementation
});
```

**Why:**
- User-facing tests are resilient to refactoring
- CSS module class names are hashed in production
- Internal state is an implementation detail
- Callback timing is unreliable in tests

## Testing with React Query

When testing components that use `useMutation`, provide a `QueryClientProvider` wrapper:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  Wrapper.displayName = "Wrapper";

  return Wrapper;
}

// Use in tests
render(<MyComponent />, { wrapper: createWrapper() });
```

## Backend Testing Patterns

### Environment Directive

Backend tests (routers, services, repositories) run in Node environment. Add the directive at the top of the file:

```typescript
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
```

**Why:**
- Backend code doesn't need DOM/browser APIs
- Node environment is faster for backend tests
- Prevents accidental browser API usage in backend code

### Mocking server-only Modules

Tests must mock the `server-only` package to import server code:

```typescript
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Now you can import server modules
import { myServerFunction } from "@/server/my-module";
```

**Why:**
- The `server-only` package throws in non-server environments
- Tests run in Node but aren't considered "server" by the package
- Empty mock allows imports to succeed

### Hoisted Mock Functions

Use `vi.hoisted()` for mock functions referenced in `vi.mock()` factory:

```typescript
// ✅ Correct - hoisted
const mockCreate = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/book.repository", () => ({
  bookRepository: {
    create: mockCreate,
  },
}));

// ❌ Wrong - factory is hoisted, but variable isn't
const mockCreate = vi.fn(); // Not hoisted!
vi.mock("@/repositories/book.repository", () => ({
  bookRepository: {
    create: mockCreate, // ReferenceError at runtime
  },
}));
```

**Why:**
- `vi.mock()` factories are hoisted to the top of the file
- Variables must also be hoisted to be accessible in the factory
- `vi.hoisted()` ensures proper execution order

### Testing Layers

Different layers require different mocking strategies:

**Router tests** (thin wrappers):
```typescript
// Mock repositories that the router delegates to
const mockBookCreate = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/book.repository", () => ({
  bookRepository: { create: mockBookCreate },
}));

// Test router delegates correctly
it("create creates book with userId and title", async () => {
  mockBookCreate.mockResolvedValue({ id: "b1", title: "My Book" });
  const result = await caller.book.create({ title: "My Book" });

  expect(mockBookCreate).toHaveBeenCalledWith({
    userId: "test-user",
    title: "My Book",
  });
  expect(result).toEqual({ id: "b1", title: "My Book" });
});
```

**Service tests** (business logic):
```typescript
// Mock repositories AND external dependencies
const mockLlmGenerate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/llm", () => ({
  llmProvider: { generateResponse: mockLlmGenerate },
}));

const mockMessageCreate = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/message.repository", () => ({
  messageRepository: { create: mockMessageCreate },
}));

// Test service orchestrates correctly
it("sends message and returns AI response", async () => {
  mockLlmGenerate.mockResolvedValue({ content: "AI response" });
  mockMessageCreate.mockResolvedValue({ id: "msg1" });

  const result = await conversationService.sendMessage({
    interviewId: "i1",
    content: "User message",
  });

  expect(mockMessageCreate).toHaveBeenCalledTimes(2); // User + AI
  expect(result.content).toBe("AI response");
});
```

**Repository tests** (data access):
```typescript
// Mock the database and query builder
import { createMockDb } from "../helpers/mock-db";

vi.mock("server-only", () => ({}));

const { db, executeTakeFirstOrThrow } = createMockDb();
vi.mock("@/lib/db", () => ({ db }));

// Test repository builds correct query
it("creates a book with IN_PROGRESS status", async () => {
  executeTakeFirstOrThrow.mockResolvedValue({
    id: "b1",
    title: "My Book",
    status: "IN_PROGRESS",
  });

  const result = await bookRepository.create({
    userId: "u1",
    title: "My Book",
  });

  expect(result.status).toBe("IN_PROGRESS");
});
```

### Dynamic Imports After Mocks

Import the module under test AFTER setting up mocks:

```typescript
describe("myService", () => {
  let myService: Awaited<typeof import("@/services/my-service")>["myService"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/services/my-service");
    myService = mod.myService;
  });

  it("does something", async () => {
    const result = await myService.doSomething();
    // ...
  });
});
```

**Why:**
- Mocks must be set up before importing the module
- Dynamic import in `beforeEach` ensures fresh module state per test
- `vi.clearAllMocks()` resets mock call counts between tests

### Environment Variable Stubs for Transitive Dependencies

When modifying `src/server/auth.ts`, remember that it's imported by the tRPC context, which is imported by every router test. Any new dependencies in `auth.ts` that validate environment variables will break ALL router tests.

**Pattern:**

If you add a dependency to `auth.ts` that requires env vars (e.g., `@/lib/email`), you must add env stubs to:
- All router tests (`tests/server/routers/*.test.ts`)
- Auth route test (`tests/app/api/auth/route.test.ts`)

```typescript
// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { db } = (await import("../../helpers/mock-db")).createMockDb();
vi.mock("@/lib/db", () => ({ db }));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("RESEND_API_KEY", "test-resend-key");
vi.stubEnv("EMAIL_FROM", "test@example.com");
// ^ Add stubs for any env vars required by auth.ts dependencies
```

**For tests that directly import `auth.ts`:**

Mock modules with environment validation instead of stubbing vars:

```typescript
// tests/server/auth.test.ts
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
// No need for RESEND_API_KEY or EMAIL_FROM - the module is mocked
```

**Why:**
- `auth.ts` → tRPC context → every router test
- Environment validation happens at module load time
- Mocking the module prevents instantiation entirely
- Stubbing env vars satisfies validation when module must load
