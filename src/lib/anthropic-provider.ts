import { anthropic } from "@/lib/anthropic";
import type {
  LLMProvider,
  LLMMessage,
  LLMResponse,
  LLMGenerateOptions,
} from "@/domain/llm-provider";

const MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_MAX_TOKENS = 2048;
const TEMPERATURE = 0.7;

export class AnthropicProvider implements LLMProvider {
  async generateResponse(
    systemPrompt: string,
    messages: LLMMessage[],
    options?: LLMGenerateOptions,
  ): Promise<LLMResponse> {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock) {
      throw new Error("Anthropic response contained no text content");
    }
    return { content: textBlock.text };
  }

  async *generateStreamingResponse(
    systemPrompt: string,
    messages: LLMMessage[],
    options?: LLMGenerateOptions,
  ): AsyncGenerator<string> {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
