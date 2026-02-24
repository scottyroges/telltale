// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { db } = (await import("../../helpers/mock-db")).createMockDb();
vi.mock("@/lib/db", () => ({ db }));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("RESEND_API_KEY", "test-resend-key");
vi.stubEnv("EMAIL_FROM", "test@example.com");

const mockBookFindById = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/book.repository", () => ({
  bookRepository: {
    findById: mockBookFindById,
  },
}));

const mockBqFindById = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/book-question.repository", () => ({
  bookQuestionRepository: {
    findById: mockBqFindById,
  },
}));

const mockUserFindById = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/user.repository", () => ({
  userRepository: {
    findById: mockUserFindById,
  },
}));

const mockInterviewFindById = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/interview.repository", () => ({
  interviewRepository: {
    findById: mockInterviewFindById,
  },
}));

const mockStartInterview = vi.hoisted(() => vi.fn());
const mockSendMessage = vi.hoisted(() => vi.fn());
const mockGetInterviewMessages = vi.hoisted(() => vi.fn());
const mockGetInsights = vi.hoisted(() => vi.fn());
const mockGetBookInsights = vi.hoisted(() => vi.fn());
const mockCompleteInterview = vi.hoisted(() => vi.fn());
vi.mock("@/services/conversation.service", () => ({
  conversationService: {
    startInterview: mockStartInterview,
    sendMessage: mockSendMessage,
    getInterviewMessages: mockGetInterviewMessages,
    getInsights: mockGetInsights,
    getBookInsights: mockGetBookInsights,
    completeInterview: mockCompleteInterview,
  },
}));

const now = new Date();

const approvedUser = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
  image: null,
  approvalStatus: "APPROVED",
  role: "USER",
  createdAt: now,
  updatedAt: now,
};

const ownBook = {
  id: "book-1",
  userId: "user-1",
  title: "My Life",
  status: "IN_PROGRESS",
  createdAt: now,
  updatedAt: now,
};

const bookQuestion = {
  id: "bq-1",
  bookId: "book-1",
  questionId: "q-1",
  orderIndex: 0,
  status: "NOT_STARTED",
  createdAt: now,
  updatedAt: now,
};

const activeInterview = {
  id: "interview-1",
  bookId: "book-1",
  questionId: "q-1",
  status: "ACTIVE",
  completedAt: null,
  createdAt: now,
  updatedAt: now,
};

const completeInterview = {
  ...activeInterview,
  status: "COMPLETE",
  completedAt: now,
};

