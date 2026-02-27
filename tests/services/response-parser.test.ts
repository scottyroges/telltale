// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { parseInterviewerResponse, parseWithRetry } from "@/services/response-parser";

describe("parseInterviewerResponse", () => {
  it("returns parsed text and updatedCoreMemory for valid JSON", () => {
    const input = JSON.stringify({
      response: "Hello!",
      updatedCoreMemory: "## Book Memory\nKey people: Maria",
    });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hello!",
      insights: [],
      updatedCoreMemory: "## Book Memory\nKey people: Maria",
      shouldComplete: false,
      parsed: true,
    });
  });

  it("returns null updatedCoreMemory when field is an empty string", () => {
    const input = JSON.stringify({ response: "Hello!", updatedCoreMemory: "" });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hello!",
      insights: [],
      updatedCoreMemory: null,
      shouldComplete: false,
      parsed: true,
    });
  });

  it("returns null updatedCoreMemory when field is missing", () => {
    const input = JSON.stringify({ response: "Hello!" });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hello!",
      insights: [],
      updatedCoreMemory: null,
      shouldComplete: false,
      parsed: true,
    });
  });

  it("returns null updatedCoreMemory when field is a number", () => {
    const input = JSON.stringify({ response: "Hello!", updatedCoreMemory: 42 });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hello!",
      insights: [],
      updatedCoreMemory: null,
      shouldComplete: false,
      parsed: true,
    });
  });

  it("returns null updatedCoreMemory when field is an object", () => {
    const input = JSON.stringify({ response: "Hello!", updatedCoreMemory: { book: "memory" } });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hello!",
      insights: [],
      updatedCoreMemory: null,
      shouldComplete: false,
      parsed: true,
    });
  });

  it("always returns empty insights even if LLM includes insights array", () => {
    const input = JSON.stringify({
      response: "Hello!",
      updatedCoreMemory: "## Book Memory\nSome content",
      insights: [{ type: "ENTITY", content: "sister Maria" }],
    });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hello!",
      insights: [],
      updatedCoreMemory: "## Book Memory\nSome content",
      shouldComplete: false,
      parsed: true,
    });
  });

  it("returns raw string as text with null updatedCoreMemory for invalid JSON", () => {
    const input = "Just a plain string";
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Just a plain string",
      insights: [],
      updatedCoreMemory: null,
      shouldComplete: false,
      parsed: false,
    });
  });

  it("returns empty text with null updatedCoreMemory for empty string input", () => {
    expect(parseInterviewerResponse("")).toEqual({
      text: "",
      insights: [],
      updatedCoreMemory: null,
      shouldComplete: false,
      parsed: false,
    });
  });

  it("strips markdown code fences and parses correctly", () => {
    const input = "```json\n{\"response\":\"Hi\",\"updatedCoreMemory\":\"## Book Memory\\ntest\"}\n```";
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hi",
      insights: [],
      updatedCoreMemory: "## Book Memory\ntest",
      shouldComplete: false,
      parsed: true,
    });
  });

  it("extracts JSON from a fence block preceded by prose", () => {
    const input = "Here is my response:\n```json\n{\"response\":\"Hi\",\"updatedCoreMemory\":\"mem\"}\n```";
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hi",
      insights: [],
      updatedCoreMemory: "mem",
      shouldComplete: false,
      parsed: true,
    });
  });

  it("extracts JSON from a plain prose prefix with no fence", () => {
    const input = `Here is the JSON: ${JSON.stringify({ response: "Hi!", updatedCoreMemory: "mem" })}`;
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Hi!",
      insights: [],
      updatedCoreMemory: "mem",
      shouldComplete: false,
      parsed: true,
    });
  });

  it("parses shouldComplete: true correctly", () => {
    const input = JSON.stringify({
      response: "Thank you for sharing!",
      updatedCoreMemory: "## Book Memory\nfinal",
      shouldComplete: true,
    });
    expect(parseInterviewerResponse(input)).toEqual({
      text: "Thank you for sharing!",
      insights: [],
      updatedCoreMemory: "## Book Memory\nfinal",
      shouldComplete: true,
      parsed: true,
    });
  });

  it("defaults shouldComplete to false when field is missing", () => {
    const input = JSON.stringify({
      response: "Tell me more.",
      updatedCoreMemory: "mem",
    });
    expect(parseInterviewerResponse(input).shouldComplete).toBe(false);
  });

  it("defaults shouldComplete to false when field is non-boolean", () => {
    const input = JSON.stringify({
      response: "Tell me more.",
      updatedCoreMemory: "mem",
      shouldComplete: "yes",
    });
    expect(parseInterviewerResponse(input).shouldComplete).toBe(false);
  });
});

describe("parseWithRetry", () => {
  it("returns the parsed result without calling retry when first parse succeeds", async () => {
    const retryFn = vi.fn();
    const input = JSON.stringify({ response: "Hello!", updatedCoreMemory: "mem" });
    const result = await parseWithRetry(input, retryFn);
    expect(result).toEqual({ text: "Hello!", insights: [], updatedCoreMemory: "mem", shouldComplete: false, parsed: true });
    expect(retryFn).not.toHaveBeenCalled();
  });

  it("calls retry and returns corrected result when first parse fails", async () => {
    const corrected = JSON.stringify({ response: "Corrected!", updatedCoreMemory: "mem" });
    const retryFn = vi.fn().mockResolvedValue(corrected);
    const result = await parseWithRetry("not json", retryFn);
    expect(result).toEqual({ text: "Corrected!", insights: [], updatedCoreMemory: "mem", shouldComplete: false, parsed: true });
    expect(retryFn).toHaveBeenCalledOnce();
  });

  it("returns original raw text when both attempts fail", async () => {
    const retryFn = vi.fn().mockResolvedValue("still not json");
    const result = await parseWithRetry("not json", retryFn);
    expect(result).toEqual({ text: "not json", insights: [], updatedCoreMemory: null, shouldComplete: false, parsed: false });
  });
});
