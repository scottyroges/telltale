import { llmProvider } from "@/lib/llm";
import { interviewRepository } from "@/repositories/interview.repository";
import { messageRepository } from "@/repositories/message.repository";
import { insightRepository } from "@/repositories/insight.repository";
import { parseInterviewerResponse, parseWithRetry } from "@/services/response-parser";
import { contextService } from "@/services/context.service";
import { REDIRECT_PROMPT } from "@/prompts/interviewer";

export const conversationService = {
  async startInterview(bookId: string, topic: string, userName: string) {
    const interview = await interviewRepository.create({
      bookId,
      topic,
    });

    const topicMessage = `The topic for this conversation is: ${topic}. Please greet the storyteller warmly and ask an opening question about this topic.`;

    // Persist topic message (hidden from transcript, visible to LLM)
    await messageRepository.create({
      interviewId: interview.id,
      role: "USER",
      content: topicMessage,
      hidden: true,
    });

    // Build context window
    const context = await contextService.buildContextWindow(interview.id, userName);

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
        bookId,
        interviewId: interview.id,
        type: i.type,
        content: i.content,
      }))
    );

    return { interviewId: interview.id };
  },

  async sendMessage(interviewId: string, bookId: string, content: string, userName: string) {
    await messageRepository.create({
      interviewId,
      role: "USER",
      content,
    });

    const context = await contextService.buildContextWindow(interviewId, userName);

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

    if (parsed.shouldComplete) {
      await interviewRepository.complete(interviewId);
    }

    return { content: parsed.text, shouldComplete: parsed.shouldComplete };
  },

  async redirect(interviewId: string, bookId: string, userName: string) {
    await messageRepository.create({
      interviewId,
      role: "USER",
      content: REDIRECT_PROMPT,
      hidden: true,
    });

    const context = await contextService.buildContextWindow(interviewId, userName);

    const response = await llmProvider.generateResponse(
      context.systemPrompt,
      context.messages,
    );

    const parsed = parseInterviewerResponse(response.content);

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
    return interviewRepository.complete(interviewId);
  },

  async getInsights(interviewId: string) {
    return insightRepository.findByInterviewId(interviewId);
  },

  async getBookInsights(bookId: string) {
    return insightRepository.findByBookId(bookId);
  },
};
