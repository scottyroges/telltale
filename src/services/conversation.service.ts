import { llmProvider } from "@/lib/llm";
import { bookQuestionRepository } from "@/repositories/book-question.repository";
import { questionRepository } from "@/repositories/question.repository";
import { interviewRepository } from "@/repositories/interview.repository";
import { messageRepository } from "@/repositories/message.repository";
import { insightRepository } from "@/repositories/insight.repository";
import { parseInterviewerResponse, parseWithRetry } from "@/services/response-parser";
import { INTERVIEWER_SYSTEM_PROMPT } from "./prompt";
import type { LLMMessage } from "@/domain/llm-provider";
import type { Message } from "@/domain/message";
import type { Insight } from "@/domain/insight";

function buildInsightContextMessage(insights: Insight[]): string {
  const notes = insights.map(i => `- ${i.type}: ${i.content}`).join("\n");
  return `[Previous interview notes]\n${notes}`;
}

export const conversationService = {
  async startInterview(bookQuestionId: string) {
    const bookQuestion =
      await bookQuestionRepository.findById(bookQuestionId);
    if (!bookQuestion) {
      throw new Error(`BookQuestion not found: ${bookQuestionId}`);
    }

    const question = await questionRepository.findById(
      bookQuestion.questionId,
    );
    if (!question) {
      throw new Error(`Question not found: ${bookQuestion.questionId}`);
    }

    const interview = await interviewRepository.create({
      bookId: bookQuestion.bookId,
      questionId: bookQuestion.questionId,
    });

    const topicMessage = `The topic for this conversation is: ${question.prompt}. Please greet the storyteller warmly and ask an opening question about this topic.`;

    const response = await llmProvider.generateResponse(
      INTERVIEWER_SYSTEM_PROMPT,
      [{ role: "user", content: topicMessage }],
    );

    const parsed = parseInterviewerResponse(response.content);

    await messageRepository.create({
      interviewId: interview.id,
      role: "USER",
      content: topicMessage,
    });

    await messageRepository.create({
      interviewId: interview.id,
      role: "ASSISTANT",
      content: parsed.text,
    });

    await insightRepository.createMany(
      parsed.insights.map(i => ({
        bookId: bookQuestion.bookId,
        interviewId: interview.id,
        type: i.type,
        content: i.content,
      }))
    );

    await bookQuestionRepository.updateStatus(bookQuestionId, "STARTED");

    return { interviewId: interview.id, openingMessage: parsed.text };
  },

  async sendMessage(interviewId: string, bookId: string, content: string) {
    await messageRepository.create({
      interviewId,
      role: "USER",
      content,
    });

    const [history, insights] = await Promise.all([
      messageRepository.findByInterviewId(interviewId),
      insightRepository.findByInterviewId(interviewId),
    ]);

    const messages: LLMMessage[] = [];

    // Inject insights as a user message before the conversation history
    if (insights.length > 0) {
      messages.push({
        role: "user",
        content: buildInsightContextMessage(insights),
      });
    }

    // Add conversation history after insights
    messages.push(
      ...history
        .filter(
          (msg: Message) => msg.role === "USER" || msg.role === "ASSISTANT",
        )
        .map((msg: Message) => ({
          role: msg.role.toLowerCase() as "user" | "assistant",
          content: msg.content,
        }))
    );

    const response = await llmProvider.generateResponse(INTERVIEWER_SYSTEM_PROMPT, messages);

    const parsed = await parseWithRetry(response.content, async (correctionPrompt) => {
      const retry = await llmProvider.generateResponse(INTERVIEWER_SYSTEM_PROMPT, [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: correctionPrompt },
      ]);
      return retry.content;
    });

    await messageRepository.create({
      interviewId,
      role: "ASSISTANT",
      content: parsed.text,
    });

    await insightRepository.createMany(
      parsed.insights.map(i => ({
        bookId,
        interviewId,
        type: i.type,
        content: i.content,
      }))
    );

    return { content: parsed.text };
  },

  async getInterviewMessages(interviewId: string) {
    return messageRepository.findByInterviewId(interviewId);
  },

  async completeInterview(interviewId: string) {
    return interviewRepository.updateStatus(interviewId, "COMPLETE");
  },

  async getInsights(interviewId: string) {
    return insightRepository.findByInterviewId(interviewId);
  },

  async getBookInsights(bookId: string) {
    return insightRepository.findByBookId(bookId);
  },
};
