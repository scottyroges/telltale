import "server-only";

import { llmProvider } from "@/lib/llm";
import { interviewRepository } from "@/repositories/interview.repository";
import { messageRepository } from "@/repositories/message.repository";
import { insightRepository } from "@/repositories/insight.repository";
import { interviewSummaryRepository } from "@/repositories/interview-summary.repository";
import { INTERVIEWER_SYSTEM_PROMPT } from "@/prompts/interviewer";
import { SUMMARIZATION_PROMPT } from "@/prompts/summarization";
import type { LLMMessage } from "@/domain/llm-provider";
import type { Message } from "@/domain/message";
import type { Insight } from "@/domain/insight";

const MAX_CONTEXT_TOKENS = 16000;
const SUMMARIZATION_THRESHOLD = 8000;
const RECENT_WINDOW_SIZE = 5;
const SUMMARIZATION_BATCH_SIZE = 5;

export interface ContextWindow {
  systemPrompt: string;
  messages: LLMMessage[];
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildInsightContextMessage(insights: Insight[]): string {
  const notes = insights.map((i) => `- ${i.type}: ${i.content}`).join("\n");
  return `[Previous interview notes]\n${notes}`;
}

function assembleMessagesWithInsights(
  messages: Message[],
  insights: Insight[],
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

  // Inject insights before the last message as assistant role
  if (insights.length > 0) {
    llmMessages.push({
      role: "assistant",
      content: buildInsightContextMessage(insights),
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
  insights: number;
  total: number;
}

interface MessageBuckets {
  recent: Message[];
  old: Message[];
  alreadySummarizedCount: number;
}

function calculateTokenBreakdown(
  conversationMessages: Message[],
  existingSummary: Awaited<
    ReturnType<typeof interviewSummaryRepository.findLatestByInterviewId>
  >,
  insights: Insight[],
): TokenBreakdown {
  const systemPromptTokens = estimateTokens(INTERVIEWER_SYSTEM_PROMPT);
  const summaryTokens = existingSummary
    ? estimateTokens(existingSummary.content)
    : 0;
  const messagesTokens = estimateTokens(
    conversationMessages.map((m) => m.content).join("\n"),
  );
  const insightsTokens =
    insights.length > 0
      ? estimateTokens(buildInsightContextMessage(insights))
      : 0;
  const totalTokens =
    systemPromptTokens + summaryTokens + messagesTokens + insightsTokens;

  console.log("[Context] Token breakdown:", {
    systemPrompt: systemPromptTokens,
    summary: summaryTokens,
    messages: messagesTokens,
    insights: insightsTokens,
    total: totalTokens,
  });

  return {
    systemPrompt: systemPromptTokens,
    summary: summaryTokens,
    messages: messagesTokens,
    insights: insightsTokens,
    total: totalTokens,
  };
}

function calculateMessageBuckets(
  conversationMessages: Message[],
  existingSummary: Awaited<
    ReturnType<typeof interviewSummaryRepository.findLatestByInterviewId>
  >,
): MessageBuckets {
  const recent = conversationMessages.slice(-RECENT_WINDOW_SIZE);
  const alreadySummarizedCount = existingSummary?.messageCount ?? 0;
  const old = conversationMessages.slice(
    alreadySummarizedCount,
    -RECENT_WINDOW_SIZE,
  );

  return { recent, old, alreadySummarizedCount };
}

function assembleUnderThreshold(
  conversationMessages: Message[],
  insights: Insight[],
): ContextWindow {
  return {
    systemPrompt: INTERVIEWER_SYSTEM_PROMPT,
    messages: assembleMessagesWithInsights(conversationMessages, insights),
  };
}

async function assembleSummarized(
  interviewId: string,
  conversationMessages: Message[],
  buckets: MessageBuckets,
  insights: Insight[],
  existingSummary: Awaited<
    ReturnType<typeof interviewSummaryRepository.findLatestByInterviewId>
  >,
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
      ...assembleMessagesWithInsights(buckets.recent, insights),
    );

    return {
      systemPrompt: INTERVIEWER_SYSTEM_PROMPT,
      messages,
    };
  } catch (error) {
    console.error(
      "[Context] Summarization failed, falling back to truncation:",
      error,
    );

    // Fallback: keep last 5 from old + 5 recent = 10 messages
    const fallbackMessages = conversationMessages.slice(
      -RECENT_WINDOW_SIZE * 2,
    );
    const messages: LLMMessage[] = [];

    // Include existing summary if available
    if (existingSummary) {
      messages.push({
        role: "assistant",
        content: existingSummary.content,
      });
    }

    messages.push(...assembleMessagesWithInsights(fallbackMessages, insights));

    return {
      systemPrompt: INTERVIEWER_SYSTEM_PROMPT,
      messages,
    };
  }
}

function assembleIncremental(
  buckets: MessageBuckets,
  insights: Insight[],
  existingSummary: Awaited<
    ReturnType<typeof interviewSummaryRepository.findLatestByInterviewId>
  >,
): ContextWindow {
  const messages: LLMMessage[] = [];

  // Include existing summary if available
  if (existingSummary) {
    messages.push({ role: "assistant", content: existingSummary.content });
  }

  // Combine old + recent messages
  const combinedMessages = [...buckets.old, ...buckets.recent];
  messages.push(...assembleMessagesWithInsights(combinedMessages, insights));

  return {
    systemPrompt: INTERVIEWER_SYSTEM_PROMPT,
    messages,
  };
}

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

  // Over hard limit: keep only the most recent messages that fit
  const messages: LLMMessage[] = [];
  let runningTotal = systemPromptTokens;

  // Work backwards from the most recent message
  for (let i = context.messages.length - 1; i >= 0; i--) {
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

  return {
    systemPrompt: context.systemPrompt,
    messages,
  };
}

export const contextService = {
  async buildContextWindow(interviewId: string): Promise<ContextWindow> {
    // Load all required data
    const [interview, allMessages, insights, existingSummary] =
      await Promise.all([
        interviewRepository.findById(interviewId),
        messageRepository.findByInterviewId(interviewId),
        insightRepository.findByInterviewId(interviewId),
        interviewSummaryRepository.findLatestByInterviewId(interviewId),
      ]);

    if (!interview) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    // Filter to USER + ASSISTANT only (exclude SYSTEM)
    const conversationMessages = allMessages.filter(
      (msg) => msg.role === "USER" || msg.role === "ASSISTANT",
    );

    // If no messages, return empty context
    if (conversationMessages.length === 0) {
      return {
        systemPrompt: INTERVIEWER_SYSTEM_PROMPT,
        messages: [],
      };
    }

    // Calculate token usage
    const tokenBreakdown = calculateTokenBreakdown(
      conversationMessages,
      existingSummary,
      insights,
    );

    // Under threshold: return all messages
    if (tokenBreakdown.total < SUMMARIZATION_THRESHOLD) {
      const context = assembleUnderThreshold(conversationMessages, insights);
      return enforceMaxTokens(context);
    }

    // Over threshold: split into buckets
    const buckets = calculateMessageBuckets(
      conversationMessages,
      existingSummary,
    );

    // Enough old messages: trigger summarization
    if (buckets.old.length >= SUMMARIZATION_BATCH_SIZE) {
      const context = await assembleSummarized(
        interviewId,
        conversationMessages,
        buckets,
        insights,
        existingSummary,
      );
      return enforceMaxTokens(context);
    }

    // Not enough old messages: incremental assembly
    const context = assembleIncremental(buckets, insights, existingSummary);
    return enforceMaxTokens(context);
  },
};
