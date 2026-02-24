// @vitest-environment node
import { describe, it, expect } from "vitest";
import { INTERVIEWER_SYSTEM_PROMPT } from "@/prompts/interviewer";

describe("INTERVIEWER_SYSTEM_PROMPT", () => {
  it("includes periodic check-in guidance at natural conversation seams", () => {
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("natural seam");
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("check in");
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("Never interrupt");
  });

  it("includes guidance about natural conversation flow", () => {
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("open-ended follow-up questions");
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("conversational");
  });

  it("includes JSON response format instructions", () => {
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain('"response"');
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain('"insights"');
  });

  it("includes insight type definitions", () => {
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("ENTITY");
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("EVENT");
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("EMOTION");
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain("DETAIL");
  });

  it("emphasizes conversational priority over note-taking", () => {
    expect(INTERVIEWER_SYSTEM_PROMPT).toContain(
      "conversational response is the priority"
    );
  });
});
