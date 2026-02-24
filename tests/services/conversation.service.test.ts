// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockGenerateResponse = vi.hoisted(() => vi.fn());
vi.mock("@/lib/llm", () => ({
  llmProvider: { generateResponse: mockGenerateResponse },
}));

const mockBuildContextWindow = vi.hoisted(() => vi.fn());
vi.mock("@/services/context.service", () => ({
  contextService: {
    buildContextWindow: mockBuildContextWindow,
  },
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
const mockInterviewComplete = vi.hoisted(() => vi.fn());
const mockInterviewFindByBookIdAndQuestionId = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/interview.repository", () => ({
  interviewRepository: {
    create: mockInterviewCreate,
    updateStatus: mockInterviewUpdateStatus,
    complete: mockInterviewComplete,
    findByBookIdAndQuestionId: mockInterviewFindByBookIdAndQuestionId,
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

const mockInsightCreateMany = vi.hoisted(() => vi.fn());
const mockInsightFindByInterviewId = vi.hoisted(() => vi.fn());
const mockInsightFindByBookId = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/insight.repository", () => ({
  insightRepository: {
    createMany: mockInsightCreateMany,
    findByInterviewId: mockInsightFindByInterviewId,
    findByBookId: mockInsightFindByBookId,
  },
}));

describe("conversationService", () => {
  let conversationService: Awaited<
    typeof import("@/services/conversation.service")
  >["conversationService"];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockInsightFindByBookId.mockResolvedValue([]);
    const mod = await import("@/services/conversation.service");
    conversationService = mod.conversationService;
  });

  describe("startInterview", () => {
    it("resumes existing interview when one already exists", async () => {
      const bookQuestion = {
        id: "bq1",
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
        status: "STARTED",
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
      const existingInterview = {
        id: "existing-int1",
        bookId: "b1",
        questionId: "q1",
        status: "ACTIVE",
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBookQuestionFindById.mockResolvedValue(bookQuestion);
      mockQuestionFindById.mockResolvedValue(question);
      mockInterviewFindByBookIdAndQuestionId.mockResolvedValue(existingInterview);

      const result = await conversationService.startInterview("bq1");

      expect(result).toEqual({
        interviewId: "existing-int1",
      });

      // Should check for existing interview
      expect(mockInterviewFindByBookIdAndQuestionId).toHaveBeenCalledWith("b1", "q1");

      // Should NOT create new interview
      expect(mockInterviewCreate).not.toHaveBeenCalled();

      // Should NOT call LLM or create messages
      expect(mockMessageCreate).not.toHaveBeenCalled();
      expect(mockGenerateResponse).not.toHaveBeenCalled();
      expect(mockBuildContextWindow).not.toHaveBeenCalled();
    });

    it("creates interview and returns opening message when no existing interview", async () => {
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
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBookQuestionFindById.mockResolvedValue(bookQuestion);
      mockQuestionFindById.mockResolvedValue(question);
      mockInterviewFindByBookIdAndQuestionId.mockResolvedValue(null);
      mockInterviewCreate.mockResolvedValue(interview);
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [
          {
            role: "user",
            content: expect.stringContaining(
              "Tell me about your earliest memories",
            ),
          },
        ],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"Welcome! Tell me about your earliest memories.","insights":[]}',
      });
      mockMessageCreate.mockResolvedValue({});
      mockBookQuestionUpdateStatus.mockResolvedValue({});
      mockInsightCreateMany.mockResolvedValue({ count: 0 });

      const result = await conversationService.startInterview("bq1");

      expect(result).toEqual({
        interviewId: "int1",
      });

      expect(mockBookQuestionFindById).toHaveBeenCalledWith("bq1");
      expect(mockQuestionFindById).toHaveBeenCalledWith("q1");
      expect(mockInterviewCreate).toHaveBeenCalledWith({
        bookId: "b1",
        questionId: "q1",
      });

      // Topic message persisted first
      expect(mockMessageCreate).toHaveBeenNthCalledWith(1, {
        interviewId: "int1",
        role: "USER",
        content: expect.stringContaining(
          "Tell me about your earliest memories",
        ),
      });

      // Context service called after topic message persisted
      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1");

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
      expect(mockMessageCreate).toHaveBeenNthCalledWith(2, {
        interviewId: "int1",
        role: "ASSISTANT",
        content: "Welcome! Tell me about your earliest memories.",
      });

      expect(mockBookQuestionUpdateStatus).toHaveBeenCalledWith(
        "bq1",
        "STARTED",
      );
    });

    it("persists extracted insights when present", async () => {
      const bookQuestion = {
        id: "bq1",
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
        status: "NOT_STARTED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockBookQuestionFindById.mockResolvedValue(bookQuestion);
      mockQuestionFindById.mockResolvedValue({
        id: "q1",
        category: "childhood",
        prompt: "Tell me about your earliest memories",
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockInterviewFindByBookIdAndQuestionId.mockResolvedValue(null);
      mockInterviewCreate.mockResolvedValue({
        id: "int1",
        bookId: "b1",
        questionId: "q1",
        status: "ACTIVE",
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "topic message" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"Welcome!","insights":[{"type":"ENTITY","content":"sister Maria — older, bossy"},{"type":"EMOTION","content":"nostalgia for childhood home"}]}',
      });
      mockMessageCreate.mockResolvedValue({});
      mockBookQuestionUpdateStatus.mockResolvedValue({});
      mockInsightCreateMany.mockResolvedValue({ count: 2 });

      await conversationService.startInterview("bq1");

      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1");
      expect(mockInsightCreateMany).toHaveBeenCalledWith([
        { bookId: "b1", interviewId: "int1", type: "ENTITY", content: "sister Maria — older, bossy" },
        { bookId: "b1", interviewId: "int1", type: "EMOTION", content: "nostalgia for childhood home" },
      ]);
    });

    it("persists no insights when AI returns empty insights array", async () => {
      mockBookQuestionFindById.mockResolvedValue({
        id: "bq1",
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
        status: "NOT_STARTED",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockQuestionFindById.mockResolvedValue({
        id: "q1",
        category: "childhood",
        prompt: "Tell me about your earliest memories",
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockInterviewFindByBookIdAndQuestionId.mockResolvedValue(null);
      mockInterviewCreate.mockResolvedValue({
        id: "int1",
        bookId: "b1",
        questionId: "q1",
        status: "ACTIVE",
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "topic message" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"Welcome!","insights":[]}',
      });
      mockMessageCreate.mockResolvedValue({});
      mockBookQuestionUpdateStatus.mockResolvedValue({});
      mockInsightCreateMany.mockResolvedValue({ count: 0 });

      await conversationService.startInterview("bq1");

      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1");
      expect(mockInsightCreateMany).toHaveBeenCalledWith([]);
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
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [
          { role: "user", content: "topic message" },
          { role: "assistant", content: "opening question" },
          { role: "user", content: "my story" },
        ],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"That\'s fascinating! Tell me more.","insights":[]}',
      });
      mockInsightCreateMany.mockResolvedValue({ count: 0 });

      const result = await conversationService.sendMessage("int1", "b1", "my story");

      expect(result).toEqual({ content: "That's fascinating! Tell me more." });

      // Persists user message first
      expect(mockMessageCreate).toHaveBeenNthCalledWith(1, {
        interviewId: "int1",
        role: "USER",
        content: "my story",
      });

      // Context service builds context window
      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1");

      // Maps roles to lowercase for LLM
      expect(mockGenerateResponse).toHaveBeenCalledWith(
        expect.any(String),
        [
          { role: "user", content: "topic message" },
          { role: "assistant", content: "opening question" },
          { role: "user", content: "my story" },
        ],
      );

      // Persists assistant response (plain text, not raw JSON)
      expect(mockMessageCreate).toHaveBeenNthCalledWith(2, {
        interviewId: "int1",
        role: "ASSISTANT",
        content: "That's fascinating! Tell me more.",
      });
    });

    it("filters out SYSTEM messages from LLM history", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "hello" }],
      });
      mockGenerateResponse.mockResolvedValue({ content: '{"response":"hi","insights":[]}' });
      mockInsightCreateMany.mockResolvedValue({ count: 0 });

      await conversationService.sendMessage("int1", "b1", "hello");

      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1");
      expect(mockGenerateResponse).toHaveBeenCalledWith(expect.any(String), [
        { role: "user", content: "hello" },
      ]);
    });

    it("persists extracted insights via insightRepository.createMany", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "I had a sister named Maria" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"Tell me more about Maria.","insights":[{"type":"ENTITY","content":"sister Maria — mentioned in passing"}]}',
      });
      mockInsightCreateMany.mockResolvedValue({ count: 1 });

      await conversationService.sendMessage("int1", "b1", "I had a sister named Maria");

      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1");
      expect(mockInsightCreateMany).toHaveBeenCalledWith([
        { bookId: "b1", interviewId: "int1", type: "ENTITY", content: "sister Maria — mentioned in passing" },
      ]);
    });

    it("handles parse failure gracefully — falls back to raw text, no insights persisted", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "hello" }],
      });
      // Both initial response and retry return unparseable plain text
      mockGenerateResponse.mockResolvedValue({ content: "This is just plain text, not JSON." });
      mockInsightCreateMany.mockResolvedValue({ count: 0 });

      const result = await conversationService.sendMessage("int1", "b1", "hello");

      expect(result).toEqual({ content: "This is just plain text, not JSON." });
      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1");
      expect(mockInsightCreateMany).toHaveBeenCalledWith([]);
      expect(mockMessageCreate).toHaveBeenNthCalledWith(2, {
        interviewId: "int1",
        role: "ASSISTANT",
        content: "This is just plain text, not JSON.",
      });
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
    it("delegates to interviewRepository.complete", async () => {
      const now = new Date();
      const updated = {
        id: "int1",
        bookId: "b1",
        questionId: "q1",
        status: "COMPLETE",
        completedAt: now,
        createdAt: new Date(),
        updatedAt: now,
      };
      mockInterviewComplete.mockResolvedValue(updated);

      const result = await conversationService.completeInterview("int1");

      expect(result).toEqual(updated);
      expect(mockInterviewComplete).toHaveBeenCalledWith("int1");
    });
  });

  describe("getInsights", () => {
    it("delegates to insightRepository.findByInterviewId", async () => {
      const insights = [
        {
          id: "ins1",
          bookId: "b1",
          interviewId: "int1",
          type: "ENTITY",
          content: "sister Maria",
          explored: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockInsightFindByInterviewId.mockResolvedValue(insights);

      const result = await conversationService.getInsights("int1");

      expect(result).toEqual(insights);
      expect(mockInsightFindByInterviewId).toHaveBeenCalledWith("int1");
    });
  });

  describe("getBookInsights", () => {
    it("delegates to insightRepository.findByBookId", async () => {
      const insights = [
        {
          id: "ins1",
          bookId: "b1",
          interviewId: "int1",
          type: "EMOTION",
          content: "pride about dad's hardware store",
          explored: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockInsightFindByBookId.mockResolvedValue(insights);

      const result = await conversationService.getBookInsights("b1");

      expect(result).toEqual(insights);
      expect(mockInsightFindByBookId).toHaveBeenCalledWith("b1");
    });
  });
});
