import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockPush, mockStartInterview } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockStartInterview: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    interview: {
      start: {
        mutationOptions: (opts: Record<string, unknown>) => ({
          mutationFn: mockStartInterview,
          ...opts,
        }),
      },
    },
  }),
}));

import { TopicInput } from "./topic-input";

function renderTopicInput(bookId = "book-1") {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TopicInput bookId={bookId} />
    </QueryClientProvider>,
  );
}

describe("TopicInput", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockStartInterview.mockReset();
  });

  it("renders input and button", () => {
    renderTopicInput();

    expect(screen.getByLabelText("Topic")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /begin/i })).toBeInTheDocument();
  });

  it("button is disabled when topic is less than 5 characters", async () => {
    const user = userEvent.setup();
    renderTopicInput();

    const input = screen.getByLabelText("Topic");
    await user.type(input, "Hey");

    expect(screen.getByRole("button", { name: /begin/i })).toBeDisabled();
  });

  it("button is enabled when topic is 5 or more characters", async () => {
    const user = userEvent.setup();
    renderTopicInput();

    const input = screen.getByLabelText("Topic");
    await user.type(input, "Hello world");

    expect(screen.getByRole("button", { name: /begin/i })).toBeEnabled();
  });

  it("submits topic, calls interview.start, and navigates on success", async () => {
    mockStartInterview.mockResolvedValue({ interviewId: "new-int-1" });
    const user = userEvent.setup();
    renderTopicInput("book-42");

    const input = screen.getByLabelText("Topic");
    await user.type(input, "My first day of school");
    await user.click(screen.getByRole("button", { name: /begin/i }));

    expect(mockStartInterview).toHaveBeenCalledWith(
      { bookId: "book-42", topic: "My first day of school" },
      expect.anything(),
    );
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/interview/new-int-1");
    });
  });

  it("shows Starting... loading state while pending", async () => {
    let resolveMutate: (value: unknown) => void;
    mockStartInterview.mockReturnValue(
      new Promise((resolve) => {
        resolveMutate = resolve;
      }),
    );
    const user = userEvent.setup();
    renderTopicInput();

    await user.type(screen.getByLabelText("Topic"), "A long enough topic");
    await user.click(screen.getByRole("button", { name: /begin/i }));

    expect(
      screen.getByRole("button", { name: /starting/i }),
    ).toBeDisabled();

    resolveMutate!({ interviewId: "int-1" });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /begin/i })).toBeEnabled();
    });
  });

  it("shows error on mutation failure", async () => {
    mockStartInterview.mockRejectedValue(new Error("Something went wrong"));
    const user = userEvent.setup();
    renderTopicInput();

    await user.type(screen.getByLabelText("Topic"), "A long enough topic");
    await user.click(screen.getByRole("button", { name: /begin/i }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });
});