describe("interview router", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let caller: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let createCaller: (ctx: Record<string, unknown>) => any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock approved user for all tests
    mockUserFindById.mockResolvedValue(approvedUser);
    const { createCallerFactory } = await import("@/server/trpc");
    const { appRouter } = await import("@/server/routers/_app");
    createCaller = (ctx) => createCallerFactory(appRouter)(ctx as never);
    caller = createCaller({
      session: { user: { id: "user-1" } },
      userId: "user-1",
    });
  });

  describe("start", () => {
    it("verifies ownership and delegates to conversationService", async () => {
      mockBqFindById.mockResolvedValue(bookQuestion);
      mockBookFindById.mockResolvedValue(ownBook);
      mockStartInterview.mockResolvedValue({
        interviewId: "interview-1",
        openingMessage: "Tell me about your childhood.",
      });

      const result = await caller.interview.start({ bookQuestionId: "bq-1" });

      expect(result).toEqual({
        interviewId: "interview-1",
        openingMessage: "Tell me about your childhood.",
      });
      expect(mockBqFindById).toHaveBeenCalledWith("bq-1");
      expect(mockBookFindById).toHaveBeenCalledWith("book-1");
      expect(mockStartInterview).toHaveBeenCalledWith("bq-1", "Test User");
    });

    it("throws NOT_FOUND for missing bookQuestionId", async () => {
      mockBqFindById.mockResolvedValue(null);

      await expect(
        caller.interview.start({ bookQuestionId: "bq-missing" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN for another user's bookQuestion", async () => {
      mockBqFindById.mockResolvedValue(bookQuestion);
      mockBookFindById.mockResolvedValue({ ...ownBook, userId: "other-user" });

      await expect(
        caller.interview.start({ bookQuestionId: "bq-1" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("getById", () => {
    it("returns interview metadata after ownership check", async () => {
      mockInterviewFindById.mockResolvedValue(activeInterview);
      mockBookFindById.mockResolvedValue(ownBook);

      const result = await caller.interview.getById({ id: "interview-1" });

      expect(result).toEqual(activeInterview);
      expect(mockInterviewFindById).toHaveBeenCalledWith("interview-1");
      expect(mockBookFindById).toHaveBeenCalledWith("book-1");
    });

    it("throws NOT_FOUND for missing interview", async () => {
      mockInterviewFindById.mockResolvedValue(null);

      await expect(
        caller.interview.getById({ id: "missing" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN for another user's interview", async () => {
      mockInterviewFindById.mockResolvedValue(activeInterview);
      mockBookFindById.mockResolvedValue({ ...ownBook, userId: "other-user" });

      await expect(
        caller.interview.getById({ id: "interview-1" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("sendMessage", () => {
    it("verifies ownership and delegates to conversationService", async () => {
      mockInterviewFindById.mockResolvedValue(activeInterview);
      mockBookFindById.mockResolvedValue(ownBook);
      mockSendMessage.mockResolvedValue({
        content: "That sounds fascinating. Tell me more.",
      });

      const result = await caller.interview.sendMessage({
        interviewId: "interview-1",
        content: "I grew up in a small town.",
      });

      expect(result).toEqual({
        content: "That sounds fascinating. Tell me more.",
      });
      expect(mockInterviewFindById).toHaveBeenCalledWith("interview-1");
      expect(mockBookFindById).toHaveBeenCalledWith("book-1");
      expect(mockSendMessage).toHaveBeenCalledWith(
        "interview-1",
        "book-1",
        "I grew up in a small town.",
        "Test User",
      );
    });

    it("throws BAD_REQUEST if interview is COMPLETE", async () => {
      mockInterviewFindById.mockResolvedValue(completeInterview);
      mockBookFindById.mockResolvedValue(ownBook);

      await expect(
        caller.interview.sendMessage({
          interviewId: "interview-1",
          content: "Hello",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("throws NOT_FOUND for missing interview", async () => {
      mockInterviewFindById.mockResolvedValue(null);

      await expect(
        caller.interview.sendMessage({
          interviewId: "missing",
          content: "Hello",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("getMessages", () => {
    it("verifies ownership and returns transcript", async () => {
      mockInterviewFindById.mockResolvedValue(activeInterview);
      mockBookFindById.mockResolvedValue(ownBook);
      const messages = [
        { id: "m1", interviewId: "interview-1", role: "USER", content: "Hi", createdAt: now },
        { id: "m2", interviewId: "interview-1", role: "ASSISTANT", content: "Hello!", createdAt: now },
      ];
      mockGetInterviewMessages.mockResolvedValue(messages);

      const result = await caller.interview.getMessages({
        interviewId: "interview-1",
      });

      expect(result).toEqual(messages);
      expect(mockInterviewFindById).toHaveBeenCalledWith("interview-1");
      expect(mockGetInterviewMessages).toHaveBeenCalledWith("interview-1");
    });

    it("throws NOT_FOUND for missing interview", async () => {
      mockInterviewFindById.mockResolvedValue(null);

      await expect(
        caller.interview.getMessages({ interviewId: "missing" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN for another user's interview", async () => {
      mockInterviewFindById.mockResolvedValue(activeInterview);
      mockBookFindById.mockResolvedValue({ ...ownBook, userId: "other-user" });

      await expect(
        caller.interview.getMessages({ interviewId: "interview-1" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("getInsights", () => {
    it("verifies ownership and delegates to conversationService", async () => {
      mockInterviewFindById.mockResolvedValue(activeInterview);
      mockBookFindById.mockResolvedValue(ownBook);
      const insights = [
        {
          id: "ins1",
          bookId: "book-1",
          interviewId: "interview-1",
          type: "ENTITY",
          content: "sister Maria — older, bossy",
          explored: false,
          createdAt: now,
          updatedAt: now,
        },
      ];
      mockGetInsights.mockResolvedValue(insights);

      const result = await caller.interview.getInsights({
        interviewId: "interview-1",
      });

      expect(result).toEqual(insights);
      expect(mockInterviewFindById).toHaveBeenCalledWith("interview-1");
      expect(mockGetInsights).toHaveBeenCalledWith("interview-1");
    });

    it("throws NOT_FOUND for missing interview", async () => {
      mockInterviewFindById.mockResolvedValue(null);

      await expect(
        caller.interview.getInsights({ interviewId: "missing" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN for another user's interview", async () => {
      mockInterviewFindById.mockResolvedValue(activeInterview);
      mockBookFindById.mockResolvedValue({ ...ownBook, userId: "other-user" });

      await expect(
        caller.interview.getInsights({ interviewId: "interview-1" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("getBookInsights", () => {
    it("verifies ownership and delegates to conversationService", async () => {
      mockBookFindById.mockResolvedValue(ownBook);
      const insights = [
        {
          id: "ins1",
          bookId: "book-1",
          interviewId: "interview-1",
          type: "ENTITY",
          content: "sister Maria — older, bossy",
          explored: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "ins2",
          bookId: "book-1",
          interviewId: "interview-2",
          type: "EMOTION",
          content: "nostalgia when discussing childhood home",
          explored: false,
          createdAt: now,
          updatedAt: now,
        },
      ];
      mockGetBookInsights.mockResolvedValue(insights);

      const result = await caller.interview.getBookInsights({
        bookId: "book-1",
      });

      expect(result).toEqual(insights);
      expect(mockBookFindById).toHaveBeenCalledWith("book-1");
      expect(mockGetBookInsights).toHaveBeenCalledWith("book-1");
    });

    it("throws NOT_FOUND for missing book", async () => {
      mockBookFindById.mockResolvedValue(null);

      await expect(
        caller.interview.getBookInsights({ bookId: "missing" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN for another user's book", async () => {
      mockBookFindById.mockResolvedValue({ ...ownBook, userId: "other-user" });

      await expect(
        caller.interview.getBookInsights({ bookId: "book-1" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("complete", () => {
    it("verifies ownership and delegates to conversationService", async () => {
      mockInterviewFindById.mockResolvedValue(activeInterview);
      mockBookFindById.mockResolvedValue(ownBook);
      mockCompleteInterview.mockResolvedValue(completeInterview);

      const result = await caller.interview.complete({
        interviewId: "interview-1",
      });

      expect(result).toEqual(completeInterview);
      expect(result.completedAt).toBe(now);
      expect(mockInterviewFindById).toHaveBeenCalledWith("interview-1");
      expect(mockCompleteInterview).toHaveBeenCalledWith("interview-1");
    });

    it("is idempotent (completing an already complete interview succeeds)", async () => {
      mockInterviewFindById.mockResolvedValue(completeInterview);
      mockBookFindById.mockResolvedValue(ownBook);
      mockCompleteInterview.mockResolvedValue(completeInterview);

      const result = await caller.interview.complete({
        interviewId: "interview-1",
      });

      expect(result).toEqual(completeInterview);
      expect(mockCompleteInterview).toHaveBeenCalledWith("interview-1");
    });

    it("throws NOT_FOUND for missing interview", async () => {
      mockInterviewFindById.mockResolvedValue(null);

      await expect(
        caller.interview.complete({ interviewId: "missing" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  it("throws UNAUTHORIZED when no session", async () => {
    const { TRPCError } = await import("@trpc/server");
    const unauthCaller = createCaller({ session: null, userId: null });

    await expect(
      unauthCaller.interview.start({ bookQuestionId: "bq-1" }),
    ).rejects.toThrow(TRPCError);
    await expect(
      unauthCaller.interview.start({ bookQuestionId: "bq-1" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
