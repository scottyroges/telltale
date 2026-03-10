import "server-only";

import { llmProvider } from "@/lib/llm";
import { interviewRepository } from "@/repositories/interview.repository";
import { messageRepository } from "@/repositories/message.repository";
import { interviewSummaryRepository } from "@/repositories/interview-summary.repository";
import { getConversationSystemPrompt } from "@/prompts/interviewer";
import { SUMMARIZATION_PROMPT } from "@/prompts/summarization";
import type { LLMMessage } from "@/domain/llm-provider";
import type { Message } from "@/domain/message";

const MAX_CONTEXT_TOKENS = 16000;
const SUMMARIZATION_THRESHOLD = 8000;
const RECENT_WINDOW_TOKENS = 2000; // Token budget for recent messages
const OLD_BUCKET_TOKENS = 3000; // Token threshold to trigger summarization of old messages

export interface ContextWindow {
  systemPrompt: string;
  messages: LLMMessage[];
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildCoreMemoryContextMessage(coreMemory: string): string {
  return `${CORE_MEMORY_PREFIX}\n${coreMemory}`;
}

function assembleMessagesWithCoreMemory(
  messages: Message[],
  coreMemory: string | null,
): LLMMessage[] {
  const llmMessages: LLMMessage[] = [];

  // Convert all messages except the last one
  if (messages.length > 0) {
    const conversationMessages = messages.map((msg) => ({
      role: msg.role.toLowerCase() as "user" | "assistant",
      content: msg.content,
    }));

    llmMessages.push(...conversationMessages.slice(0, -1));
  }

  // Inject core memory before the last message as user role (ADR 018)
  if (coreMemory) {
    llmMessages.push({
      role: "user",
      content: buildCoreMemoryContextMessage(coreMemory),
    });
  }

  // Add the final message
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1]!;
    llmMessages.push({
      role: lastMessage.role.toLowerCase() as "user" | "assistant",
      content: lastMessage.content,
    });
  }

  return llmMessages;
}

async function summarizeMessages(
  messages: Message[],
  existingSummary?: string,
): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  const summaryInput = existingSummary
    ? `Previous summary: ${existingSummary}\n\nNew messages to incorporate:\n${transcript}`
    : `New messages to incorporate:\n${transcript}`;

  const response = await llmProvider.generateResponse(
    SUMMARIZATION_PROMPT,
    [{ role: "user", content: summaryInput }],
    { maxTokens: 2048 },
  );

  return response.content.trim();
}

interface TokenBreakdown {
  systemPrompt: number;
  summary: number;
  messages: number;
  coreMemory: number;
  total: number;
}

interface MessageBuckets {
  recent: Message[];
  old: Message[];
  alreadySummarizedCount: number;
  recentTokens: number;
  oldTokens: number;
}

function calculateTokenBreakdown(
  conversationMessages: Message[],
  existingSummary: Awaited<
    ReturnType<typeof interviewSummaryRepository.findLatestByInterviewId>
  >,
  coreMemory: string | null,
  systemPrompt: string,
): TokenBreakdown {
  const systemPromptTokens = estimateTokens(systemPrompt);
  const summaryTokens = existingSummary
    ? estimateTokens(existingSummary.content)
    : 0;
  const messagesTokens = estimateTokens(
    conversationMessages.map((m) => m.content).join("\n"),
  );
  const coreMemoryTokens = coreMemory
    ? estimateTokens(buildCoreMemoryContextMessage(coreMemory))
    : 0;
  const totalTokens =
    systemPromptTokens + summaryTokens + messagesTokens + coreMemoryTokens;

  console.log("[Context] Token breakdown:", {
    systemPrompt: systemPromptTokens,
    summary: summaryTokens,
    messages: messagesTokens,
    coreMemory: coreMemoryTokens,
    total: totalTokens,
  });

  return {
    systemPrompt: systemPromptTokens,
    summary: summaryTokens,
    messages: messagesTokens,
    coreMemory: coreMemoryTokens,
    total: totalTokens,
  };
}

