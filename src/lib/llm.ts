import "server-only";

import { AnthropicProvider } from "@/lib/anthropic-provider";

export const llmProvider = new AnthropicProvider();
