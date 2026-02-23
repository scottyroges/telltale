import { llmProvider } from "@/lib/llm";
import { bookQuestionRepository } from "@/repositories/book-question.repository";
import { questionRepository } from "@/repositories/question.repository";
import { interviewRepository } from "@/repositories/interview.repository";
import { messageRepository } from "@/repositories/message.repository";
import { insightRepository } from "@/repositories/insight.repository";
import { parseInterviewerResponse, parseWithRetry } from "@/services/response-parser";
import { contextService } from "@/services/context.service";

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

    // Check if interview already exists for this book + question
    const existingInterview = await interviewRepository.findByBookIdAndQuestionId(
      bookQuestion.bookId,
      bookQuestion.questionId,
    );

    if (existingInterview) {
      // Resume existing interview - return its ID without creating a new one
      return { interviewId: existingInterview.id };
    }

    // No existing interview found - create a new one
    const interview = await interviewRepository.create({
      bookId: bookQuestion.bookId,
      questionId: bookQuestion.questionId,
    });

    const topicMessage = `The topic for this conversation is: ${question.prompt}. Please greet the storyteller warmly and ask an opening question about this topic.`;

    // Persist topic message before building context
    await messageRepository.create({
      interviewId: interview.id,
      role: "USER",
      content: topicMessage,
    });

    // Build context window
    const context = await contextService.buildContextWindow(interview.id);

    const response = await llmProvider.generateResponse(
      context.systemPrompt,
      context.messages,
    );

    const parsed = parseInterviewerResponse(response.content);

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

    const context = await contextService.buildContextWindow(interviewId);

    const response = await llmProvider.generateResponse(
      context.systemPrompt,
      context.messages,
    );

    const parsed = await parseWithRetry(response.content, async (correctionPrompt) => {
      const retry = await llmProvider.generateResponse(context.systemPrompt, [
        ...context.messages,
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
