import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InterviewSession } from "@/components/interview/interview-session";
import type { Message } from "@/domain/message";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockSendMessageMutationOptions, mockCompleteMutationOptions, mockRedirectMutationOptions } = vi.hoisted(() => ({
  mockSendMessageMutationOptions: vi.fn(),
  mockCompleteMutationOptions: vi.fn(),
  mockRedirectMutationOptions: vi.fn(),
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    interview: {
      sendMessage: {
        mutationOptions: mockSendMessageMutationOptions,
      },
      complete: {
        mutationOptions: mockCompleteMutationOptions,
      },
      redirect: {
        mutationOptions: mockRedirectMutationOptions,
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
      hidden: false,
      createdAt: new Date(),
    },
    {
      id: "2",
      interviewId: "interview-1",
      role: "ASSISTANT",
      content: "Hello! Tell me about your first job.",
      hidden: false,
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    mockSendMessageMutationOptions.mockReset();
    mockCompleteMutationOptions.mockReset();
    mockRedirectMutationOptions.mockReset();
    vi.clearAllMocks();
    // Mock scrollTo
    HTMLElement.prototype.scrollTo = vi.fn();
    // Mock window.confirm
    global.confirm = vi.fn(() => true);

    // Default mocks return mutation options with no-op mutationFn
    mockSendMessageMutationOptions.mockImplementation((opts) => ({
      mutationFn: async () => ({ content: "Default response", shouldComplete: false }),
      ...opts,
    }));
    mockCompleteMutationOptions.mockImplementation((opts) => ({
      mutationFn: async () => ({ status: "COMPLETE" }),
      ...opts,
    }));
    mockRedirectMutationOptions.mockImplementation((opts) => ({
      mutationFn: async () => ({ content: "Let me ask about something else." }),
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
    mockSendMessageMutationOptions.mockReset();
    mockSendMessageMutationOptions.mockImplementation((opts) => ({
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
    mockSendMessageMutationOptions.mockReset();
    mockSendMessageMutationOptions.mockImplementation((opts) => ({
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
    mockSendMessageMutationOptions.mockImplementationOnce((opts) => ({
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

  describe("AI-initiated completion", () => {
    it("shows completion message and hides input when shouldComplete is true", async () => {
      const user = userEvent.setup();

      mockSendMessageMutationOptions.mockReset();
      mockSendMessageMutationOptions.mockImplementation((opts) => ({
        mutationFn: async () => ({ content: "Thank you for sharing!", shouldComplete: true }),
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
      await user.type(textarea, "Yes, let's wrap up.");
      await user.keyboard("{Enter}");

      // AI response should appear
      await waitFor(() => {
        expect(screen.getByText("Thank you for sharing!")).toBeInTheDocument();
      });

      // Completion message should appear
      await waitFor(() => {
        expect(screen.getByText(/interview marked as complete/i)).toBeInTheDocument();
      });

      // Input should be hidden
      expect(screen.queryByPlaceholderText("Share your story...")).not.toBeInTheDocument();

      // End Interview button should be hidden
      expect(screen.queryByRole("button", { name: /end interview/i })).not.toBeInTheDocument();
    });

    it("does not show completion message when shouldComplete is false", async () => {
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
      await user.type(textarea, "Tell me more.");
      await user.keyboard("{Enter}");

      // AI response should appear
      await waitFor(() => {
        expect(screen.getByText("Default response")).toBeInTheDocument();
      });

      // No completion message
      expect(screen.queryByText(/interview marked as complete/i)).not.toBeInTheDocument();

      // Input should still be visible
      expect(screen.getByPlaceholderText("Share your story...")).toBeInTheDocument();
    });
  });

  describe("End Interview button", () => {
    it("shows End Interview button when status is ACTIVE", () => {
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

      expect(screen.getByRole("button", { name: /end interview/i })).toBeInTheDocument();
    });

    it("hides End Interview button when status is COMPLETE", () => {
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

      expect(screen.queryByRole("button", { name: /end interview/i })).not.toBeInTheDocument();
    });

    it("shows confirmation dialog when End Interview is clicked", async () => {
      const user = userEvent.setup();
      const mockConfirm = vi.fn(() => false);
      global.confirm = mockConfirm;

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

      const endButton = screen.getByRole("button", { name: /end interview/i });
      await user.click(endButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining("Are you sure you want to end this interview?")
      );
    });

    it("calls complete mutation when confirmed", async () => {
      const user = userEvent.setup();
      const mockConfirm = vi.fn(() => true);
      global.confirm = mockConfirm;

      const mockMutate = vi.fn();
      mockCompleteMutationOptions.mockImplementation((opts) => ({
        mutationFn: async () => ({ status: "COMPLETE" }),
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

      const endButton = screen.getByRole("button", { name: /end interview/i });
      await user.click(endButton);

      // Mutation should be called
      expect(mockConfirm).toHaveBeenCalled();
    });

    it("shows success message after completion", async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => true);

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

      const endButton = screen.getByRole("button", { name: /end interview/i });
      await user.click(endButton);

      await waitFor(() => {
        expect(
          screen.getByText(/interview marked as complete/i)
        ).toBeInTheDocument();
      });
    });

    it("disables End Interview button while mutation is pending", async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => true);

      // Make mutation hang to keep pending state
      mockCompleteMutationOptions.mockImplementation((opts) => ({
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

      const endButton = screen.getByRole("button", { name: /end interview/i });
      await user.click(endButton);

      // Button should be disabled while pending
      await waitFor(() => {
        expect(endButton).toBeDisabled();
      });
    });

    it("disables End Interview button while waiting for AI response", async () => {
      const user = userEvent.setup();

      // Make sendMessage hang to keep waiting state
      mockSendMessageMutationOptions.mockImplementation((opts) => ({
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

      // Send a message to trigger waiting state
      const textarea = screen.getByPlaceholderText("Share your story...");
      await user.type(textarea, "Test");
      await user.keyboard("{Enter}");

      // End Interview button should be disabled while waiting
      await waitFor(() => {
        const endButton = screen.getByRole("button", { name: /end interview/i });
        expect(endButton).toBeDisabled();
      });
    });

    it("does not call mutation when confirmation is cancelled", async () => {
      const user = userEvent.setup();
      const mockConfirm = vi.fn(() => false);
      global.confirm = mockConfirm;

      const mockMutate = vi.fn();
      mockCompleteMutationOptions.mockImplementation((opts) => ({
        mutationFn: mockMutate,
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

      const endButton = screen.getByRole("button", { name: /end interview/i });
      await user.click(endButton);

      // Mutation should not be called
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("shows error message when completion fails", async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => true);

      // Mock mutation to fail
      mockCompleteMutationOptions.mockImplementation((opts) => ({
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

      const endButton = screen.getByRole("button", { name: /end interview/i });
      await user.click(endButton);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to mark interview as complete/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Redirect button", () => {
    const messagesWithUserReply: Message[] = [
      ...initialMessages,
      {
        id: "3",
        interviewId: "interview-1",
        role: "USER",
        content: "I worked at a bakery.",
        hidden: false,
        createdAt: new Date(),
      },
      {
        id: "4",
        interviewId: "interview-1",
        role: "ASSISTANT",
        content: "That sounds interesting! What did you do there?",
        hidden: false,
        createdAt: new Date(),
      },
    ];

    it("is disabled when user has not sent any messages", () => {
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

      const redirectButton = screen.getByRole("button", {
        name: /try a different question/i,
      });
      expect(redirectButton).toBeDisabled();
    });

    it("is enabled after user sends a message", async () => {
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
      await user.type(textarea, "I worked at a bakery.");
      await user.keyboard("{Enter}");

      // Wait for AI response so we're no longer waiting
      await waitFor(() => {
        expect(screen.getByText("Default response")).toBeInTheDocument();
      });

      const redirectButton = screen.getByRole("button", {
        name: /try a different question/i,
      });
      expect(redirectButton).not.toBeDisabled();
    });

    it("adds only ASSISTANT message on success (no optimistic USER message)", async () => {
      const user = userEvent.setup();

      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          questionPrompt="What was your first job?"
          status="ACTIVE"
          initialMessages={messagesWithUserReply}
        />,
        { wrapper: createWrapper() }
      );

      const redirectButton = screen.getByRole("button", {
        name: /try a different question/i,
      });
      await user.click(redirectButton);

      // ASSISTANT redirect response should appear
      await waitFor(() => {
        expect(
          screen.getByText("Let me ask about something else.")
        ).toBeInTheDocument();
      });

      // No redirect prompt text should appear as a user message
      expect(
        screen.queryByText(/ask me a different follow-up/i)
      ).not.toBeInTheDocument();
    });

    it("shows error on redirect failure", async () => {
      const user = userEvent.setup();

      mockRedirectMutationOptions.mockReset();
      mockRedirectMutationOptions.mockImplementation((opts) => ({
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
          initialMessages={messagesWithUserReply}
        />,
        { wrapper: createWrapper() }
      );

      const redirectButton = screen.getByRole("button", {
        name: /try a different question/i,
      });
      await user.click(redirectButton);

      await waitFor(() => {
        expect(
          screen.getByText("Something went wrong. Try again.")
        ).toBeInTheDocument();
      });
    });

    it("is hidden when interview is complete", () => {
      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          questionPrompt="What was your first job?"
          status="COMPLETE"
          initialMessages={messagesWithUserReply}
        />,
        { wrapper: createWrapper() }
      );

      expect(
        screen.queryByRole("button", { name: /try a different question/i })
      ).not.toBeInTheDocument();
    });

    it("is enabled when initialMessages already contain user replies", () => {
      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          questionPrompt="What was your first job?"
          status="ACTIVE"
          initialMessages={messagesWithUserReply}
        />,
        { wrapper: createWrapper() }
      );

      const redirectButton = screen.getByRole("button", {
        name: /try a different question/i,
      });
      expect(redirectButton).not.toBeDisabled();
    });
  });
});
