// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.hoisted(() => vi.fn());
const mockStream = vi.hoisted(() => vi.fn());

vi.mock("@/lib/anthropic", () => ({
  anthropic: {
    messages: {
      create: mockCreate,
      stream: mockStream,
    },
  },
}));

describe("AnthropicProvider", () => {
  let provider: Awaited<
    typeof import("@/lib/anthropic-provider")
  >["AnthropicProvider"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/anthropic-provider");
    provider = mod.AnthropicProvider;
  });

  it("maps messages and passes system prompt to Anthropic", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Hello there!" }],
    });

    const instance = new provider();
    await instance.generateResponse("You are helpful.", [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
      { role: "user", content: "How are you?" },
    ]);

    expect(mockCreate).toHaveBeenCalledWith({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      temperature: 0.7,
      system: "You are helpful.",
      messages: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello" },
        { role: "user", content: "How are you?" },
      ],
    });
  });

  it("extracts text content from Anthropic response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "The extracted response" }],
    });

    const instance = new provider();
    const result = await instance.generateResponse("system", [
      { role: "user", content: "test" },
    ]);

    expect(result).toEqual({ content: "The extracted response" });
  });

  it("throws when no text block in response", async () => {
    mockCreate.mockResolvedValue({
      content: [],
    });

    const instance = new provider();
    await expect(
      instance.generateResponse("system", [
        { role: "user", content: "test" },
      ]),
    ).rejects.toThrow("Anthropic response contained no text content");
  });

  it("respects maxTokens option", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "response" }],
    });

    const instance = new provider();
    await instance.generateResponse(
      "system",
      [{ role: "user", content: "test" }],
      { maxTokens: 2048 },
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 2048,
      }),
    );
  });

  describe("generateStreamingResponse", () => {
    function createFakeStream(events: Array<Record<string, unknown>>) {
      return {
        async *[Symbol.asyncIterator]() {
          for (const event of events) {
            yield event;
          }
        },
      };
    }

    async function drain(iter: AsyncIterable<unknown>) {
      for await (const _ of iter) {
        /* exhaust */
      }
    }

    it("yields text chunks from stream", async () => {
      mockStream.mockReturnValue(
        createFakeStream([
          { type: "message_start", message: {} },
          { type: "content_block_start", index: 0 },
          {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Hello" },
          },
          {
            type: "content_block_delta",
            delta: { type: "text_delta", text: " world" },
          },
          { type: "content_block_stop", index: 0 },
          { type: "message_stop" },
        ]),
      );

      const instance = new provider();
      const chunks: string[] = [];
      for await (const chunk of instance.generateStreamingResponse("system", [
        { role: "user", content: "test" },
      ])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["Hello", " world"]);
    });

    it("passes correct parameters to SDK", async () => {
      mockStream.mockReturnValue(createFakeStream([]));

      const instance = new provider();
      await drain(
        instance.generateStreamingResponse("You are helpful.", [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello" },
        ]),
      );

      expect(mockStream).toHaveBeenCalledWith({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2048,
        temperature: 0.7,
        system: "You are helpful.",
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello" },
        ],
      });
    });

    it("respects maxTokens option", async () => {
      mockStream.mockReturnValue(createFakeStream([]));

      const instance = new provider();
      await drain(
        instance.generateStreamingResponse(
          "system",
          [{ role: "user", content: "test" }],
          { maxTokens: 512 },
        ),
      );

      expect(mockStream).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 512,
        }),
      );
    });

    it("propagates mid-stream errors", async () => {
      const error = new Error("Stream interrupted");
      mockStream.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "partial" },
          };
          throw error;
        },
      });

      const instance = new provider();
      const chunks: string[] = [];

      await expect(async () => {
        for await (const chunk of instance.generateStreamingResponse(
          "system",
          [{ role: "user", content: "test" }],
        )) {
          chunks.push(chunk);
        }
      }).rejects.toThrow("Stream interrupted");

      expect(chunks).toEqual(["partial"]);
    });

    it("handles stream with no text deltas", async () => {
      mockStream.mockReturnValue(
        createFakeStream([
          { type: "message_start", message: {} },
          { type: "content_block_start", index: 0 },
          { type: "content_block_stop", index: 0 },
          { type: "message_stop" },
        ]),
      );

      const instance = new provider();
      const chunks: string[] = [];
      for await (const chunk of instance.generateStreamingResponse("system", [
        { role: "user", content: "test" },
      ])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([]);
    });
  });
});
