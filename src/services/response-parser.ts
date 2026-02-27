import type { InsightType } from "@/domain/insight";

export type ParsedInsight = { type: InsightType; content: string };
export type ParsedResponse = {
  text: string;
  insights: ParsedInsight[];
  updatedCoreMemory: string | null;
  shouldComplete: boolean;
  parsed: boolean;
};

export const PARSE_CORRECTION_PROMPT =
  `Your previous response was not valid JSON. Respond with ONLY this JSON structure and nothing else — no preamble, no markdown, no explanation:\n` +
  `{"response":"<your message>","updatedCoreMemory":"## Book Memory\\n...\\n\\n## Interview Memory\\n...","shouldComplete":false}\n` +
  `shouldComplete should be true only if the user agreed to wrap up.`;

function extractCandidate(raw: string): string {
  // 1. Fence block anywhere in the string
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  // 2. JSON object substring (handles "Here's my response: {...}")
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return raw.trim();
}

export function parseInterviewerResponse(raw: string): ParsedResponse {
  const candidate = extractCandidate(raw);

  let obj: Record<string, unknown>;
  try {
    const result = JSON.parse(candidate);
    if (typeof result !== "object" || result === null || typeof (result as Record<string, unknown>).response !== "string") {
      return { text: raw, insights: [], updatedCoreMemory: null, shouldComplete: false, parsed: false };
    }
    obj = result as Record<string, unknown>;
  } catch {
    return { text: raw, insights: [], updatedCoreMemory: null, shouldComplete: false, parsed: false };
  }

  const shouldComplete = obj.shouldComplete === true;

  const updatedCoreMemory =
    typeof obj.updatedCoreMemory === "string" && obj.updatedCoreMemory.trim() !== ""
      ? obj.updatedCoreMemory
      : null;

  return { text: obj.response as string, insights: [], updatedCoreMemory, shouldComplete, parsed: true };
}

export async function parseWithRetry(
  raw: string,
  retry: (correctionPrompt: string) => Promise<string>
): Promise<ParsedResponse> {
  const result = parseInterviewerResponse(raw);
  if (result.parsed) return result;

  const corrected = await retry(PARSE_CORRECTION_PROMPT);
  const retryResult = parseInterviewerResponse(corrected);

  // If retry also fails, preserve the original raw text rather than the failed retry text
  if (!retryResult.parsed) return { text: raw, insights: [], updatedCoreMemory: null, shouldComplete: false, parsed: false };
  return retryResult;
}
