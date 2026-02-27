// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { db } = (await import("../../helpers/mock-db")).createMockDb();
vi.mock("@/lib/db", () => ({ db }));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("RESEND_API_KEY", "test-resend-key");
vi.stubEnv("EMAIL_FROM", "test@example.com");

const mockBookCreate = vi.hoisted(() => vi.fn());
const mockBookFindById = vi.hoisted(() => vi.fn());
const mockBookFindByIdWithDetails = vi.hoisted(() => vi.fn());
const mockBookFindByUserId = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/book.repository", () => ({
  bookRepository: {
    create: mockBookCreate,
    findById: mockBookFindById,
    findByIdWithDetails: mockBookFindByIdWithDetails,
    findByUserId: mockBookFindByUserId,
  },
}));

const mockBqCreate = vi.hoisted(() => vi.fn());
const mockBqFindById = vi.hoisted(() => vi.fn());
const mockBqGetNextOrderIndex = vi.hoisted(() => vi.fn());
const mockBqDelete = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/book-question.repository", () => ({
  bookQuestionRepository: {
    create: mockBqCreate,
    findById: mockBqFindById,
    getNextOrderIndex: mockBqGetNextOrderIndex,
    delete: mockBqDelete,
  },
}));

const mockQuestionFindById = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/question.repository", () => ({
  questionRepository: {
    findById: mockQuestionFindById,
  },
}));

const mockInterviewFindById = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/interview.repository", () => ({
  interviewRepository: {
    findById: mockInterviewFindById,
  },
}));

const now = new Date();
const ownBook = {
  id: "book-1",
  userId: "user-1",
  title: "My Life",
  coreMemory: null,
  status: "IN_PROGRESS",
  createdAt: now,
  updatedAt: now,
};

describe("book router", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let caller: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let createCaller: (ctx: Record<string, unknown>) => any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createCallerFactory } = await import("@/server/trpc");
    const { appRouter } = await import("@/server/routers/_app");
    createCaller = (ctx) => createCallerFactory(appRouter)(ctx as never);
    caller = createCaller({
      session: { user: { id: "user-1" } },
      userId: "user-1",
    });
  });

  it("create creates book with userId and title", async () => {
    mockBookCreate.mockResolvedValue(ownBook);

    const result = await caller.book.create({ title: "My Life" });

    expect(result).toEqual(ownBook);
    expect(mockBookCreate).toHaveBeenCalledWith({
      userId: "user-1",
      title: "My Life",
    });
  });

  it("getById returns BookWithDetails after ownership check", async () => {
    const bookWithDetails = {
      ...ownBook,
      bookQuestions: [],
      interviews: [],
    };
    mockBookFindByIdWithDetails.mockResolvedValue(bookWithDetails);

    const result = await caller.book.getById({ id: "book-1" });

    expect(result).toEqual(bookWithDetails);
    expect(mockBookFindByIdWithDetails).toHaveBeenCalledWith("book-1");
  });

  it("getById throws NOT_FOUND for missing book", async () => {
    mockBookFindByIdWithDetails.mockResolvedValue(null);

    await expect(caller.book.getById({ id: "missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("getById throws FORBIDDEN for another user's book", async () => {
    mockBookFindByIdWithDetails.mockResolvedValue({
      ...ownBook,
      userId: "other-user",
      bookQuestions: [],
      interviews: [],
    });

    await expect(
      caller.book.getById({ id: "book-1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("list returns books for authenticated user", async () => {
    mockBookFindByUserId.mockResolvedValue([ownBook]);

    const result = await caller.book.list();

    expect(result).toEqual([ownBook]);
    expect(mockBookFindByUserId).toHaveBeenCalledWith("user-1");
  });

  it("addQuestion verifies ownership, validates questionId, computes orderIndex, creates bookQuestion", async () => {
    mockBookFindById.mockResolvedValue(ownBook);
    mockQuestionFindById.mockResolvedValue({
      id: "q1",
      category: "childhood",
      prompt: "Tell me",
      orderIndex: 0,
    });
    mockBqGetNextOrderIndex.mockResolvedValue(3);
    const createdBq = {
      id: "bq-1",
      bookId: "book-1",
      questionId: "q1",
      orderIndex: 3,
      interviewId: null,
      createdAt: now,
      updatedAt: now,
    };
    mockBqCreate.mockResolvedValue(createdBq);

    const result = await caller.book.addQuestion({
      bookId: "book-1",
      questionId: "q1",
    });

    expect(result).toEqual(createdBq);
    expect(mockBookFindById).toHaveBeenCalledWith("book-1");
    expect(mockQuestionFindById).toHaveBeenCalledWith("q1");
    expect(mockBqGetNextOrderIndex).toHaveBeenCalledWith("book-1");
    expect(mockBqCreate).toHaveBeenCalledWith({
      bookId: "book-1",
      questionId: "q1",
      orderIndex: 3,
    });
  });

  it("addQuestion throws NOT_FOUND for missing questionId", async () => {
    mockBookFindById.mockResolvedValue(ownBook);
    mockQuestionFindById.mockResolvedValue(null);

    await expect(
      caller.book.addQuestion({ bookId: "book-1", questionId: "q-missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("removeQuestion verifies ownership via bookQuestion, deletes", async () => {
    const bookQuestion = {
      id: "bq-1",
      bookId: "book-1",
      questionId: "q1",
      orderIndex: 0,
      interviewId: null,
      createdAt: now,
      updatedAt: now,
    };
    mockBqFindById.mockResolvedValue(bookQuestion);
    mockBookFindById.mockResolvedValue(ownBook);
    mockBqDelete.mockResolvedValue(bookQuestion);

    const result = await caller.book.removeQuestion({ bookQuestionId: "bq-1" });

    expect(result).toEqual(bookQuestion);
    expect(mockBqFindById).toHaveBeenCalledWith("bq-1");
    expect(mockBookFindById).toHaveBeenCalledWith("book-1");
    expect(mockBqDelete).toHaveBeenCalledWith("bq-1");
  });

  it("removeQuestion throws NOT_FOUND for missing bookQuestionId", async () => {
    mockBqFindById.mockResolvedValue(null);

    await expect(
      caller.book.removeQuestion({ bookQuestionId: "bq-missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws UNAUTHORIZED when no session", async () => {
    const { TRPCError } = await import("@trpc/server");
    const unauthCaller = createCaller({ session: null, userId: null });

    await expect(unauthCaller.book.list()).rejects.toThrow(TRPCError);
    await expect(unauthCaller.book.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
