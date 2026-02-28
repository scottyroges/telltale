// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockGenerateResponse = vi.hoisted(() => vi.fn());
vi.mock("@/lib/llm", () => ({
  llmProvider: { generateResponse: mockGenerateResponse },
}));

const mockMessageFindByInterviewId = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/message.repository", () => ({
  messageRepository: {
    findByInterviewId: mockMessageFindByInterviewId,
  },
}));

const mockBookUpdateCoreMemory = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/book.repository", () => ({
  bookRepository: {
    updateCoreMemory: mockBookUpdateCoreMemory,
  },
}));

describe("memoryService", () => {
  let memoryService: Awaited<
    typeof import("@/services/memory.service")
  >["memoryService"];

  const recentMessages = [
    { id: "m1", interviewId: "int1", role: "USER" as const, content: "Tell me about your childhood", hidden: false, createdAt: new Date() },
    { id: "m2", interviewId: "int1", role: "ASSISTANT" as const, content: "I'd love to hear about that!", hidden: false, createdAt: new Date() },
    { id: "m3", interviewId: "int1", role: "USER" as const, content: "I grew up in a small town", hidden: false, createdAt: new Date() },
    { id: "m4", interviewId: "int1", role: "ASSISTANT" as const, content: "What was that like?", hidden: false, createdAt: new Date() },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockMessageFindByInterviewId.mockResolvedValue(recentMessages);
    mockBookUpdateCoreMemory.mockResolvedValue({});
    const mod = await import("@/services/memory.service");
    memoryService = mod.memoryService;
  });

  it("updates core memory on successful LLM response", async () => {
    mockGenerateResponse.mockResolvedValue({
      content: '{"updatedCoreMemory":"## Book Memory\\nKey people: Maria\\n\\n## Interview Memory\\nTopic: childhood","shouldComplete":false}',
    });

    const result = await memoryService.updateMemory("int1", "b1", "existing memory");

    expect(result).toEqual({ shouldComplete: false });
    expect(mockBookUpdateCoreMemory).toHaveBeenCalledWith(
      "b1",
      "## Book Memory\nKey people: Maria\n\n## Interview Memory\nTopic: childhood",
    );
  });

  it("returns shouldComplete: true when LLM indicates completion", async () => {
    mockGenerateResponse.mockResolvedValue({
      content: '{"updatedCoreMemory":"## Book Memory\\nFinal","shouldComplete":true}',
    });

    const result = await memoryService.updateMemory("int1", "b1", "existing memory");

    expect(result).toEqual({ shouldComplete: true });
  });

  it("passes correct context to LLM", async () => {
    mockGenerateResponse.mockResolvedValue({
      content: '{"updatedCoreMemory":"updated","shouldComplete":false}',
    });

    await memoryService.updateMemory("int1", "b1", "## Book Memory\nKey people: Maria");

    expect(mockGenerateResponse).toHaveBeenCalledWith(
      expect.stringContaining("internal note-taker"),
      [
        {
          role: "user",
          content: expect.stringContaining("## Book Memory\nKey people: Maria"),
        },
      ],
    );

    // Verify transcript is included
    const contextMessage = mockGenerateResponse.mock.calls[0]![1][0].content;
    expect(contextMessage).toContain("USER: Tell me about your childhood");
    expect(contextMessage).toContain("ASSISTANT: What was that like?");
  });

  it("fetches last 4 messages for context", async () => {
    const manyMessages = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i + 1}`,
      interviewId: "int1",
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: `Message ${i + 1}`,
      hidden: false,
      createdAt: new Date(),
    }));
    mockMessageFindByInterviewId.mockResolvedValue(manyMessages);
    mockGenerateResponse.mockResolvedValue({
      content: '{"updatedCoreMemory":"updated","shouldComplete":false}',
    });

    await memoryService.updateMemory("int1", "b1", "memory");

    const contextMessage = mockGenerateResponse.mock.calls[0]![1][0].content;
    // Should only contain the last 4 messages (7, 8, 9, 10)
    expect(contextMessage).not.toContain("Message 6");
    expect(contextMessage).toContain("Message 7");
    expect(contextMessage).toContain("Message 8");
    expect(contextMessage).toContain("Message 9");
    expect(contextMessage).toContain("Message 10");
  });

  it("handles null core memory", async () => {
    mockGenerateResponse.mockResolvedValue({
      content: '{"updatedCoreMemory":"## Book Memory\\nNew","shouldComplete":false}',
    });

    await memoryService.updateMemory("int1", "b1", null);

    const contextMessage = mockGenerateResponse.mock.calls[0]![1][0].content;
    expect(contextMessage).toContain("No existing memory for this subject");
  });

  it("does not update memory when updatedCoreMemory is null", async () => {
    mockGenerateResponse.mockResolvedValue({
      content: '{"shouldComplete":false}',
    });

    const result = await memoryService.updateMemory("int1", "b1", "existing");

    expect(result).toEqual({ shouldComplete: false });
    expect(mockBookUpdateCoreMemory).not.toHaveBeenCalled();
  });

  it("catches LLM errors and returns safe default", async () => {
    mockGenerateResponse.mockRejectedValue(new Error("LLM timeout"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await memoryService.updateMemory("int1", "b1", "existing");

    expect(result).toEqual({ shouldComplete: false });
    expect(mockBookUpdateCoreMemory).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Memory] Failed to update memory:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("catches JSON parse errors and returns safe default", async () => {
    mockGenerateResponse.mockResolvedValue({
      content: "This is not valid JSON at all",
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await memoryService.updateMemory("int1", "b1", "existing");

    expect(result).toEqual({ shouldComplete: false });
    expect(mockBookUpdateCoreMemory).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("catches DB write errors and returns safe default", async () => {
    mockGenerateResponse.mockResolvedValue({
      content: '{"updatedCoreMemory":"## Book Memory\\nNew","shouldComplete":false}',
    });
    mockBookUpdateCoreMemory.mockRejectedValue(new Error("DB connection lost"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await memoryService.updateMemory("int1", "b1", "existing");

    expect(result).toEqual({ shouldComplete: false });
    expect(consoleSpy).toHaveBeenCalledWith(
      "[Memory] Failed to update memory:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
