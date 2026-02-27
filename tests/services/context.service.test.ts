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
    topic: "Tell me about your childhood",
    status: "ACTIVE" as const,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("returns empty messages for zero messages", async () => {
    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

    expect(result.messages).toEqual([]);
    expect(result.systemPrompt).toBeTruthy();
    expect(mockMessageFindByInterviewId).toHaveBeenCalledWith("int1", { includeHidden: true });
  });

  it("returns single message for one message", async () => {
    const messages = [
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "Hello",
        hidden: false,
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

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
        hidden: false,
        createdAt: new Date(),
      },
      {
        id: "m2",
        interviewId: "int1",
        role: "ASSISTANT" as const,
        content: "Response",
        hidden: false,
        createdAt: new Date(),
      },
      {
        id: "m3",
        interviewId: "int1",
        role: "USER" as const,
        content: "Second message",
        hidden: false,
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

    expect(result.messages).toEqual([
      { role: "user", content: "First message" },
      { role: "assistant", content: "Response" },
      { role: "user", content: "Second message" },
    ]);
    expect(mockSummaryCreate).not.toHaveBeenCalled();
  });

  it("returns all messages when over threshold but old bucket < 3000 tokens", async () => {
    // Create messages that exceed threshold (8000 tokens) but old bucket stays under 3000 tokens
    // 4 small messages (1000 chars each = 250 tokens each = 1000 tokens total for old bucket)
    // 1 large recent message (32000 chars = 8000 tokens)
    // Total = 9000 tokens (> 8000 threshold), old bucket = 1000 tokens (< 3000 threshold)
    const messages = [
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `m${i + 1}`,
        interviewId: "int1",
        role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
        content: "x".repeat(1000), // 1000 chars = 250 tokens
        hidden: false,
        createdAt: new Date(),
      })),
      {
        id: "m5",
        interviewId: "int1",
        role: "USER" as const,
        content: "x".repeat(32000), // 32000 chars = 8000 tokens (recent window)
        hidden: false,
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

    // Should return all messages (no summarization yet - old bucket < 3000 tokens)
    expect(result.messages).toHaveLength(5);
    expect(mockSummaryCreate).not.toHaveBeenCalled();
  });

  it("triggers summarization when old bucket >= 3000 tokens", async () => {
    // Create 10 messages: each is 8000 chars = 2000 tokens
    // Recent window (2000 tokens) will have 1 message, old will have 9 messages (18000 tokens)
    const largeContent = "x".repeat(8000);
    const messages = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      hidden: false,
      createdAt: new Date(),
    }));

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);
    mockGenerateResponse.mockResolvedValue({
      content: "Summary of old messages",
    });

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

    // Should create summary with 9 old messages
    expect(mockSummaryCreate).toHaveBeenCalledWith({
      interviewId: "int1",
      parentSummaryId: undefined,
      content: "Summary of old messages",
      messageCount: 9,
    });

    // Should return summary + recent 1 message
    expect(result.messages[0]).toEqual({
      role: "assistant",
      content: "Summary of old messages",
    });
    expect(result.messages).toHaveLength(2); // 1 summary + 1 recent
  });

  it("incorporates existing summary when creating new summary", async () => {
    const largeContent = "x".repeat(8000);
    // Create 15 messages: each is 8000 chars = 2000 tokens
    // alreadySummarized=5, recent (2000 tokens) = 1 message, old = 9 messages (indices 5-13)
    const messages = Array.from({ length: 15 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      hidden: false,
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
    mockSummaryFindLatest.mockResolvedValue(existingSummary);
    mockGenerateResponse.mockResolvedValue({
      content: "Updated summary with new content",
    });

    await contextService.buildContextWindow("int1", "Sarah", null);

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
      messageCount: 14, // 5 (existing) + 9 (new old messages, indices 5-13)
    });
  });

  it("falls back to truncation when summarization fails", async () => {
    const largeContent = "x".repeat(4000); // 1000 tokens each
    const messages = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      hidden: false,
      createdAt: new Date(),
    }));

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);
    mockGenerateResponse.mockRejectedValue(new Error("LLM failure"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

    // Should log error
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Context] Summarization failed, falling back to truncation:",
      expect.any(Error),
    );

    // Should NOT create summary
    expect(mockSummaryCreate).not.toHaveBeenCalled();

    // Should return last 4 messages (fallback budget = 4000 tokens, each message = 1000 tokens)
    expect(result.messages).toHaveLength(4);

    consoleSpy.mockRestore();
  });

  it("includes existing summary in fallback when summarization fails", async () => {
    const largeContent = "x".repeat(4000); // 1000 tokens each
    // Create 15 messages
    const messages = Array.from({ length: 15 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      hidden: false,
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
    mockSummaryFindLatest.mockResolvedValue(existingSummary);
    mockGenerateResponse.mockRejectedValue(new Error("LLM failure"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

    // Should include existing summary
    expect(result.messages[0]).toEqual({
      role: "assistant",
      content: "Previous summary",
    });

    // Should include summary + last 4 messages (fallback budget = 4000 tokens, each message = 1000 tokens)
    expect(result.messages).toHaveLength(5);

    consoleSpy.mockRestore();
  });

  it("injects core memory before last message as assistant role", async () => {
    const messages = [
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "First message",
        hidden: false,
        createdAt: new Date(),
      },
      {
        id: "m2",
        interviewId: "int1",
        role: "ASSISTANT" as const,
        content: "Response",
        hidden: false,
        createdAt: new Date(),
      },
      {
        id: "m3",
        interviewId: "int1",
        role: "USER" as const,
        content: "Second message",
        hidden: false,
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);

    const coreMemory = "## Book Memory\nKey people: Maria\n\n## Interview Memory\nTopic: childhood";

    const result = await contextService.buildContextWindow("int1", "Sarah", coreMemory);

    // Messages should be: m1, m2, core memory (as assistant), m3
    expect(result.messages).toEqual([
      { role: "user", content: "First message" },
      { role: "assistant", content: "Response" },
      {
        role: "assistant",
        content: `[Your memory — what you know about this subject]\n${coreMemory}`,
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
        hidden: false,
        createdAt: new Date(),
      },
      {
        id: "m2",
        interviewId: "int1",
        role: "USER" as const,
        content: "User message",
        hidden: false,
        createdAt: new Date(),
      },
      {
        id: "m3",
        interviewId: "int1",
        role: "ASSISTANT" as const,
        content: "Assistant message",
        hidden: false,
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

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
        hidden: false,
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await contextService.buildContextWindow("int1", "Sarah", null);

    // Verify console.log was called with token breakdown
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Context] Token breakdown:",
      expect.objectContaining({
        systemPrompt: expect.any(Number),
        summary: 0,
        messages: 3, // ceil(10/4) = 3
        coreMemory: 0,
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
        hidden: false,
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await contextService.buildContextWindow("int1", "Sarah", null);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Context] Token breakdown:",
      expect.objectContaining({
        systemPrompt: expect.any(Number),
        summary: expect.any(Number),
        messages: expect.any(Number),
        coreMemory: expect.any(Number),
        total: expect.any(Number),
      }),
    );

    consoleSpy.mockRestore();
  });

  it("throws error when interview not found", async () => {
    mockInterviewFindById.mockResolvedValue(null);
    mockMessageFindByInterviewId.mockResolvedValue([]);
    mockSummaryFindLatest.mockResolvedValue(null);

    await expect(
      contextService.buildContextWindow("nonexistent", "Sarah", null),
    ).rejects.toThrow("Interview not found: nonexistent");
  });

  it("skips core memory injection when coreMemory is null", async () => {
    const messages = [
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "First message",
        hidden: false,
        createdAt: new Date(),
      },
      {
        id: "m2",
        interviewId: "int1",
        role: "ASSISTANT" as const,
        content: "Response",
        hidden: false,
        createdAt: new Date(),
      },
      {
        id: "m3",
        interviewId: "int1",
        role: "USER" as const,
        content: "Second message",
        hidden: false,
        createdAt: new Date(),
      },
    ];

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

    // Should not inject core memory message
    expect(result.messages).toEqual([
      { role: "user", content: "First message" },
      { role: "assistant", content: "Response" },
      { role: "user", content: "Second message" },
    ]);
  });

  it("enforceMaxTokens preserves core memory message during truncation", async () => {
    // MAX_CONTEXT_TOKENS = 16000. System prompt ~700 tokens.
    // Create 4 large messages at 5000 tokens each (20000 chars) = 20000 tokens.
    // Core memory ~100 tokens. Total ~20800, well over 16k.
    // Without pinning, backwards walk keeps last 3 messages (15000 tokens + 700 sys = 15700).
    // Core memory at second-to-last position (index 2) would be dropped.
    // With pinning, core memory is reserved, then backwards walk fills remaining budget.
    const largeContent = "x".repeat(20000); // 5000 tokens each
    const messages = Array.from({ length: 4 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      hidden: false,
      createdAt: new Date(),
    }));

    const coreMemory = "## Book Memory\nKey people: Maria\n\n## Interview Memory\nTopic: childhood";

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);
    // Summarization will be triggered — mock it to succeed with short summary
    mockGenerateResponse.mockResolvedValue({ content: "Summary" });

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await contextService.buildContextWindow("int1", "Sarah", coreMemory);

    // Core memory message should be present in the result
    const coreMemoryMsg = result.messages.find((m) =>
      m.content.startsWith("[Your memory"),
    );
    expect(coreMemoryMsg).toBeDefined();
    expect(coreMemoryMsg!.content).toContain("Key people: Maria");

    // Core memory should be second-to-last
    expect(result.messages[result.messages.length - 2]).toBe(coreMemoryMsg);

    consoleSpy.mockRestore();
  });

  it("enforces MAX_CONTEXT_TOKENS by truncating to most recent messages", async () => {
    // Create messages totaling > 16k tokens
    // Each message: 20000 chars = 5000 tokens (ceil(20000/4))
    // 5 messages = 25000 tokens total (exceeds both summarization threshold and 16k limit)
    // Old bucket (20000 tokens) exceeds 3000 token threshold, triggering summarization
    // Summarization will fail (no mock setup), falling back to truncation (4000 token limit)
    const largeContent = "x".repeat(20000);
    const messages = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: largeContent,
      hidden: false,
      createdAt: new Date(),
    }));

    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue(messages);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

    // Fallback truncation limits to RECENT_WINDOW_TOKENS * 2 = 4000 tokens
    // At 5000 tokens per message, we should have 0 complete messages after truncation
    // But fallback always includes at least 1 message for continuity
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.messages.length).toBeLessThan(5);

    // Should keep the most recent messages (last messages in the array)
    // The last message should be the most recent user message (m5)
    const lastMessage = result.messages[result.messages.length - 1];
    expect(lastMessage).toBeDefined();
    expect(lastMessage!.content).toBe(largeContent);
    expect(lastMessage!.role).toBe("user");
  });

  it("includes user name in system prompt when provided", async () => {
    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue([
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "Hello",
        hidden: false,
        createdAt: new Date(),
      },
    ]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1", "Sarah", null);

    expect(result.systemPrompt).toContain("Sarah");
    expect(result.systemPrompt).toContain("The storyteller's name is Sarah");
  });

  it("uses default prompt when user name is empty", async () => {
    mockInterviewFindById.mockResolvedValue(mockInterview);
    mockMessageFindByInterviewId.mockResolvedValue([
      {
        id: "m1",
        interviewId: "int1",
        role: "USER" as const,
        content: "Hello",
        hidden: false,
        createdAt: new Date(),
      },
    ]);
    mockSummaryFindLatest.mockResolvedValue(null);

    const result = await contextService.buildContextWindow("int1", "", null);

    expect(result.systemPrompt).not.toContain("storyteller's name is");
    expect(result.systemPrompt).toContain("skilled life story interviewer");
  });
});
