import { llmProvider } from "@/lib/llm";
import { interviewRepository } from "@/repositories/interview.repository";
import { messageRepository } from "@/repositories/message.repository";
import { bookRepository } from "@/repositories/book.repository";
import { parseWithRetry } from "@/services/response-parser";
import { contextService } from "@/services/context.service";
import { REDIRECT_PROMPT } from "@/prompts/interviewer";

function prepareMemoryForNewInterview(coreMemory: string | null, topic: string): string | null {
  if (!coreMemory) return null;

  const marker = "## Interview Memory";
  const markerIndex = coreMemory.indexOf(marker);
  const bookSection = markerIndex >= 0 ? coreMemory.slice(0, markerIndex) : coreMemory + "\n\n";

  return `${bookSection}${marker}\nTopic: ${topic}`;
}

export const conversationService = {
  async startInterview(bookId: string, topic: string, userName: string) {
    const [interview, book] = await Promise.all([
      interviewRepository.create({ bookId, topic }),
      bookRepository.findById(bookId),
    ]);

    const preparedMemory = prepareMemoryForNewInterview(book?.coreMemory ?? null, topic);

    const topicMessage = `The topic for this conversation is: ${topic}. Please greet the storyteller warmly and ask an opening question about this topic.`;

    // Persist topic message (hidden from transcript, visible to LLM)
    await messageRepository.create({
      interviewId: interview.id,
      role: "USER",
      content: topicMessage,
      hidden: true,
    });

    // Build context window
    const context = await contextService.buildContextWindow(interview.id, userName, preparedMemory);

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
      interviewId: interview.id,
      role: "ASSISTANT",
      content: parsed.text,
    });

    if (parsed.updatedCoreMemory !== null) {
      await bookRepository.updateCoreMemory(bookId, parsed.updatedCoreMemory);
    }

    return { interviewId: interview.id };
  },

  async sendMessage(interviewId: string, bookId: string, content: string, userName: string) {
    const [, book] = await Promise.all([
      messageRepository.create({
        interviewId,
        role: "USER",
        content,
      }),
      bookRepository.findById(bookId),
    ]);

    const context = await contextService.buildContextWindow(interviewId, userName, book?.coreMemory ?? null);

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

    if (parsed.updatedCoreMemory !== null) {
      await bookRepository.updateCoreMemory(bookId, parsed.updatedCoreMemory);
    }

    if (parsed.shouldComplete) {
      await interviewRepository.complete(interviewId);
    }

    return { content: parsed.text, shouldComplete: parsed.shouldComplete };
  },

  async redirect(interviewId: string, bookId: string, userName: string) {
    const [, book] = await Promise.all([
      messageRepository.create({
        interviewId,
        role: "USER",
        content: REDIRECT_PROMPT,
        hidden: true,
      }),
      bookRepository.findById(bookId),
    ]);

    const context = await contextService.buildContextWindow(interviewId, userName, book?.coreMemory ?? null);

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

    if (parsed.updatedCoreMemory !== null) {
      await bookRepository.updateCoreMemory(bookId, parsed.updatedCoreMemory);
    }

    return { content: parsed.text };
  },

  async getInterviewMessages(interviewId: string) {
    return messageRepository.findByInterviewId(interviewId);
  },

  async completeInterview(interviewId: string) {
    return interviewRepository.complete(interviewId);
  },
};
