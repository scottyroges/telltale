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

export const contextService = {
  async buildContextWindow(interviewId: string): Promise<ContextWindow> {
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

    // Estimate tokens for all components
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

    // If under threshold, return all messages
    if (totalTokens < SUMMARIZATION_THRESHOLD) {
      return {
        systemPrompt: INTERVIEWER_SYSTEM_PROMPT,
        messages: assembleMessagesWithInsights(conversationMessages, insights),
      };
    }

    // Over threshold - split into buckets
    const recentMessages = conversationMessages.slice(-RECENT_WINDOW_SIZE);
    const alreadySummarizedCount = existingSummary?.messageCount ?? 0;
    const oldMessages = conversationMessages.slice(
      alreadySummarizedCount,
      -RECENT_WINDOW_SIZE,
    );

    // If old bucket >= 5 messages, trigger summarization
    if (oldMessages.length >= SUMMARIZATION_BATCH_SIZE) {
      try {
        const newSummaryContent = await summarizeMessages(
          oldMessages,
          existingSummary?.content,
        );
        await interviewSummaryRepository.create({
          interviewId,
          parentSummaryId: existingSummary?.id,
          content: newSummaryContent,
          messageCount: alreadySummarizedCount + oldMessages.length,
        });

        // Return summary message + recent messages
        const messages: LLMMessage[] = [
          { role: "assistant", content: newSummaryContent },
        ];
        messages.push(...assembleMessagesWithInsights(recentMessages, insights));

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

        messages.push(
          ...assembleMessagesWithInsights(fallbackMessages, insights),
        );

        return {
          systemPrompt: INTERVIEWER_SYSTEM_PROMPT,
          messages,
        };
      }
    }

    // Old bucket < 5 messages - include all old + recent
    const messages: LLMMessage[] = [];

    // Include existing summary if available
    if (existingSummary) {
      messages.push({ role: "assistant", content: existingSummary.content });
    }

    // Combine old + recent messages
    const combinedMessages = [...oldMessages, ...recentMessages];
    messages.push(...assembleMessagesWithInsights(combinedMessages, insights));

    return {
      systemPrompt: INTERVIEWER_SYSTEM_PROMPT,
      messages,
    };
  },
};
