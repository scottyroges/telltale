// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockGenerateResponse = vi.hoisted(() => vi.fn());
vi.mock("@/lib/llm", () => ({
  llmProvider: { generateResponse: mockGenerateResponse },
}));

const mockBookQuestionFindById = vi.hoisted(() => vi.fn());
const mockBookQuestionUpdateStatus = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/book-question.repository", () => ({
  bookQuestionRepository: {
    findById: mockBookQuestionFindById,
    updateStatus: mockBookQuestionUpdateStatus,
  },
}));

const mockQuestionFindById = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/question.repository", () => ({
  questionRepository: {
    findById: mockQuestionFindById,
  },
}));

const mockInterviewCreate = vi.hoisted(() => vi.fn());
const mockInterviewUpdateStatus = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/interview.repository", () => ({
  interviewRepository: {
    create: mockInterviewCreate,
    updateStatus: mockInterviewUpdateStatus,
  },
}));

const mockMessageCreate = vi.hoisted(() => vi.fn());
const mockMessageFindByInterviewId = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/message.repository", () => ({
  messageRepository: {
    create: mockMessageCreate,
    findByInterviewId: mockMessageFindByInterviewId,
  },
}));

describe("conversationService", () => {
  let conversationService: Awaited<
    typeof import("@/services/conversation.service")
  >["conversationService"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/services/conversation.service");
    conversationService = mod.conversationService;
  });

  describe("startInterview", () => {
    it("creates interview and returns opening message", async () => {
      const bookQuestion = {
        id: "bq1",
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
        status: "NOT_STARTED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const question = {
        id: "q1",
        category: "childhood",
        prompt: "Tell me about your earliest memories",
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const interview = {
        id: "int1",
        bookId: "b1",
        questionId: "q1",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBookQuestionFindById.mockResolvedValue(bookQuestion);
      mockQuestionFindById.mockResolvedValue(question);
      mockInterviewCreate.mockResolvedValue(interview);
      mockGenerateResponse.mockResolvedValue({
        content: "Welcome! Tell me about your earliest memories.",
      });
      mockMessageCreate.mockResolvedValue({});
      mockBookQuestionUpdateStatus.mockResolvedValue({});

      const result = await conversationService.startInterview("bq1");

      expect(result).toEqual({
        interviewId: "int1",
        openingMessage: "Welcome! Tell me about your earliest memories.",
      });

      expect(mockBookQuestionFindById).toHaveBeenCalledWith("bq1");
      expect(mockQuestionFindById).toHaveBeenCalledWith("q1");
      expect(mockInterviewCreate).toHaveBeenCalledWith({
        bookId: "b1",
        questionId: "q1",
      });

      expect(mockGenerateResponse).toHaveBeenCalledWith(
        expect.any(String),
        [
          {
            role: "user",
            content: expect.stringContaining(
              "Tell me about your earliest memories",
            ),
          },
        ],
      );

      // Persists both the synthetic user message and the assistant response
      expect(mockMessageCreate).toHaveBeenCalledTimes(2);
      expect(mockMessageCreate).toHaveBeenCalledWith({
        interviewId: "int1",
        role: "USER",
        content: expect.stringContaining(
          "Tell me about your earliest memories",
        ),
      });
      expect(mockMessageCreate).toHaveBeenCalledWith({
        interviewId: "int1",
        role: "ASSISTANT",
        content: "Welcome! Tell me about your earliest memories.",
      });

      expect(mockBookQuestionUpdateStatus).toHaveBeenCalledWith(
        "bq1",
        "STARTED",
      );
    });

    it("throws when BookQuestion is not found", async () => {
      mockBookQuestionFindById.mockResolvedValue(null);

      await expect(
        conversationService.startInterview("bq-missing"),
      ).rejects.toThrow("BookQuestion not found: bq-missing");
    });

    it("throws when Question is not found", async () => {
      mockBookQuestionFindById.mockResolvedValue({
        id: "bq1",
        bookId: "b1",
        questionId: "q-missing",
        orderIndex: 0,
        status: "NOT_STARTED",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockQuestionFindById.mockResolvedValue(null);

      await expect(
        conversationService.startInterview("bq1"),
      ).rejects.toThrow("Question not found: q-missing");
    });
  });

  describe("sendMessage", () => {
    it("persists user message, calls LLM with history, and returns response", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockMessageFindByInterviewId.mockResolvedValue([
        {
          id: "m1",
          interviewId: "int1",
          role: "USER",
          content: "topic message",
          createdAt: new Date("2024-01-01T00:00:00Z"),
        },
        {
          id: "m2",
          interviewId: "int1",
          role: "ASSISTANT",
          content: "opening question",
          createdAt: new Date("2024-01-01T00:00:01Z"),
        },
        {
          id: "m3",
          interviewId: "int1",
          role: "USER",
          content: "my story",
          createdAt: new Date("2024-01-01T00:00:02Z"),
        },
      ]);
      mockGenerateResponse.mockResolvedValue({
        content: "That's fascinating! Tell me more.",
      });

      const result = await conversationService.sendMessage("int1", "my story");

      expect(result).toEqual({ content: "That's fascinating! Tell me more." });

      // Persists user message first
      expect(mockMessageCreate).toHaveBeenCalledWith({
        interviewId: "int1",
        role: "USER",
        content: "my story",
      });

      // Loads history
      expect(mockMessageFindByInterviewId).toHaveBeenCalledWith("int1");

      // Maps roles to lowercase for LLM
      expect(mockGenerateResponse).toHaveBeenCalledWith(
        expect.any(String),
        [
          { role: "user", content: "topic message" },
          { role: "assistant", content: "opening question" },
          { role: "user", content: "my story" },
        ],
      );

      // Persists assistant response
      expect(mockMessageCreate).toHaveBeenCalledWith({
        interviewId: "int1",
        role: "ASSISTANT",
        content: "That's fascinating! Tell me more.",
      });
    });

    it("filters out SYSTEM messages from LLM history", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockMessageFindByInterviewId.mockResolvedValue([
        {
          id: "m1",
          interviewId: "int1",
          role: "SYSTEM",
          content: "system note",
          createdAt: new Date("2024-01-01T00:00:00Z"),
        },
        {
          id: "m2",
          interviewId: "int1",
          role: "USER",
          content: "hello",
          createdAt: new Date("2024-01-01T00:00:01Z"),
        },
      ]);
      mockGenerateResponse.mockResolvedValue({ content: "hi" });

      await conversationService.sendMessage("int1", "hello");

      expect(mockGenerateResponse).toHaveBeenCalledWith(expect.any(String), [
        { role: "user", content: "hello" },
      ]);
    });
  });

  describe("getInterviewMessages", () => {
    it("delegates to messageRepository", async () => {
      const messages = [
        {
          id: "m1",
          interviewId: "int1",
          role: "USER",
          content: "hello",
          createdAt: new Date(),
        },
      ];
      mockMessageFindByInterviewId.mockResolvedValue(messages);

      const result =
        await conversationService.getInterviewMessages("int1");

      expect(result).toEqual(messages);
      expect(mockMessageFindByInterviewId).toHaveBeenCalledWith("int1");
    });
  });

  describe("completeInterview", () => {
    it("delegates to interviewRepository.updateStatus", async () => {
      const updated = {
        id: "int1",
        bookId: "b1",
        questionId: "q1",
        status: "COMPLETE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockInterviewUpdateStatus.mockResolvedValue(updated);

      const result = await conversationService.completeInterview("int1");

      expect(result).toEqual(updated);
      expect(mockInterviewUpdateStatus).toHaveBeenCalledWith(
        "int1",
        "COMPLETE",
      );
    });
  });
});
