import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InterviewSession } from "@/components/interview/interview-session";
import type { Message } from "@/domain/message";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockCompleteMutationOptions, mockTRPCClient } = vi.hoisted(() => ({
  mockCompleteMutationOptions: vi.fn(),
  mockTRPCClient: {
    interview: {
      sendMessage: { mutate: vi.fn() },
      redirect: { mutate: vi.fn() },
    },
  },
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    interview: {
      complete: {
        mutationOptions: mockCompleteMutationOptions,
      },
    },
  }),
  useTRPCClient: () => mockTRPCClient,
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

async function* mockStreamChunks(content: string, shouldComplete = false) {
  for (const word of content.split(" ")) {
    yield { type: "text" as const, text: word + " " };
  }
  yield { type: "done" as const, shouldComplete };
}

describe("InterviewSession", () => {
  const initialMessages: Message[] = [
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
    mockCompleteMutationOptions.mockReset();
    mockTRPCClient.interview.sendMessage.mutate.mockReset();
    mockTRPCClient.interview.redirect.mutate.mockReset();
    vi.clearAllMocks();
    HTMLElement.prototype.scrollTo = vi.fn();
    global.confirm = vi.fn(() => true);

    // Default mocks: sendMessage returns a streaming generator
    mockTRPCClient.interview.sendMessage.mutate.mockImplementation(
      () => mockStreamChunks("Default response"),
    );
    mockTRPCClient.interview.redirect.mutate.mockImplementation(
      () => mockStreamChunks("Let me ask about something else."),
    );
    mockCompleteMutationOptions.mockImplementation((opts) => ({
      mutationFn: async () => ({ status: "COMPLETE" }),
      ...opts,
    }));
  });

  it("sends message and shows optimistic USER message immediately", async () => {
    const user = userEvent.setup();

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        topic="What was your first job?"
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

  it("shows ASSISTANT response after streaming completes", async () => {
    const user = userEvent.setup();

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        topic="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "I worked there for two years.");

    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    // Wait for streamed AI response to appear
    await waitFor(() => {
      expect(screen.getByText("Default response")).toBeInTheDocument();
    });
  });

  it("shows inline error on mutation failure", async () => {
    const user = userEvent.setup();

    mockTRPCClient.interview.sendMessage.mutate.mockRejectedValue(
      new Error("Network error"),
    );

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        topic="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Test message");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Try again.")).toBeInTheDocument();
    });

    // Input should be re-enabled after error
    expect(textarea).not.toBeDisabled();
  });

  it("clears error when sending a new message", async () => {
    const user = userEvent.setup();

    // First mutation fails, second succeeds
    let callCount = 0;
    mockTRPCClient.interview.sendMessage.mutate.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("Network error"));
      }
      return mockStreamChunks("Success response");
    });

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        topic="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "First message");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Something went wrong. Try again.")).toBeInTheDocument();
    });

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

    expect(textarea).not.toBeDisabled();
  });

  it("shows user message optimistically before server responds", async () => {
    const user = userEvent.setup();

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        topic="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Test message");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("hides input when status === 'COMPLETE'", () => {
    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        topic="What was your first job?"
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

  it("shows thinking indicator while waiting for first streaming token", async () => {
    const user = userEvent.setup();

    // Make mutation hang to keep waiting state (before any chunks arrive)
    mockTRPCClient.interview.sendMessage.mutate.mockReturnValue(
      new Promise(() => {}), // Never resolves
    );

    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        topic="What was your first job?"
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
        topic="What was your first job?"
        status="ACTIVE"
        initialMessages={initialMessages}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Test message");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Test message")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Default response")).toBeInTheDocument();
    });
  });

  it("shows back link to question list", () => {
    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-123"
        topic="What was your first job?"
        status="ACTIVE"
        initialMessages={[]}
      />,
      { wrapper: createWrapper() }
    );

    const backLink = screen.getByRole("link", { name: /back/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/book/book-123/interviews");
  });

  it("shows Tips link pointing to /guide that opens in a new tab", () => {
    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="book-1"
        topic="What was your first job?"
        status="ACTIVE"
        initialMessages={[]}
      />,
      { wrapper: createWrapper() }
    );

    const tipsLink = screen.getByRole("link", { name: /tips/i });
    expect(tipsLink).toHaveAttribute("href", "/guide");
    expect(tipsLink).toHaveAttribute("target", "_blank");
  });

  it("back link navigates to correct book", () => {
    render(
      <InterviewSession
        interviewId="interview-1"
        bookId="different-book-456"
        topic="Tell me about your childhood"
        status="ACTIVE"
        initialMessages={[]}
      />,
      { wrapper: createWrapper() }
    );

    const backLink = screen.getByRole("link", { name: /back/i });
    expect(backLink).toHaveAttribute("href", "/book/different-book-456/interviews");
  });

  describe("AI-initiated completion", () => {
    it("shows completion message and hides input when shouldComplete is true", async () => {
      const user = userEvent.setup();

      mockTRPCClient.interview.sendMessage.mutate.mockImplementation(
        () => mockStreamChunks("Thank you for sharing!", true),
      );

      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={initialMessages}
        />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText("Share your story...");
      await user.type(textarea, "Yes, let's wrap up.");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("Thank you for sharing!")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/interview marked as complete/i)).toBeInTheDocument();
      });

      expect(screen.queryByPlaceholderText("Share your story...")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /end interview/i })).not.toBeInTheDocument();
    });

    it("does not show completion message when shouldComplete is false", async () => {
      const user = userEvent.setup();

      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={initialMessages}
        />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText("Share your story...");
      await user.type(textarea, "Tell me more.");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("Default response")).toBeInTheDocument();
      });

      expect(screen.queryByText(/interview marked as complete/i)).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Share your story...")).toBeInTheDocument();
    });
  });

  describe("End Interview button", () => {
    it("shows End Interview button when status is ACTIVE", () => {
      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          topic="What was your first job?"
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
          topic="What was your first job?"
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
          topic="What was your first job?"
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

      mockCompleteMutationOptions.mockImplementation((opts) => ({
        mutationFn: async () => ({ status: "COMPLETE" }),
        ...opts,
      }));

      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={initialMessages}
        />,
        { wrapper: createWrapper() }
      );

      const endButton = screen.getByRole("button", { name: /end interview/i });
      await user.click(endButton);

      expect(mockConfirm).toHaveBeenCalled();
    });

    it("shows success message after completion", async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => true);

      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          topic="What was your first job?"
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

      mockCompleteMutationOptions.mockImplementation((opts) => ({
        mutationFn: () => new Promise(() => {}),
        ...opts,
      }));

      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={initialMessages}
        />,
        { wrapper: createWrapper() }
      );

      const endButton = screen.getByRole("button", { name: /end interview/i });
      await user.click(endButton);

      await waitFor(() => {
        expect(endButton).toBeDisabled();
      });
    });

    it("disables End Interview button while waiting for AI response", async () => {
      const user = userEvent.setup();

      mockTRPCClient.interview.sendMessage.mutate.mockReturnValue(
        new Promise(() => {}),
      );

      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={initialMessages}
        />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText("Share your story...");
      await user.type(textarea, "Test");
      await user.keyboard("{Enter}");

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
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={initialMessages}
        />,
        { wrapper: createWrapper() }
      );

      const endButton = screen.getByRole("button", { name: /end interview/i });
      await user.click(endButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("shows error message when completion fails", async () => {
      const user = userEvent.setup();
      global.confirm = vi.fn(() => true);

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
          topic="What was your first job?"
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
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={initialMessages}
        />,
        { wrapper: createWrapper() }
      );

      const redirectButton = screen.getByRole("button", {
        name: /ask me something else/i,
      });
      expect(redirectButton).toBeDisabled();
    });

    it("is enabled after user sends a message", async () => {
      const user = userEvent.setup();

      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={initialMessages}
        />,
        { wrapper: createWrapper() }
      );

      const textarea = screen.getByPlaceholderText("Share your story...");
      await user.type(textarea, "I worked at a bakery.");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("Default response")).toBeInTheDocument();
      });

      const redirectButton = screen.getByRole("button", {
        name: /ask me something else/i,
      });
      expect(redirectButton).not.toBeDisabled();
    });

    it("adds only ASSISTANT message on success (no optimistic USER message)", async () => {
      const user = userEvent.setup();

      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={messagesWithUserReply}
        />,
        { wrapper: createWrapper() }
      );

      const redirectButton = screen.getByRole("button", {
        name: /ask me something else/i,
      });
      await user.click(redirectButton);

      await waitFor(() => {
        expect(
          screen.getByText("Let me ask about something else.")
        ).toBeInTheDocument();
      });

      expect(
        screen.queryByText(/ask me a different follow-up/i)
      ).not.toBeInTheDocument();
    });

    it("shows error on redirect failure", async () => {
      const user = userEvent.setup();

      mockTRPCClient.interview.redirect.mutate.mockRejectedValue(
        new Error("Network error"),
      );

      render(
        <InterviewSession
          interviewId="interview-1"
          bookId="book-1"
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={messagesWithUserReply}
        />,
        { wrapper: createWrapper() }
      );

      const redirectButton = screen.getByRole("button", {
        name: /ask me something else/i,
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
          topic="What was your first job?"
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
          topic="What was your first job?"
          status="ACTIVE"
          initialMessages={messagesWithUserReply}
        />,
        { wrapper: createWrapper() }
      );

      const redirectButton = screen.getByRole("button", {
        name: /ask me something else/i,
      });
      expect(redirectButton).not.toBeDisabled();
    });
  });
});
