import { llmProvider } from "@/lib/llm";
import { interviewRepository } from "@/repositories/interview.repository";
import { messageRepository } from "@/repositories/message.repository";
import { bookRepository } from "@/repositories/book.repository";
import { contextService } from "@/services/context.service";
import { memoryService } from "@/services/memory.service";
import { REDIRECT_PROMPT } from "@/prompts/interviewer";
import type { StreamChunk } from "@/domain/streaming";
import { CORE_MEMORY_PREFIX } from "@/services/context.service";

function stripMemoryBlock(content: string): string {
  const idx = content.indexOf(CORE_MEMORY_PREFIX);
  return idx === -1 ? content : content.substring(0, idx).trimEnd();
}

/**
 * Wraps a raw LLM text stream to strip any echoed memory block.
 * Buffers enough trailing text to detect the marker across chunk boundaries.
 * Sets result.content to the final clean text for persistence.
 */
async function* filterMemoryFromStream(
  rawStream: AsyncGenerator<string>,
  result: { content: string },
): AsyncGenerator<StreamChunk> {
  let fullContent = "";
  let yieldedUpTo = 0;
  let markerFound = false;

  for await (const chunk of rawStream) {
    if (markerFound) continue;
    fullContent += chunk;

    const idx = fullContent.indexOf(CORE_MEMORY_PREFIX);
    if (idx !== -1) {
      const cleanEnd = fullContent.substring(0, idx).trimEnd().length;
      if (cleanEnd > yieldedUpTo) {
        yield { type: "text" as const, text: fullContent.slice(yieldedUpTo, cleanEnd) };
      }
      fullContent = fullContent.substring(0, cleanEnd);
      markerFound = true;
      continue;
    }

    // Hold back chars that could be start of marker
    const safe = Math.max(yieldedUpTo, fullContent.length - CORE_MEMORY_PREFIX.length + 1);
    if (safe > yieldedUpTo) {
      yield { type: "text" as const, text: fullContent.slice(yieldedUpTo, safe) };
      yieldedUpTo = safe;
    }
  }

  // Flush remaining buffer
  if (!markerFound && yieldedUpTo < fullContent.length) {
    yield { type: "text" as const, text: fullContent.slice(yieldedUpTo) };
  }

  result.content = fullContent;
}

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

    await messageRepository.create({
      interviewId: interview.id,
      role: "ASSISTANT",
      content: stripMemoryBlock(response.content),
    });

    return { interviewId: interview.id };
  },

  async *sendMessage(interviewId: string, bookId: string, content: string, userName: string): AsyncGenerator<StreamChunk> {
    const [, book] = await Promise.all([
      messageRepository.create({
        interviewId,
        role: "USER",
        content,
      }),
      bookRepository.findById(bookId),
    ]);

    const context = await contextService.buildContextWindow(interviewId, userName, book?.coreMemory ?? null);

    // Start streaming + memory in parallel
    const memoryPromise = memoryService.updateMemory(interviewId, bookId, book?.coreMemory ?? null);
    const stream = llmProvider.generateStreamingResponse(context.systemPrompt, context.messages);

    const result = { content: "" };
    yield* filterMemoryFromStream(stream, result);

    // Persist complete assistant message
    await messageRepository.create({
      interviewId,
      role: "ASSISTANT",
      content: result.content,
    });

    // Await memory, handle completion
    const memoryResult = await memoryPromise;
    if (memoryResult.shouldComplete) {
      await interviewRepository.complete(interviewId);
    }

    yield { type: "done" as const, shouldComplete: memoryResult.shouldComplete };
  },

  async *redirect(interviewId: string, bookId: string, userName: string): AsyncGenerator<StreamChunk> {
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

    // Start streaming + memory in parallel.
    // shouldComplete is intentionally ignored — redirect signals the user wants to continue.
    const memoryPromise = memoryService.updateMemory(interviewId, bookId, book?.coreMemory ?? null);
    const stream = llmProvider.generateStreamingResponse(context.systemPrompt, context.messages);

    const result = { content: "" };
    yield* filterMemoryFromStream(stream, result);

    // Persist complete assistant message
    await messageRepository.create({
      interviewId,
      role: "ASSISTANT",
      content: result.content,
    });

    // Await memory to avoid unhandled rejections
    await memoryPromise;

    yield { type: "done" as const, shouldComplete: false };
  },

  async getInterviewMessages(interviewId: string) {
    return messageRepository.findByInterviewId(interviewId);
  },

  async completeInterview(interviewId: string) {
    return interviewRepository.complete(interviewId);
  },
};
