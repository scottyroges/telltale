// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockGenerateResponse = vi.hoisted(() => vi.fn());
const mockGenerateStreamingResponse = vi.hoisted(() => vi.fn());
vi.mock("@/lib/llm", () => ({
  llmProvider: {
    generateResponse: mockGenerateResponse,
    generateStreamingResponse: mockGenerateStreamingResponse,
  },
}));

const mockBuildContextWindow = vi.hoisted(() => vi.fn());
vi.mock("@/services/context.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/context.service")>();
  return {
    CORE_MEMORY_PREFIX: actual.CORE_MEMORY_PREFIX,
    contextService: {
      buildContextWindow: mockBuildContextWindow,
    },
  };
});

const mockMemoryUpdate = vi.hoisted(() => vi.fn());
vi.mock("@/services/memory.service", () => ({
  memoryService: {
    updateMemory: mockMemoryUpdate,
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

const mockBookFindById = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/book.repository", () => ({
  bookRepository: {
    findById: mockBookFindById,
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
    mockBookFindById.mockResolvedValue(defaultBook);
    mockMemoryUpdate.mockResolvedValue({ shouldComplete: false });
    const mod = await import("@/services/conversation.service");
    conversationService = mod.conversationService;
  });

  async function* mockStream(text: string) {
    for (const word of text.split(" ")) {
      yield word + " ";
    }
  }

  async function collectStream(generator: AsyncGenerator<{ type: string; text?: string; shouldComplete?: boolean }>) {
    const chunks: { type: string; text?: string; shouldComplete?: boolean }[] = [];
    let fullContent = "";
    let shouldComplete = false;
    for await (const chunk of generator) {
      chunks.push(chunk);
      if (chunk.type === "text" && chunk.text) {
        fullContent += chunk.text;
      }
      if (chunk.type === "done") {
        shouldComplete = chunk.shouldComplete ?? false;
      }
    }
    return { chunks, fullContent, shouldComplete };
  }

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
        systemPrompt: "system prompt",
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
        content: "Welcome! Tell me about your earliest memories.",
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
        "system prompt",
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

      // Memory service not called — no meaningful context at interview start
      expect(mockMemoryUpdate).not.toHaveBeenCalled();
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
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "topic message" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: "Welcome!",
      });
      mockMessageCreate.mockResolvedValue({});

      await conversationService.startInterview("b1", "childhood", "Sarah");

      // Context service gets null (no existing memory to prepare)
      expect(mockBuildContextWindow).toHaveBeenCalledWith("int1", "Sarah", null);

      // Memory service not called at interview start
      expect(mockMemoryUpdate).not.toHaveBeenCalled();
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
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "topic message" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: "Welcome!",
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
    it("streams text chunks and persists complete message", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [
          { role: "user", content: "topic message" },
          { role: "assistant", content: "opening question" },
          { role: "user", content: "my story" },
        ],
      });
      mockGenerateStreamingResponse.mockReturnValue(mockStream("That's fascinating! Tell me more."));

      const { fullContent, shouldComplete } = await collectStream(
        conversationService.sendMessage("int1", "b1", "my story", "Sarah"),
      );

      expect(fullContent).toBe("That's fascinating! Tell me more. ");
      expect(shouldComplete).toBe(false);

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

      // Streaming LLM called with context
      expect(mockGenerateStreamingResponse).toHaveBeenCalledWith(
        "system prompt",
        [
          { role: "user", content: "topic message" },
          { role: "assistant", content: "opening question" },
          { role: "user", content: "my story" },
        ],
      );

      // Persists assistant response (full accumulated text)
      expect(mockMessageCreate).toHaveBeenNthCalledWith(2, {
        interviewId: "int1",
        role: "ASSISTANT",
        content: "That's fascinating! Tell me more. ",
      });

      // Memory service called with correct args
      expect(mockMemoryUpdate).toHaveBeenCalledWith("int1", "b1", defaultBook.coreMemory);
    });

    it("auto-completes interview when memory service returns shouldComplete: true", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "yes, let's wrap up" }],
      });
      mockGenerateStreamingResponse.mockReturnValue(mockStream("Thank you for sharing!"));
      mockMemoryUpdate.mockResolvedValue({ shouldComplete: true });
      mockInterviewComplete.mockResolvedValue({});

      const { shouldComplete } = await collectStream(
        conversationService.sendMessage("int1", "b1", "yes, let's wrap up", "Sarah"),
      );

      expect(shouldComplete).toBe(true);
      expect(mockInterviewComplete).toHaveBeenCalledWith("int1");
    });

    it("propagates error when interviewRepository.complete() fails during auto-completion", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "yes, let's wrap up" }],
      });
      mockGenerateStreamingResponse.mockReturnValue(mockStream("Thank you for sharing!"));
      mockMemoryUpdate.mockResolvedValue({ shouldComplete: true });
      mockInterviewComplete.mockRejectedValue(new Error("DB connection lost"));

      await expect(
        collectStream(conversationService.sendMessage("int1", "b1", "yes, let's wrap up", "Sarah")),
      ).rejects.toThrow("DB connection lost");

      // Assistant message should still have been persisted before complete() was called
      expect(mockMessageCreate).toHaveBeenNthCalledWith(2, {
        interviewId: "int1",
        role: "ASSISTANT",
        content: "Thank you for sharing! ",
      });
    });

    it("does not complete interview when shouldComplete is false", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "tell me more" }],
      });
      mockGenerateStreamingResponse.mockReturnValue(mockStream("Tell me more about that."));

      const { shouldComplete } = await collectStream(
        conversationService.sendMessage("int1", "b1", "tell me more", "Sarah"),
      );

      expect(shouldComplete).toBe(false);
      expect(mockInterviewComplete).not.toHaveBeenCalled();
    });
  });

  describe("redirect", () => {
    it("streams text chunks, persists ASSISTANT message, and yields shouldComplete: false", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [
          { role: "user", content: "topic message" },
          { role: "assistant", content: "opening question" },
          { role: "user", content: "The storyteller would like to explore a different aspect" },
        ],
      });
      mockGenerateStreamingResponse.mockReturnValue(
        mockStream("What a wonderful story. Let me ask about something different."),
      );

      const { fullContent, shouldComplete } = await collectStream(
        conversationService.redirect("int1", "b1", "Sarah"),
      );

      expect(fullContent).toBe("What a wonderful story. Let me ask about something different. ");
      expect(shouldComplete).toBe(false);

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
        content: "What a wonderful story. Let me ask about something different. ",
      });

      // Memory service called
      expect(mockMemoryUpdate).toHaveBeenCalledWith("int1", "b1", defaultBook.coreMemory);
    });

    it("creates USER message with hidden: true", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "redirect prompt" }],
      });
      mockGenerateStreamingResponse.mockReturnValue(mockStream("Let me ask about something else."));

      await collectStream(conversationService.redirect("int1", "b1", "Sarah"));

      const firstCall = mockMessageCreate.mock.calls[0]![0];
      expect(firstCall.hidden).toBe(true);
    });

    it("does not call interviewRepository.complete even when memory returns shouldComplete: true", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "redirect prompt" }],
      });
      mockGenerateStreamingResponse.mockReturnValue(mockStream("Let me ask about something else."));
      mockMemoryUpdate.mockResolvedValue({ shouldComplete: true });

      await collectStream(conversationService.redirect("int1", "b1", "Sarah"));

      expect(mockInterviewComplete).not.toHaveBeenCalled();
    });
  });

  describe("memory block filtering", () => {
    it("strips memory block from streamed sendMessage response", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "my story" }],
      });

      async function* streamWithMemory() {
        yield "That sounds amazing! ";
        yield "Tell me more.\n\n";
        yield "[Your memory — what you know about this subject]\n";
        yield "## Book Memory\nKey people: Maria\n";
      }
      mockGenerateStreamingResponse.mockReturnValue(streamWithMemory());

      const { fullContent } = await collectStream(
        conversationService.sendMessage("int1", "b1", "my story", "Sarah"),
      );

      expect(fullContent).toBe("That sounds amazing! Tell me more.");
    });

    it("persists clean content without memory block", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "my story" }],
      });

      async function* streamWithMemory() {
        yield "Great story!\n\n";
        yield "[Your memory — what you know about this subject]\n";
        yield "## Book Memory\nStuff";
      }
      mockGenerateStreamingResponse.mockReturnValue(streamWithMemory());

      await collectStream(
        conversationService.sendMessage("int1", "b1", "my story", "Sarah"),
      );

      // The persisted ASSISTANT message should be clean
      const assistantCall = mockMessageCreate.mock.calls.find(
        (call) => call[0].role === "ASSISTANT",
      );
      expect(assistantCall![0].content).toBe("Great story!");
    });

    it("strips memory block from streamed redirect response", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "redirect prompt" }],
      });

      async function* streamWithMemory() {
        yield "Let's explore something else. ";
        yield "What about your school days?\n\n";
        yield "[Your memory — what you know about this subject]\n";
        yield "## Interview Memory\nTopic: school";
      }
      mockGenerateStreamingResponse.mockReturnValue(streamWithMemory());

      const { fullContent } = await collectStream(
        conversationService.redirect("int1", "b1", "Sarah"),
      );

      expect(fullContent).toBe("Let's explore something else. What about your school days?");
    });

    it("strips memory block from non-streaming startInterview response", async () => {
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
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "topic message" }],
      });
      mockGenerateResponse.mockResolvedValue({
        content: "Welcome! Tell me about your childhood.\n\n[Your memory — what you know about this subject]\n## Book Memory\nKey people: (none)",
      });
      mockMessageCreate.mockResolvedValue({});

      await conversationService.startInterview("b1", "childhood", "Sarah");

      const assistantCall = mockMessageCreate.mock.calls.find(
        (call) => call[0].role === "ASSISTANT",
      );
      expect(assistantCall![0].content).toBe("Welcome! Tell me about your childhood.");
    });

    it("passes through response unchanged when no memory block present", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "my story" }],
      });
      mockGenerateStreamingResponse.mockReturnValue(mockStream("That's fascinating! Tell me more."));

      const { fullContent } = await collectStream(
        conversationService.sendMessage("int1", "b1", "my story", "Sarah"),
      );

      expect(fullContent).toBe("That's fascinating! Tell me more. ");
    });

    it("handles memory marker split across stream chunks", async () => {
      mockMessageCreate.mockResolvedValue({});
      mockBuildContextWindow.mockResolvedValue({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "my story" }],
      });

      async function* streamWithSplitMarker() {
        yield "Great answer!\n\n[Your";
        yield " memory — what you know about this subject]\n## Book Memory";
      }
      mockGenerateStreamingResponse.mockReturnValue(streamWithSplitMarker());

      const { fullContent } = await collectStream(
        conversationService.sendMessage("int1", "b1", "my story", "Sarah"),
      );

      expect(fullContent).toBe("Great answer!");
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

});
