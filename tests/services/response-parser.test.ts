// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { parseInterviewerResponse, parseWithRetry } from "@/services/response-parser";

describe("parseInterviewerResponse", () => {
  it("returns parsed text and insights for valid JSON with response + insights", () => {
    const input = JSON.stringify({
      response: "Hello!",
      insights: [{ type: "ENTITY", content: "sister Maria" }],
    });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hello!",
      insights: [{ type: "ENTITY", content: "sister Maria" }],
      parsed: true,
    });
  });

  it("returns text with empty insights for valid JSON with empty insights array", () => {
    const input = JSON.stringify({ response: "Hello!", insights: [] });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hello!",
      insights: [],
      parsed: true,
    });
  });

  it("returns text with empty insights when insights field is missing", () => {
    const input = JSON.stringify({ response: "Hello!" });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hello!",
      insights: [],
      parsed: true,
    });
  });

  it("returns raw string as text with empty insights for invalid JSON", () => {
    const input = "Just a plain string";
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Just a plain string",
      insights: [],
      parsed: false,
    });
  });

  it("returns empty text with empty insights for empty string input", () => {
    expect(parseInterviewerResponse("")).toEqual({ text: "", insights: [], parsed: false });
  });

  it("keeps valid insight entries and skips malformed ones", () => {
    const input = JSON.stringify({
      response: "Tell me more.",
      insights: [
        { type: "UNKNOWN", content: "something" },
        { type: "EMOTION", content: "" },
        { type: "EMOTION", content: "pride" },
      ],
    });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Tell me more.",
      insights: [{ type: "EMOTION", content: "pride" }],
      parsed: true,
    });
  });

  it("strips markdown code fences and parses correctly", () => {
    const input = "```json\n{\"response\":\"Hi\",\"insights\":[]}\n```";
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hi",
      insights: [],
      parsed: true,
    });
  });

  it("extracts JSON from a fence block preceded by prose", () => {
    const input = "Here is my response:\n```json\n{\"response\":\"Hi\",\"insights\":[]}\n```";
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hi",
      insights: [],
      parsed: true,
    });
  });

  it("extracts JSON from a plain prose prefix with no fence", () => {
    const input = `Here is the JSON: ${JSON.stringify({ response: "Hi!", insights: [] })}`;
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hi!",
      insights: [],
      parsed: true,
    });
  });
});

describe("parseWithRetry", () => {
  it("returns the parsed result without calling retry when first parse succeeds", async () => {
    const retryFn = vi.fn();
    const input = JSON.stringify({ response: "Hello!", insights: [] });
    const result = await parseWithRetry(input, retryFn);
    expect(result).toEqual({ text: "Hello!", insights: [], parsed: true });
    expect(retryFn).not.toHaveBeenCalled();
  });

  it("calls retry and returns corrected result when first parse fails", async () => {
    const corrected = JSON.stringify({ response: "Corrected!", insights: [] });
    const retryFn = vi.fn().mockResolvedValue(corrected);
    const result = await parseWithRetry("not json", retryFn);
    expect(result).toEqual({ text: "Corrected!", insights: [], parsed: true });
    expect(retryFn).toHaveBeenCalledOnce();
  });

  it("returns original raw text when both attempts fail", async () => {
    const retryFn = vi.fn().mockResolvedValue("still not json");
    const result = await parseWithRetry("not json", retryFn);
    expect(result).toEqual({ text: "not json", insights: [], parsed: false });
  });
});
