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

const mockInterviewCreate = vi.hoisted(() => vi.fn());
const mockInterviewComplete = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/interview.repository", () => ({
  interviewRepository: {
    create: mockInterviewCreate,
    complete: mockInterviewComplete,
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

const mockInsightFindByInterviewId = vi.hoisted(() => vi.fn());
const mockInsightFindByBookId = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/insight.repository", () => ({
  insightRepository: {
    findByInterviewId: mockInsightFindByInterviewId,
    findByBookId: mockInsightFindByBookId,
  },
}));

const mockBookFindById = vi.hoisted(() => vi.fn());
const mockBookUpdateCoreMemory = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/book.repository", () => ({
  bookRepository: {
    findById: mockBookFindById,
    updateCoreMemory: mockBookUpdateCoreMemory,
  },
}));

describe("conversationService", () => {
  let conversationService: Awaited<
    typeof import("@/services/conversation.service")
  >["conversationService"];

  const defaultBook = {
    id: "b1",
    userId: "u1",
    title: "My Life Story",
    coreMemory: "## Book Memory\nKey people: Maria\n\n## Interview Memory\nTopic: old topic",
    status: "IN_PROGRESS" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockInsightFindByBookId.mockResolvedValue([]);
    mockBookFindById.mockResolvedValue(defaultBook);
    mockBookUpdateCoreMemory.mockResolvedValue(defaultBook);
    const mod = await import("@/services/conversation.service");
    conversationService = mod.conversationService;
  });

  describe("startInterview", () => {
    it("creates interview and returns opening message", async () => {
      const interview = {
        id: "int1",
        bookId: "b1",
        topic: "Tell me about your earliest memories",
        status: "ACTIVE",
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

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
        content: '{"response":"Welcome! Tell me about your earliest memories.","updatedCoreMemory":"## Book Memory\\nKey people: Maria\\n\\n## Interview Memory\\nTopic: Tell me about your earliest memories","shouldComplete":false}',
      });
      mockMessageCreate.mockResolvedValue({});

      const result = await conversationService.startInterview("b1", "Tell me about your earliest memories", "Sarah");

      expect(result).toEqual({
        interviewId: "int1",
      });

      expect(mockInterviewCreate).toHaveBeenCalledWith({
        bookId: "b1",
        topic: "Tell me about your earliest memories",
      });

      // Book loaded in parallel with interview creation
      expect(mockBookFindById).toHaveBeenCalledWith("b1");

      // Topic message persisted first (hidden from transcript)
      expect(mockMessageCreate).toHaveBeenNthCalledWith(1, {
        interviewId: "int1",
        role: "USER",
        content: expect.stringContaining(
          "Tell me about your earliest memories",
        ),
        hidden: true,
      });

      // Context service called with prepared memory (interview section replaced)
      expect(mockBuildContextWindow).toHaveBeenCalledWith(
        "int1",
        "Sarah",
        "## Book Memory\nKey people: Maria\n\n## Interview Memory\nTopic: Tell me about your earliest memories",
      );

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

      // Core memory persisted
      expect(mockBookUpdateCoreMemory).toHaveBeenCalledWith(
        "b1",
        "## Book Memory\nKey people: Maria\n\n## Interview Memory\nTopic: Tell me about your earliest memories",
      );
    });

    it("does not persist core memory when updatedCoreMemory is null", async () => {
      mockInterviewCreate.mockResolvedValue({
        id: "int1",
        bookId: "b1",
        topic: "Tell me about your earliest memories",
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
        content: '{"response":"Welcome!","shouldComplete":false}',
      });
      mockMessageCreate.mockResolvedValue({});

      await conversationService.startInterview("b1", "Tell me about your earliest memories", "Sarah");

      expect(mockBookUpdateCoreMemory).not.toHaveBeenCalled();
    });

    it("passes null coreMemory for first interview (no existing book memory)", async () => {
      mockBookFindById.mockResolvedValue({ ...defaultBook, coreMemory: null });
      mockInterviewCreate.mockResolvedValue({
        id: "int1",
        bookId: "b1",
        topic: "childhood",
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
        content: '{"response":"Welcome!","updatedCoreMemory":"## Book Memory\\n\\n## Interview Memory\\nTopic: childhood","shouldComplete":false}',
      });
      mockMessageCreate.mockResolvedValue({});

      await conversationService.startInterview("b1", "childhood", "Sarah");

      // Context service gets null (no existing memory to prepare)
      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1", "Sarah", null);

      // But memory is still persisted from the LLM response
      expect(mockBookUpdateCoreMemory).toHaveBeenCalledWith(
        "b1",
        "## Book Memory\n\n## Interview Memory\nTopic: childhood",
      );
    });

    it("strips old interview section and prepares fresh one", async () => {
      mockInterviewCreate.mockResolvedValue({
        id: "int1",
        bookId: "b1",
        topic: "school days",
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
        content: '{"response":"Welcome!","shouldComplete":false}',
      });
      mockMessageCreate.mockResolvedValue({});

      await conversationService.startInterview("b1", "school days", "Sarah");

      // The prepared memory should keep book section, replace interview section
      expect(mockBuildContextWindow).toHaveBeenCalledWith(
        "int1",
        "Sarah",
        "## Book Memory\nKey people: Maria\n\n## Interview Memory\nTopic: school days",
      );
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
        content: '{"response":"That\'s fascinating! Tell me more.","updatedCoreMemory":"## Book Memory\\nKey people: Maria\\n\\n## Interview Memory\\nTopic: old topic\\nNew detail: story detail","shouldComplete":false}',
      });

      const result = await conversationService.sendMessage("int1", "b1", "my story", "Sarah");

      expect(result).toEqual({ content: "That's fascinating! Tell me more.", shouldComplete: false });

      // Persists user message first (in parallel with book load)
      expect(mockMessageCreate).toHaveBeenNthCalledWith(1, {
        interviewId: "int1",
        role: "USER",
        content: "my story",
      });

      // Book loaded in parallel with user message creation
      expect(mockBookFindById).toHaveBeenCalledWith("b1");

      // Context service builds context window with raw coreMemory
      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1", "Sarah", defaultBook.coreMemory);

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

      // Core memory persisted
      expect(mockBookUpdateCoreMemory).toHaveBeenCalledWith(
        "b1",
        "## Book Memory\nKey people: Maria\n\n## Interview Memory\nTopic: old topic\nNew detail: story detail",
      );
    });

    it("filters out SYSTEM messages from LLM history", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "hello" }],
      });
      mockGenerateResponse.mockResolvedValue({ content: '{"response":"hi","shouldComplete":false}' });

      await conversationService.sendMessage("int1", "b1", "hello", "Sarah");

      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1", "Sarah", defaultBook.coreMemory);
      expect(mockGenerateResponse).toHaveBeenCalledWith(expect.any(String), [
        { role: "user", content: "hello" },
      ]);
    });

    it("auto-completes interview when shouldComplete is true", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "yes, let's wrap up" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"Thank you for sharing!","updatedCoreMemory":"## Book Memory\\nFinal","shouldComplete":true}',
      });
      mockInterviewComplete.mockResolvedValue({});

      const result = await conversationService.sendMessage("int1", "b1", "yes, let's wrap up", "Sarah");

      expect(result).toEqual({ content: "Thank you for sharing!", shouldComplete: true });
      expect(mockInterviewComplete).toHaveBeenCalledWith("int1");
    });

    it("propagates error when interviewRepository.complete() fails during auto-completion", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "yes, let's wrap up" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"Thank you for sharing!","shouldComplete":true}',
      });
      mockInterviewComplete.mockRejectedValue(new Error("DB connection lost"));

      await expect(
        conversationService.sendMessage("int1", "b1", "yes, let's wrap up", "Sarah"),
      ).rejects.toThrow("DB connection lost");

      // Assistant message should still have been persisted before complete() was called
      expect(mockMessageCreate).toHaveBeenNthCalledWith(2, {
        interviewId: "int1",
        role: "ASSISTANT",
        content: "Thank you for sharing!",
      });
    });

    it("does not complete interview when shouldComplete is false", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "tell me more" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"Tell me more about that.","shouldComplete":false}',
      });

      const result = await conversationService.sendMessage("int1", "b1", "tell me more", "Sarah");

      expect(result).toEqual({ content: "Tell me more about that.", shouldComplete: false });
      expect(mockInterviewComplete).not.toHaveBeenCalled();
    });

    it("does not persist core memory on parse failure", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "hello" }],
      });
      // Both initial response and retry return unparseable plain text
      mockGenerateResponse.mockResolvedValue({ content: "This is just plain text, not JSON." });

      const result = await conversationService.sendMessage("int1", "b1", "hello", "Sarah");

      expect(result).toEqual({ content: "This is just plain text, not JSON.", shouldComplete: false });
      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1", "Sarah", defaultBook.coreMemory);
      expect(mockBookUpdateCoreMemory).not.toHaveBeenCalled();
      expect(mockMessageCreate).toHaveBeenNthCalledWith(2, {
        interviewId: "int1",
        role: "ASSISTANT",
        content: "This is just plain text, not JSON.",
      });
    });
  });

  describe("redirect", () => {
    it("creates hidden USER message, calls LLM, persists ASSISTANT message, and returns content", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [
          { role: "user", content: "topic message" },
          { role: "assistant", content: "opening question" },
          { role: "user", content: "The storyteller would like to explore a different aspect" },
        ],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"What a wonderful story. Let me ask about something different — what was school like for you growing up?","updatedCoreMemory":"## Book Memory\\nKey people: Maria\\n\\n## Interview Memory\\nTopic: old topic\\nRedirected","shouldComplete":false}',
      });

      const result = await conversationService.redirect("int1", "b1", "Sarah");

      expect(result).toEqual({
        content: "What a wonderful story. Let me ask about something different — what was school like for you growing up?",
      });

      // Hidden USER message created in parallel with book load
      expect(mockMessageCreate).toHaveBeenNthCalledWith(1, {
        interviewId: "int1",
        role: "USER",
        content: expect.stringContaining("different aspect"),
        hidden: true,
      });

      // Book loaded
      expect(mockBookFindById).toHaveBeenCalledWith("b1");

      // Context built with raw coreMemory
      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1", "Sarah", defaultBook.coreMemory);

      // ASSISTANT message persisted (not hidden)
      expect(mockMessageCreate).toHaveBeenNthCalledWith(2, {
        interviewId: "int1",
        role: "ASSISTANT",
        content: "What a wonderful story. Let me ask about something different — what was school like for you growing up?",
      });

      // Core memory persisted
      expect(mockBookUpdateCoreMemory).toHaveBeenCalledWith(
        "b1",
        "## Book Memory\nKey people: Maria\n\n## Interview Memory\nTopic: old topic\nRedirected",
      );
    });

    it("creates USER message with hidden: true", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "redirect prompt" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"Let me ask about something else.","shouldComplete":false}',
      });

      await conversationService.redirect("int1", "b1", "Sarah");

      const firstCall = mockMessageCreate.mock.calls[0]![0];
      expect(firstCall.hidden).toBe(true);
    });

    it("does not persist core memory when updatedCoreMemory is null", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "redirect prompt" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"Let me ask about something else.","shouldComplete":false}',
      });

      await conversationService.redirect("int1", "b1", "Sarah");

      expect(mockBookUpdateCoreMemory).not.toHaveBeenCalled();
    });

    it("does not call interviewRepository.complete even when shouldComplete is true", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: expect.any(String),
        messages: [{ role: "user", content: "redirect prompt" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: '{"response":"Let me ask about something else.","shouldComplete":true}',
      });

      await conversationService.redirect("int1", "b1", "Sarah");

      expect(mockInterviewComplete).not.toHaveBeenCalled();
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
          hidden: false,
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
        topic: "Tell me about your childhood",
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
