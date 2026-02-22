// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockGenerateResponse = vi.hoisted(() => vi.fn());
vi.mock("@/lib/llm", () => ({
  llmProvider: { generateResponse: mockGenerateResponse },
}));

const mockInterviewFindById = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/interview.repository", () => ({
  interviewRepository: {
    findById: mockInterviewFindById,
  },
}));

const mockMessageFindByInterviewId = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/message.repository", () => ({
  messageRepository: {
    findByInterviewId: mockMessageFindByInterviewId,
  },
}));

const mockInsightFindByInterviewId = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/insight.repository", () => ({
  insightRepository: {
    findByInterviewId: mockInsightFindByInterviewId,
  },
}));

const mockSummaryCreate = vi.hoisted(() => vi.fn());
const mockSummaryFindLatest = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/interview-summary.repository", () => ({
  interviewSummaryRepository: {
    create: mockSummaryCreate,
    findLatestByInterviewId: mockSummaryFindLatest,
  },
}));

describe("contextService", () => {
  let contextService: Awaited<
    typeof import("@/services/context.service")
  >["contextService"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/services/context.service");
    contextService = mod.contextService;
  });

  const mockInterview = {
    id: "int1",
    bookId: "b1",
    questionId: "q1",
    status: "ACTIVE" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("returns empty messages for zero messages", async () => {
    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue([]);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1");

    expect(result.messages).toEqual([]);
    expect(result.systemPrompt).toBeTruthy();
  });

  it("returns single message for one message", async () => {
    const messages = [
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "Hello",
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1");

    expect(result.messages).toEqual([
      { role: "user", content: "Hello" },
    ]);
  });

  it("returns all messages when under threshold", async () => {
    const messages = [
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "First message",
        createdAt: new Date(),
      },
      {
        id: "m2",
        interviewId: "int1",
        role: "ASSISTANT" as const,
        content: "Response",
        createdAt: new Date(),
      },
      {
        id: "m3",
        interviewId: "int1",
        role: "USER" as const,
        content: "Second message",
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1");

    expect(result.messages).toEqual([
      { role: "user", content: "First message" },
      { role: "assistant", content: "Response" },
      { role: "user", content: "Second message" },
    ]);
    expect(mockSummaryCreate).not.toHaveBeenCalled();
  });

  it("returns all messages when over threshold but old bucket < 5", async () => {
    // Create messages that will exceed threshold (8000 tokens)
    // Each message ~8000 chars = ~2000 tokens, so 5 messages = ~10000 tokens
    const largeContent = "x".repeat(8000);
    const messages = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      createdAt: new Date(),
    }));

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1");

    // Should return all messages (no summarization yet - old bucket has 0 messages)
    expect(result.messages).toHaveLength(5);
    expect(mockSummaryCreate).not.toHaveBeenCalled();
  });

  it("triggers summarization when old bucket >= 5", async () => {
    // Create 10 messages: old bucket will have 5 (messages 0-4), recent has 5 (messages 5-9)
    const largeContent = "x".repeat(8000);
    const messages = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      createdAt: new Date(),
    }));

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);
    mockGenerateResponse.mockResolvedValue({
      content: "Summary of old messages",
    });

    const result = await contextService.buildContextWindow("int1");

    // Should create summary
    expect(mockSummaryCreate).toHaveBeenCalledWith({
      interviewId: "int1",
      parentSummaryId: undefined,
      content: "Summary of old messages",
      messageCount: 5,
    });

    // Should return summary + recent 5 messages
    expect(result.messages[0]).toEqual({
      role: "assistant",
      content: "Summary of old messages",
    });
    expect(result.messages).toHaveLength(6); // 1 summary + 5 recent
  });

  it("incorporates existing summary when creating new summary", async () => {
    const largeContent = "x".repeat(8000);
    // Create 15 messages: alreadySummarized=5, old=5 (indices 5-9), recent=5 (indices 10-14)
    const messages = Array.from({ length: 15 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      createdAt: new Date(),
    }));

    const existingSummary = {
      id: "sum1",
      interviewId: "int1",
      parentSummaryId: null,
      content: "Previous summary",
      messageCount: 5,
      createdAt: new Date(),
    };

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(existingSummary);
    mockGenerateResponse.mockResolvedValue({
      content: "Updated summary with new content",
    });

    await contextService.buildContextWindow("int1");

    // Should call LLM with previous summary
    expect(mockGenerateResponse).toHaveBeenCalledWith(
      expect.any(String),
      [
        {
          role: "user",
          content: expect.stringContaining("Previous summary: Previous summary"),
        },
      ],
      { maxTokens: 2048 },
    );

    // Should create new summary with correct parentSummaryId
    expect(mockSummaryCreate).toHaveBeenCalledWith({
      interviewId: "int1",
      parentSummaryId: "sum1",
      content: "Updated summary with new content",
      messageCount: 10, // 5 (existing) + 5 (new old messages, indices 5-9)
    });
  });

  it("falls back to truncation when summarization fails", async () => {
    const largeContent = "x".repeat(4000); // 1000 tokens each, 10k total - under 16k hard limit
    const messages = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      createdAt: new Date(),
    }));

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);
    mockGenerateResponse.mockRejectedValue(new Error("LLM failure"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await contextService.buildContextWindow("int1");

    // Should log error
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Context] Summarization failed, falling back to truncation:",
      expect.any(Error),
    );

    // Should NOT create summary
    expect(mockSummaryCreate).not.toHaveBeenCalled();

    // Should return last 10 messages (5 old + 5 recent)
    expect(result.messages).toHaveLength(10);

    consoleSpy.mockRestore();
  });

  it("includes existing summary in fallback when summarization fails", async () => {
    const largeContent = "x".repeat(4000); // 1000 tokens each - keep under 16k hard limit
    // Create 15 messages: alreadySummarized=5, old=5 (indices 5-9), recent=5 (indices 10-14)
    const messages = Array.from({ length: 15 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      createdAt: new Date(),
    }));

    const existingSummary = {
      id: "sum1",
      interviewId: "int1",
      parentSummaryId: null,
      content: "Previous summary",
      messageCount: 5,
      createdAt: new Date(),
    };

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(existingSummary);
    mockGenerateResponse.mockRejectedValue(new Error("LLM failure"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await contextService.buildContextWindow("int1");

    // Should include existing summary
    expect(result.messages[0]).toEqual({
      role: "assistant",
      content: "Previous summary",
    });

    // Should include last 10 messages (fallback) + summary
    expect(result.messages).toHaveLength(11);

    consoleSpy.mockRestore();
  });

  it("injects insights before last USER message as assistant role", async () => {
    const messages = [
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "First message",
        createdAt: new Date(),
      },
      {
        id: "m2",
        interviewId: "int1",
        role: "ASSISTANT" as const,
        content: "Response",
        createdAt: new Date(),
      },
      {
        id: "m3",
        interviewId: "int1",
        role: "USER" as const,
        content: "Second message",
        createdAt: new Date(),
      },
    ];

    const insights = [
      {
        id: "i1",
        bookId: "b1",
        interviewId: "int1",
        type: "ENTITY" as const,
        content: "sister Maria",
        explored: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "i2",
        bookId: "b1",
        interviewId: "int1",
        type: "EMOTION" as const,
        content: "nostalgia about childhood",
        explored: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue(insights);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1");

    // Messages should be: m1, m2, insights (as assistant), m3
    expect(result.messages).toEqual([
      { role: "user", content: "First message" },
      { role: "assistant", content: "Response" },
      {
        role: "assistant",
        content:
          "[Previous interview notes]\n- ENTITY: sister Maria\n- EMOTION: nostalgia about childhood",
      },
      { role: "user", content: "Second message" },
    ]);
  });

  it("filters out SYSTEM messages", async () => {
    const messages = [
      {
        id: "m1",
        interviewId: "int1",
        role: "SYSTEM" as const,
        content: "System message",
        createdAt: new Date(),
      },
      {
        id: "m2",
        interviewId: "int1",
        role: "USER" as const,
        content: "User message",
        createdAt: new Date(),
      },
      {
        id: "m3",
        interviewId: "int1",
        role: "ASSISTANT" as const,
        content: "Assistant message",
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1");

    // Should only include USER and ASSISTANT messages
    expect(result.messages).toEqual([
      { role: "user", content: "User message" },
      { role: "assistant", content: "Assistant message" },
    ]);
  });

  it("estimates tokens as chars / 4 rounded up", async () => {
    const messages = [
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "x".repeat(10), // 10 chars = 3 tokens (ceil(10/4))
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await contextService.buildContextWindow("int1");

    // Verify console.log was called with token breakdown
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Context] Token breakdown:",
      expect.objectContaining({
        systemPrompt: expect.any(Number),
        summary: 0,
        messages: 3, // ceil(10/4) = 3
        insights: 0,
        total: expect.any(Number),
      }),
    );

    consoleSpy.mockRestore();
  });

  it("logs token breakdown", async () => {
    const messages = [
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "Hello",
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await contextService.buildContextWindow("int1");

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Context] Token breakdown:",
      expect.objectContaining({
        systemPrompt: expect.any(Number),
        summary: expect.any(Number),
        messages: expect.any(Number),
        insights: expect.any(Number),
        total: expect.any(Number),
      }),
    );

    consoleSpy.mockRestore();
  });

  it("throws error when interview not found", async () => {
    mockInterviewFindById.mockResolvedValue(null);
    mockMessageFindByInterviewId.mockResolvedValue([]);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    await expect(
      contextService.buildContextWindow("nonexistent"),
    ).rejects.toThrow("Interview not found: nonexistent");
  });

  it("skips insight injection when no insights", async () => {
    const messages = [
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "First message",
        createdAt: new Date(),
      },
      {
        id: "m2",
        interviewId: "int1",
        role: "ASSISTANT" as const,
        content: "Response",
        createdAt: new Date(),
      },
      {
        id: "m3",
        interviewId: "int1",
        role: "USER" as const,
        content: "Second message",
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockInsightFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1");

    // Should not inject insights message
    expect(result.messages).toEqual([
      { role: "user", content: "First message" },
      { role: "assistant", content: "Response" },
      { role: "user", content: "Second message" },
    ]);
  });
});
