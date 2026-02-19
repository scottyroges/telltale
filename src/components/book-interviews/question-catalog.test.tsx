import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Question } from "@/domain/question";

const { mockRefresh, mockMutate } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockMutate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    book: {
      addQuestion: {
        mutationOptions: (opts: Record<string, unknown>) => ({
          mutationFn: mockMutate,
          ...opts,
        }),
      },
    },
  }),
}));

import { QuestionCatalog } from "./question-catalog";

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

function renderCatalog(
  props: Partial<Parameters<typeof QuestionCatalog>[0]> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const defaultProps = {
    bookId: "book-1",
    allQuestions: [],
    existingQuestionIds: [],
    ...props,
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <QuestionCatalog {...defaultProps} />
    </QueryClientProvider>,
  );
}

describe("QuestionCatalog", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    mockMutate.mockReset();
  });

  it("shows empty state when all questions are already added", () => {
    renderCatalog({
      allQuestions: [makeQuestion({ id: "q-1" })],
      existingQuestionIds: ["q-1"],
    });

    expect(screen.getByText("No more questions available.")).toBeInTheDocument();
  });

  it("filters out questions already in book", () => {
    renderCatalog({
      allQuestions: [
        makeQuestion({ id: "q-1", prompt: "First question" }),
        makeQuestion({ id: "q-2", prompt: "Second question" }),
      ],
      existingQuestionIds: ["q-1"],
    });

    expect(screen.queryByText("First question")).not.toBeInTheDocument();
    expect(screen.getByText("Second question")).toBeInTheDocument();
  });

  it("renders unique categories in the dropdown", () => {
    renderCatalog({
      allQuestions: [
        makeQuestion({ id: "q-1", category: "Childhood" }),
        makeQuestion({ id: "q-2", category: "Career" }),
        makeQuestion({ id: "q-3", category: "Childhood" }),
      ],
    });

    const select = screen.getByRole("combobox", {
      name: /filter by category/i,
    });
    const options = Array.from(
      (select as HTMLSelectElement).options,
    ).map((o) => o.value);
    expect(options).toEqual(["All", "Career", "Childhood"]);
  });

  it("filters questions by selected category", async () => {
    const user = userEvent.setup();

    renderCatalog({
      allQuestions: [
        makeQuestion({
          id: "q-1",
          category: "Childhood",
          prompt: "Childhood question",
        }),
        makeQuestion({
          id: "q-2",
          category: "Career",
          prompt: "Career question",
        }),
      ],
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /filter by category/i }),
      "Career",
    );

    expect(screen.queryByText("Childhood question")).not.toBeInTheDocument();
    expect(screen.getByText("Career question")).toBeInTheDocument();
  });

  it("shows remaining questions after filtering out already-added ones", () => {
    renderCatalog({
      allQuestions: [
        makeQuestion({ id: "q-1", category: "Childhood" }),
        makeQuestion({ id: "q-2", category: "Career" }),
      ],
      existingQuestionIds: ["q-2"],
    });

    // After filtering out q-2, only q-1 (Childhood) remains visible
    expect(screen.getByText("What is your earliest memory?")).toBeInTheDocument();
  });

  it("excludes categories whose only questions are already added", () => {
    renderCatalog({
      allQuestions: [
        makeQuestion({ id: "q-1", category: "Childhood" }),
        makeQuestion({ id: "q-2", category: "Career" }),
      ],
      existingQuestionIds: ["q-2"],
    });

    const select = screen.getByRole("combobox", {
      name: /filter by category/i,
    });
    const options = Array.from(
      (select as HTMLSelectElement).options,
    ).map((o) => o.value);
    // "Career" should not appear since its only question (q-2) is already added
    expect(options).toEqual(["All", "Childhood"]);
  });

  it("Add button calls book.addQuestion with correct args", async () => {
    mockMutate.mockResolvedValue({});
    const user = userEvent.setup();

    renderCatalog({
      bookId: "book-42",
      allQuestions: [makeQuestion({ id: "q-5", prompt: "A question" })],
    });

    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(mockMutate).toHaveBeenCalledWith({
      bookId: "book-42",
      questionId: "q-5",
    });
  });

  it("calls router.refresh on successful add", async () => {
    mockMutate.mockResolvedValue({});
    const user = userEvent.setup();

    renderCatalog({
      allQuestions: [makeQuestion({ id: "q-1" })],
    });

    await user.click(screen.getByRole("button", { name: /add/i }));

    // Wait for the mutation to complete and onSuccess to fire
    await vi.waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
