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

When implementing optimistic updates with mutations, update local state immediately and let the mutation callbacks handle success/error:

```typescript
const [messages, setMessages] = useState(initialMessages);

const sendMessage = useMutation(
  trpc.interview.sendMessage.mutationOptions({
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        role: "ASSISTANT",
        content: response.content,
        // ... other fields
      }]);
    },
    onError: () => {
      // Remove the optimistic message
      setMessages(prev => prev.slice(0, -1));
    },
  })
);

const handleSend = (content: string) => {
  // Add optimistic message immediately
  setMessages(prev => [...prev, {
    role: "USER",
    content,
    // ... other fields
  }]);

  // Trigger mutation
  sendMessage.mutate({ content });
};
```

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