function calculateMessageBuckets(
  conversationMessages: Message[],
  existingSummary: Awaited<
    ReturnType<typeof interviewSummaryRepository.findLatestByInterviewId>
  >,
): MessageBuckets {
  const alreadySummarizedCount = existingSummary?.messageCount ?? 0;

  // Walk backward from the latest message, accumulating tokens for recent window
  const recent: Message[] = [];
  let recentTokens = 0;

  for (let i = conversationMessages.length - 1; i >= alreadySummarizedCount; i--) {
    const msg = conversationMessages[i]!;
    const msgTokens = estimateTokens(msg.content);

    // Always include at least the most recent message, even if it exceeds the budget
    // For subsequent messages, only add if they fit within the token budget
    if (recent.length > 0 && recentTokens + msgTokens > RECENT_WINDOW_TOKENS) {
      break;
    }

    recent.unshift(msg); // Add to front since we're walking backward
    recentTokens += msgTokens;
  }

  // Old messages = everything between already summarized and recent window
  const recentStartIndex = conversationMessages.length - recent.length;
  const old = conversationMessages.slice(alreadySummarizedCount, recentStartIndex);

  const oldTokens = old.reduce(
    (sum, msg) => sum + estimateTokens(msg.content),
    0,
  );

  console.log("[Context] Message buckets:", {
    recent: { count: recent.length, tokens: recentTokens },
    old: { count: old.length, tokens: oldTokens },
    alreadySummarized: alreadySummarizedCount,
  });

  return { recent, old, alreadySummarizedCount, recentTokens, oldTokens };
}

function assembleUnderThreshold(
  conversationMessages: Message[],
  coreMemory: string | null,
  systemPrompt: string,
): ContextWindow {
  return {
    systemPrompt,
    messages: assembleMessagesWithCoreMemory(conversationMessages, coreMemory),
  };
}

async function assembleSummarized(
  interviewId: string,
  conversationMessages: Message[],
  buckets: MessageBuckets,
  coreMemory: string | null,
  existingSummary: Awaited<
    ReturnType<typeof interviewSummaryRepository.findLatestByInterviewId>
  >,
  systemPrompt: string,
): Promise<ContextWindow> {
  try {
    const newSummaryContent = await summarizeMessages(
      buckets.old,
      existingSummary?.content,
    );
    await interviewSummaryRepository.create({
      interviewId,
      parentSummaryId: existingSummary?.id,
      content: newSummaryContent,
      messageCount: buckets.alreadySummarizedCount + buckets.old.length,
    });

    // Return summary message + recent messages
    const messages: LLMMessage[] = [
      { role: "assistant", content: newSummaryContent },
    ];
    messages.push(
      ...assembleMessagesWithCoreMemory(buckets.recent, coreMemory),
    );

    return {
      systemPrompt,
      messages,
    };
  } catch (error) {
    console.error(
      "[Context] Summarization failed, falling back to truncation:",
      error,
    );

    // Fallback: keep recent messages that fit within double the recent window token budget
    const fallbackTokenBudget = RECENT_WINDOW_TOKENS * 2;
    const fallbackMessages: Message[] = [];
    let fallbackTokens = 0;

    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msg = conversationMessages[i]!;
      const msgTokens = estimateTokens(msg.content);

      // Always include at least the most recent message
      if (
        fallbackMessages.length > 0 &&
        fallbackTokens + msgTokens > fallbackTokenBudget
      ) {
        break;
      }

      fallbackMessages.unshift(msg);
      fallbackTokens += msgTokens;
    }

    const messages: LLMMessage[] = [];

    // Include existing summary if available
    if (existingSummary) {
      messages.push({
        role: "assistant",
        content: existingSummary.content,
      });
    }

    messages.push(...assembleMessagesWithCoreMemory(fallbackMessages, coreMemory));

    return {
      systemPrompt,
      messages,
    };
  }
}

function assembleIncremental(
  buckets: MessageBuckets,
  coreMemory: string | null,
  existingSummary: Awaited<
    ReturnType<typeof interviewSummaryRepository.findLatestByInterviewId>
  >,
  systemPrompt: string,
): ContextWindow {
  const messages: LLMMessage[] = [];

  // Include existing summary if available
  if (existingSummary) {
    messages.push({ role: "assistant", content: existingSummary.content });
  }

  // Combine old + recent messages
  const combinedMessages = [...buckets.old, ...buckets.recent];
  messages.push(...assembleMessagesWithCoreMemory(combinedMessages, coreMemory));

  return {
    systemPrompt,
    messages,
  };
}

