import { llmProvider } from "@/lib/llm";
import { bookQuestionRepository } from "@/repositories/book-question.repository";
import { questionRepository } from "@/repositories/question.repository";
import { interviewRepository } from "@/repositories/interview.repository";
import { messageRepository } from "@/repositories/message.repository";
import { INTERVIEWER_SYSTEM_PROMPT } from "./prompt";
import type { LLMMessage } from "@/domain/llm-provider";
import type { Message } from "@/domain/message";

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

    await messageRepository.create({
      interviewId: interview.id,
      role: "USER",
      content: topicMessage,
    });

    await messageRepository.create({
      interviewId: interview.id,
      role: "ASSISTANT",
      content: response.content,
    });

    await bookQuestionRepository.updateStatus(bookQuestionId, "STARTED");

    return { interviewId: interview.id, openingMessage: response.content };
  },

  async sendMessage(interviewId: string, content: string) {
    await messageRepository.create({
      interviewId,
      role: "USER",
      content,
    });

    const history = await messageRepository.findByInterviewId(interviewId);

    const messages: LLMMessage[] = history
      .filter(
        (msg: Message) => msg.role === "USER" || msg.role === "ASSISTANT",
      )
      .map((msg: Message) => ({
        role: msg.role.toLowerCase() as "user" | "assistant",
        content: msg.content,
      }));

    const response = await llmProvider.generateResponse(
      INTERVIEWER_SYSTEM_PROMPT,
      messages,
    );

    await messageRepository.create({
      interviewId,
      role: "ASSISTANT",
      content: response.content,
    });

    return { content: response.content };
  },

  async getInterviewMessages(interviewId: string) {
    return messageRepository.findByInterviewId(interviewId);
  },

  async completeInterview(interviewId: string) {
    return interviewRepository.updateStatus(interviewId, "COMPLETE");
  },
};
