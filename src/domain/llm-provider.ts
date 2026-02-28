export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
}

export interface LLMGenerateOptions {
  maxTokens?: number;
}

export interface LLMProvider {
  generateResponse(
    systemPrompt: string,
    messages: LLMMessage[],
    options?: LLMGenerateOptions,
  ): Promise<LLMResponse>;

  generateStreamingResponse(
    systemPrompt: string,
    messages: LLMMessage[],
    options?: LLMGenerateOptions,
  ): AsyncIterable<string>;
}
