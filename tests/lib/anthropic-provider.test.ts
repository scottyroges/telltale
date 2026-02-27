// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/anthropic", () => ({
  anthropic: {
    messages: {
      create: mockCreate,
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
});