export const CORE_MEMORY_PREFIX = "[Your memory — what you know about this subject]";

function enforceMaxTokens(context: ContextWindow): ContextWindow {
  const systemPromptTokens = estimateTokens(context.systemPrompt);
  const messagesTokens = estimateTokens(
    context.messages.map((m) => m.content).join("\n"),
  );
  const totalTokens = systemPromptTokens + messagesTokens;

  // Under hard limit: return as-is
  if (totalTokens <= MAX_CONTEXT_TOKENS) {
    return context;
  }

  console.warn(
    `[Context] Exceeded MAX_CONTEXT_TOKENS (${totalTokens} > ${MAX_CONTEXT_TOKENS}), applying aggressive truncation`,
  );

  // Find and reserve the core memory message
  const coreMemoryIndex = context.messages.findIndex(
    (m) => m.content.startsWith(CORE_MEMORY_PREFIX),
  );
  let runningTotal = systemPromptTokens;

  if (coreMemoryIndex !== -1) {
    runningTotal += estimateTokens(context.messages[coreMemoryIndex]!.content);
  }

  // Over hard limit: keep only the most recent messages that fit
  const messages: LLMMessage[] = [];

  // Work backwards from the most recent message, skipping core memory
  for (let i = context.messages.length - 1; i >= 0; i--) {
    if (i === coreMemoryIndex) continue;

    const msg = context.messages[i]!;
    const msgTokens = estimateTokens(msg.content);

    if (runningTotal + msgTokens > MAX_CONTEXT_TOKENS) {
      console.warn(
        `[Context] Truncated to ${messages.length} most recent messages`,
      );
      break;
    }

    messages.unshift(msg);
    runningTotal += msgTokens;
  }

  // Re-insert core memory in its original position relative to kept messages
  if (coreMemoryIndex !== -1) {
    const coreMemoryMsg = context.messages[coreMemoryIndex]!;
    // Insert second-to-last (before the final message) if we have messages
    if (messages.length > 0) {
      messages.splice(messages.length - 1, 0, coreMemoryMsg);
    } else {
      messages.push(coreMemoryMsg);
    }
  }

  return {
    systemPrompt: context.systemPrompt,
    messages,
  };
}

export const contextService = {
  async buildContextWindow(interviewId: string, userName: string, coreMemory: string | null): Promise<ContextWindow> {
    // Load all required data
    const [interview, allMessages, existingSummary] =
      await Promise.all([
        interviewRepository.findById(interviewId),
        messageRepository.findByInterviewId(interviewId, { includeHidden: true }),
        interviewSummaryRepository.findLatestByInterviewId(interviewId),
      ]);

    if (!interview) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    const systemPrompt = getConversationSystemPrompt(userName);

    // Filter to USER + ASSISTANT only (exclude SYSTEM)
    const conversationMessages = allMessages.filter(
      (msg) => msg.role === "USER" || msg.role === "ASSISTANT",
    );

    // If no messages, return empty context
    if (conversationMessages.length === 0) {
      return {
        systemPrompt,
        messages: [],
      };
    }

    // Calculate token usage
    const tokenBreakdown = calculateTokenBreakdown(
      conversationMessages,
      existingSummary,
      coreMemory,
      systemPrompt,
    );

    // Under threshold: return all messages
    if (tokenBreakdown.total < SUMMARIZATION_THRESHOLD) {
      const context = assembleUnderThreshold(conversationMessages, coreMemory, systemPrompt);
      return enforceMaxTokens(context);
    }

    // Over threshold: split into buckets
    const buckets = calculateMessageBuckets(
      conversationMessages,
      existingSummary,
    );

    // Enough old tokens: trigger summarization
    if (buckets.oldTokens >= OLD_BUCKET_TOKENS) {
      const context = await assembleSummarized(
        interviewId,
        conversationMessages,
        buckets,
        coreMemory,
        existingSummary,
        systemPrompt,
      );
      return enforceMaxTokens(context);
    }

    // Not enough old messages: incremental assembly
    const context = assembleIncremental(buckets, coreMemory, existingSummary, systemPrompt);
    return enforceMaxTokens(context);
  },
};
