import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { BookQuestion } from "@/domain/book-question";
import type { Question } from "@/domain/question";
import type { Interview } from "@/domain/interview";

const { mockPush, mockMutate } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockMutate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    interview: {
      start: {
        mutationOptions: (opts: Record<string, unknown>) => ({
          mutationFn: mockMutate,
          ...opts,
        }),
      },
    },
  }),
}));

import { QuestionList } from "./question-list";

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q-1",
    category: "Childhood",
    prompt: "What is your earliest memory?",
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeBookQuestion(
  overrides: Partial<BookQuestion> = {},
  question?: Partial<Question>,
): BookQuestion & { question: Question } {
  return {
    id: "bq-1",
    bookId: "book-1",
    questionId: "q-1",
    orderIndex: 0,
    status: "NOT_STARTED",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    question: makeQuestion({ id: overrides.questionId ?? "q-1", ...question }),
  };
}

function makeInterview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: "int-1",
    bookId: "book-1",
    questionId: "q-1",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function renderQuestionList(
  props: Partial<Parameters<typeof QuestionList>[0]> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const defaultProps = {
    bookQuestions: [],
    interviews: [],
    ...props,
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <QuestionList {...defaultProps} />
    </QueryClientProvider>,
  );
}

describe("QuestionList", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockMutate.mockReset();
  });

  it("shows empty state when no questions", () => {
    renderQuestionList();

    expect(
      screen.getByText(/haven't added any questions yet/),
    ).toBeInTheDocument();
  });

  it("renders NOT_STARTED question with gray dot and Begin button", () => {
    renderQuestionList({
      bookQuestions: [
        makeBookQuestion(
          { status: "NOT_STARTED" },
          { prompt: "Tell me about your childhood" },
        ),
      ],
    });

    expect(
      screen.getByText("Tell me about your childhood"),
    ).toBeInTheDocument();
    expect(screen.getByText("Not Started")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /begin/i }),
    ).toBeInTheDocument();
  });

  it("renders STARTED question with In Progress label and Continue link", () => {
    renderQuestionList({
      bookQuestions: [
        makeBookQuestion(
          { status: "STARTED", questionId: "q-2" },
          { prompt: "What was school like?" },
        ),
      ],
      interviews: [makeInterview({ id: "int-2", questionId: "q-2" })],
    });

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /continue/i });
    expect(link).toHaveAttribute("href", "/interview/int-2");
  });

  it("renders COMPLETE question with checkmark and Review link", () => {
    renderQuestionList({
      bookQuestions: [
        makeBookQuestion(
          { status: "COMPLETE", questionId: "q-3" },
          { prompt: "Describe your first job" },
        ),
      ],
      interviews: [
        makeInterview({
          id: "int-3",
          questionId: "q-3",
          status: "COMPLETE",
        }),
      ],
    });

    expect(screen.getByText("Complete")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /review/i });
    expect(link).toHaveAttribute("href", "/interview/int-3");
  });

  it("renders error state when STARTED question has no matching interview", () => {
    renderQuestionList({
      bookQuestions: [
        makeBookQuestion(
          { status: "STARTED", questionId: "q-2" },
          { prompt: "Missing interview question" },
        ),
      ],
      interviews: [], // no matching interview
    });

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("Begin button calls interview.start and navigates on success", async () => {
    mockMutate.mockResolvedValue({ interviewId: "new-int-1" });
    const user = userEvent.setup();

    renderQuestionList({
      bookQuestions: [makeBookQuestion({ id: "bq-99", status: "NOT_STARTED" })],
    });

    await user.click(screen.getByRole("button", { name: /begin/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      { bookQuestionId: "bq-99" },
      expect.anything(),
    );
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/interview/new-int-1");
    });
  });

  it("Begin button shows loading state while pending", async () => {
    let resolveMutate: (value: unknown) => void;
    mockMutate.mockReturnValue(
      new Promise((resolve) => {
        resolveMutate = resolve;
      }),
    );
    const user = userEvent.setup();

    renderQuestionList({
      bookQuestions: [makeBookQuestion({ status: "NOT_STARTED" })],
    });

    await user.click(screen.getByRole("button", { name: /begin/i }));

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveTextContent("Starting\u2026");

    resolveMutate!({ interviewId: "int-1" });
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeEnabled();
    });
  });
});
