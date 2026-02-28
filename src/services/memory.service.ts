import { llmProvider } from "@/lib/llm";
import { messageRepository } from "@/repositories/message.repository";
import { bookRepository } from "@/repositories/book.repository";
import { getMemorySystemPrompt } from "@/prompts/interviewer";

const RECENT_MESSAGE_COUNT = 4;

function buildMemoryContext(
  coreMemory: string | null,
  transcript: string,
): string {
  const memorySection = coreMemory
    ? `[Current core memory]\n${coreMemory}`
    : "[Current core memory]\nNo existing memory for this subject.";

  return `${memorySection}\n\n[Recent conversation]\n${transcript}`;
}

function extractCandidate(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return raw.trim();
}

function parseMemoryResponse(raw: string): {
  updatedCoreMemory: string | null;
  shouldComplete: boolean;
} {
  const candidate = extractCandidate(raw);

  let obj: Record<string, unknown>;
  try {
    const result = JSON.parse(candidate);
    if (typeof result !== "object" || result === null) {
      return { updatedCoreMemory: null, shouldComplete: false };
    }
    obj = result as Record<string, unknown>;
  } catch {
    return { updatedCoreMemory: null, shouldComplete: false };
  }

  const shouldComplete = obj.shouldComplete === true;
  const updatedCoreMemory =
    typeof obj.updatedCoreMemory === "string" &&
    obj.updatedCoreMemory.trim() !== ""
      ? obj.updatedCoreMemory
      : null;

  return { updatedCoreMemory, shouldComplete };
}

export const memoryService = {
  async updateMemory(
    interviewId: string,
    bookId: string,
    coreMemory: string | null,
  ): Promise<{ shouldComplete: boolean }> {
    try {
      const messages = await messageRepository.findByInterviewId(interviewId, {
        includeHidden: true,
      });

      const recentMessages = messages.slice(-RECENT_MESSAGE_COUNT);
      const transcript = recentMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const contextMessage = buildMemoryContext(coreMemory, transcript);

      const response = await llmProvider.generateResponse(
        getMemorySystemPrompt(),
        [{ role: "user", content: contextMessage }],
      );

      const parsed = parseMemoryResponse(response.content);

      if (parsed.updatedCoreMemory) {
        await bookRepository.updateCoreMemory(bookId, parsed.updatedCoreMemory);
      }

      return { shouldComplete: parsed.shouldComplete };
    } catch (error) {
      console.error("[Memory] Failed to update memory:", error);
      return { shouldComplete: false };
    }
  },
};
