# Frontend Patterns

This document provides detailed examples and explanations for the frontend patterns outlined in CLAUDE.md.

## Client Component Mutations

### Use `useMutation` with tRPC

Client components should use `useMutation` from `@tanstack/react-query` with `trpc.*.mutationOptions()`. Never call `mutationFn` directly or use async/await in handlers.

**✅ Correct:**

```typescript
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

export function MyComponent() {
  const trpc = useTRPC();

  const createBook = useMutation(
    trpc.book.create.mutationOptions({
      onSuccess: (data) => {
        router.push(`/book/${data.id}`);
      },
      onError: (error) => {
        console.error("Failed:", error);
      },
    })
  );

  const handleSubmit = () => {
    createBook.mutate({ title: "My Book" });
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={createBook.isPending}
    >
      {createBook.isPending ? "Creating..." : "Create"}
    </button>
  );
}
```

**❌ Wrong:**

```typescript
// Don't call mutationFn directly
const handleSubmit = async () => {
  const response = await mutation.mutationFn({ title: "My Book" });
  // This breaks React Query's mutation lifecycle
};

// Don't use async/await with mutate
const handleSubmit = async () => {
  await mutation.mutate({ title: "My Book" }); // mutate returns void
};
```

**Why:**
- `useMutation` manages loading states, errors, and retries
- `mutationOptions` provides the proper tRPC integration
- The mutation callbacks (`onSuccess`, `onError`) handle side effects correctly
- Direct `mutationFn` calls bypass React Query's caching and state management

## Server Component Data Fetching

### Await `serverTRPC()` Once

Server components should await `serverTRPC()` once and reuse the result. Don't await it multiple times.

**✅ Correct:**

```typescript
import { serverTRPC } from "@/lib/trpc/server";

export default async function BookPage({ params }: PageProps) {
  const { bookId } = await params;
  const trpc = await serverTRPC();

  // Fetch multiple resources using the same trpc instance
  const [book, interviews] = await Promise.all([
    trpc.book.getById({ id: bookId }),
    trpc.interview.list({ bookId }),
  ]);

  if (!book) {
    notFound();
  }

  return <BookDetails book={book} interviews={interviews} />;
}
```

**❌ Wrong:**

```typescript
// Don't await serverTRPC() multiple times
export default async function BookPage({ params }: PageProps) {
  const { bookId } = await params;

  const book = await serverTRPC().book.getById({ id: bookId });
  const interviews = await serverTRPC().interview.list({ bookId });

  // serverTRPC() returns a Promise, so this creates unnecessary overhead
}
```

**Why:**
- `serverTRPC()` sets up the tRPC context (auth, headers, etc.)
- Awaiting once and reusing is more efficient
- Cleaner, more readable code

## Type Imports

### Import from Specific Domain Files

Import types from their specific domain files, not from a barrel export. There is no `src/domain/index.ts`.

**✅ Correct:**

```typescript
import type { Message } from "@/domain/message";
import type { InterviewStatus } from "@/domain/interview";
import type { Book } from "@/domain/book";
```

**❌ Wrong:**

```typescript
// This will cause build errors - no barrel export exists
import type { Message, InterviewStatus, Book } from "@/domain";
```

**Why:**
- Explicit imports make dependencies clear
- No barrel export file to maintain
- Tree-shaking works better with direct imports

## Testing

For testing patterns and examples, see [Testing Patterns](./testing-patterns.md).

## Common Pitfalls

### Optimistic Updates

When implementing optimistic updates with mutations, update local state immediately and handle success/error in the handler.

For standard mutations, use `useMutation` with `mutationOptions`:

```typescript
const trpc = useTRPC();
const createBook = useMutation(
  trpc.book.create.mutationOptions({
    onSuccess: (data) => router.push(`/book/${data.id}`),
    onError: (error) => console.error("Failed:", error),
  })
);
```

### Streaming Mutations

For mutations that return a stream (async generators on the server), use `useTRPCClient` instead of `useMutation`. The tRPC client's `.mutate()` returns an async iterable that yields chunks:

```typescript
const trpcClient = useTRPCClient();

const handleSend = async (content: string) => {
  // Optimistic user message
  setMessages(prev => [...prev, { role: "USER", content, ... }]);
  setIsWaitingForResponse(true);

  try {
    const stream = await trpcClient.interview.sendMessage.mutate({ interviewId, content });
    let accumulated = "";
    for await (const chunk of stream) {
      if (chunk.type === "text") {
        accumulated += chunk.text;
        setStreamingContent(accumulated);
      } else if (chunk.type === "done") {
        setMessages(prev => [...prev, { role: "ASSISTANT", content: accumulated, ... }]);
        setStreamingContent(null);
        setIsWaitingForResponse(false);
      }
    }
  } catch (error) {
    // Remove optimistic message, show error
    setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
    setIsWaitingForResponse(false);
    setError("Something went wrong. Try again.");
  }
};
```

**Why `useTRPCClient` instead of `useMutation`:**
- `useMutation` expects a single resolved value, not an async iterable
- `useTRPCClient` gives direct access to the underlying tRPC client, which supports iterating over generator procedure results
- Streaming state (accumulated text, waiting indicator) is managed manually since React Query doesn't model incremental responses

### Auto-scroll Behavior

When auto-scrolling on new messages, check if the user is already near the bottom to avoid interrupting their reading:

```typescript
const AUTOSCROLL_THRESHOLD_PX = 100;

useEffect(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  const isNearBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight <
    AUTOSCROLL_THRESHOLD_PX;

  if (messages.length > prevMessagesLengthRef.current && isNearBottom) {
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }

  prevMessagesLengthRef.current = messages.length;
}, [messages]);
```

### Form Handling with Enter Key

Handle Enter vs Shift+Enter correctly in textareas:

```typescript
const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // Prevent newline
    handleSubmit();
  }
  // Shift+Enter allows default behavior (newline)
};
```

## Layout Patterns

### App-Shell Layout with Container Scroll

Telltale uses an app-shell pattern where the authenticated app area (`(app)` route group) is locked to viewport height with internal scroll containers. This provides stable layout on mobile Safari and enables clean contained-scroll patterns for features like the interview session.

**Parent layout (`src/app/(app)/layout.module.css`):**

```css
.shell {
  height: 100svh;       /* Lock to viewport height */
  overflow: hidden;     /* No overflow at shell level */
}

.main {
  flex: 1;
  min-height: 0;        /* Allow flex child to shrink */
  overflow-y: auto;     /* Main scroll container */
  padding: 2rem 1.5rem;
  display: flex;         /* Required for child flex: 1 to work */
  flex-direction: column;
}
```

**Key principles:**
- All pages under `(app)` scroll within `.main`, not at the viewport level
- `.main` must be a flex column container so child layouts' `flex: 1` actually fills available space
- Viewport units (`100svh`) are only used at the shell level, not in child components
- Child layouts use percentage-based heights relative to their parent
- This avoids mobile Safari viewport unit bugs (address bar show/hide)

**Full-bleed child layouts:**

When a child route needs to escape the parent's padding for full-bleed layout:

```css
.container {
  margin: -2rem -1.5rem;  /* Negate parent padding */
  flex: 1;
  min-height: 0;
  overflow: hidden;        /* Contain scroll within children, not this wrapper */
}
```

**Interview layout example:**

The interview session uses this pattern to create sticky header + scrollable transcript + fixed input:

```css
.sessionContainer {
  height: 100%;           /* Fill parent */
  overflow: hidden;       /* Contain children */
}

.header {
  position: sticky;       /* Stays visible during scroll */
  top: 0;
  z-index: 1;
}

.transcript {
  flex: 1;
  overflow-y: auto;       /* Scrollable area */
}

.inputContainer {
  /* Normal flow, always at bottom due to parent overflow: hidden */
}
```

**Why sticky over fixed for header:**
- Works within contained scroll (no viewport positioning needed)
- No padding compensation needed (stays in document flow)
- Simpler z-index management
- More stable on mobile Safari

**See also:** ADR 019 for full rationale and alternatives considered.
