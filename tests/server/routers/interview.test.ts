// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { db } = (await import("../../helpers/mock-db")).createMockDb();
vi.mock("@/lib/db", () => ({ db }));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

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

const mockInterviewFindById = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/interview.repository", () => ({
  interviewRepository: {
    findById: mockInterviewFindById,
  },
}));

const mockStartInterview = vi.hoisted(() => vi.fn());
const mockSendMessage = vi.hoisted(() => vi.fn());
const mockGetInterviewMessages = vi.hoisted(() => vi.fn());
const mockCompleteInterview = vi.hoisted(() => vi.fn());
vi.mock("@/services/conversation.service", () => ({
  conversationService: {
    startInterview: mockStartInterview,
    sendMessage: mockSendMessage,
    getInterviewMessages: mockGetInterviewMessages,
    completeInterview: mockCompleteInterview,
  },
}));

const now = new Date();

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
  createdAt: now,
  updatedAt: now,
};

const completeInterview = {
  ...activeInterview,
  status: "COMPLETE",
};

describe("interview router", () => {
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
      expect(mockStartInterview).toHaveBeenCalledWith("bq-1");
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
        "I grew up in a small town.",
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

  describe("complete", () => {
    it("verifies ownership and delegates to conversationService", async () => {
      mockInterviewFindById.mockResolvedValue(activeInterview);
      mockBookFindById.mockResolvedValue(ownBook);
      mockCompleteInterview.mockResolvedValue(completeInterview);

      const result = await caller.interview.complete({
        interviewId: "interview-1",
      });

      expect(result).toEqual(completeInterview);
      expect(mockInterviewFindById).toHaveBeenCalledWith("interview-1");
      expect(mockCompleteInterview).toHaveBeenCalledWith("interview-1");
    });

    it("throws BAD_REQUEST if already COMPLETE", async () => {
      mockInterviewFindById.mockResolvedValue(completeInterview);
      mockBookFindById.mockResolvedValue(ownBook);

      await expect(
        caller.interview.complete({ interviewId: "interview-1" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
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
