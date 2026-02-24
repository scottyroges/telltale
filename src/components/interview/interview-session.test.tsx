import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InterviewSession } from "@/components/interview/interview-session";
import type { Message } from "@/domain/message";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockMutationOptions } = vi.hoisted(() => ({
  mockMutationOptions: vi.fn(),
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    interview: {
      sendMessage: {
        mutationOptions: mockMutationOptions,
      },
    },
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "Wrapper";
  return Wrapper;
}

describe("InterviewSession", () => {
  const initialMessages: Message[] = [
    {
      id: "1",
      interviewId: "interview-1",
      role: "USER",
      content: "System message",
      createdAt: new Date(),
    },
    {
      id: "2",
      interviewId: "interview-1",
      role: "ASSISTANT",
      content: "Hello! Tell me about your first job.",
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    mockMutationOptions.mockReset();
    vi.clearAllMocks();
    // Mock scrollTo
    HTMLElement.prototype.scrollTo = vi.fn();

    // Default mock returns mutation options with a no-op mutationFn
    mockMutationOptions.mockImplementation((opts) => ({
      mutationFn: async () => ({ content: "Default response" }),
      ...opts,
    }));
  });

  it("sends message and shows optimistic USER message immediately", async () => {
    const user = userEvent.setup();

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        questionPrompt="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "My first job was at a bakery.");
    await user.keyboard("{Enter}");

    // Optimistic user message should appear immediately
    await waitFor(() => {
      expect(
        screen.getByText("My first job was at a bakery.")
      ).toBeInTheDocument();
    });
  });

  it("shows ASSISTANT response after mutation succeeds", async () => {
    const user = userEvent.setup();

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        questionPrompt="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "I worked there for two years.");

    // Submit should trigger mutation
    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    // Wait for AI response to appear (default response)
    await waitFor(() => {
      expect(screen.getByText("Default response")).toBeInTheDocument();
    });
  });

  it("shows inline error on mutation failure", async () => {
    const user = userEvent.setup();

    // Mock mutation to fail
    mockMutationOptions.mockReset();
    mockMutationOptions.mockImplementation((opts) => ({
      ...opts,
      mutationFn: async () => {
        throw new Error("Network error");
      },
    }));

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        questionPrompt="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Test message");
    await user.keyboard("{Enter}");

    // Error message should be displayed inline (not using alert())
    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Try again.")).toBeInTheDocument();
    });

    // Input should be re-enabled after error
    expect(textarea).not.toBeDisabled();
  });

  it("clears error when sending a new message", async () => {
    const user = userEvent.setup();

    // First mutation fails
    let callCount = 0;
    mockMutationOptions.mockReset();
    mockMutationOptions.mockImplementation((opts) => ({
      ...opts,
      mutationFn: async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Network error");
        }
        return { content: "Success response" };
      },
    }));

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        questionPrompt="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "First message");
    await user.keyboard("{Enter}");

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Try again.")).toBeInTheDocument();
    });

    // Send another message (second call succeeds)
    await user.clear(textarea);
    await user.type(textarea, "Second message");
    await user.keyboard("{Enter}");

    // Error should be cleared
    await waitFor(() => {
      expect(
        screen.queryByText("Something went wrong. Try again.")
      ).not.toBeInTheDocument();
    });

    // Success response should appear
    await waitFor(() => {
      expect(screen.getByText("Success response")).toBeInTheDocument();
    });

    // Input should be re-enabled after successful retry
    expect(textarea).not.toBeDisabled();
  });

  it("shows user message optimistically before server responds", async () => {
    const user = userEvent.setup();

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        questionPrompt="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Test message");
    await user.keyboard("{Enter}");

    // Message should appear immediately (optimistic update)
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("hides input when status === 'COMPLETE'", () => {
    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        questionPrompt="What was your first job?"
        status="COMPLETE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    expect(
      screen.queryByPlaceholderText("Share your story...")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send/i })).not.toBeInTheDocument();
  });

  it("shows thinking indicator while isWaitingForResponse", async () => {
    const user = userEvent.setup();

    // Make mutation hang to keep waiting state
    mockMutationOptions.mockImplementationOnce((opts) => ({
      mutationFn: () => new Promise(() => {}), // Never resolves
      ...opts,
    }));

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        questionPrompt="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Test");
    await user.keyboard("{Enter}");

    // Thinking indicator should appear (check for dots)
    await waitFor(() => {
      const dots = screen.getAllByText(".", { exact: false });
      expect(dots.length).toBeGreaterThan(0);
    });
  });

  it("shows message was sent successfully", async () => {
    const user = userEvent.setup();

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        questionPrompt="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Test message");
    await user.keyboard("{Enter}");

    // User message should appear
    expect(screen.getByText("Test message")).toBeInTheDocument();

    // Eventually AI response appears (using default mock)
    await waitFor(() => {
      expect(screen.getByText("Default response")).toBeInTheDocument();
    });
  });

  it("shows back link to question list", () => {
    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-123"
        questionPrompt="What was your first job?"
        status="ACTIVE"
        initialMessages={[]}
      />,
      { wrapper: createWrapper() }
    );

    const backLink = screen.getByRole("link", { name: /questions/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/book/book-123/interviews");
  });

  it("back link navigates to correct book", () => {
    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="different-book-456"
        questionPrompt="Tell me about your childhood"
        status="ACTIVE"
        initialMessages={[]}
      />,
      { wrapper: createWrapper() }
    );

    const backLink = screen.getByRole("link", { name: /questions/i });
    expect(backLink).toHaveAttribute("href", "/book/different-book-456/interviews");
  });
});
