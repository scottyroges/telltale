// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/mock-db";

vi.mock("server-only", () => ({}));

const {
  db,
  executeTakeFirstOrThrow,
  executeTakeFirst,
  selectFrom,
  insertInto,
} = createMockDb();

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/id", () => ({ createId: () => "generated-id" }));

describe("interviewSummaryRepository", () => {
  let interviewSummaryRepository: Awaited<
    typeof import("@/repositories/interview-summary.repository")
  >["interviewSummaryRepository"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/repositories/interview-summary.repository");
    interviewSummaryRepository = mod.interviewSummaryRepository;
  });

  describe("create", () => {
    it("creates a summary without parent", async () => {
      const expected = {
        id: "s1",
        interviewId: "i1",
        parentSummaryId: null,
        content: "Summary of first 10 messages",
        messageCount: 10,
        createdAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await interviewSummaryRepository.create({
        interviewId: "i1",
        content: "Summary of first 10 messages",
        messageCount: 10,
      });

      expect(result).toEqual(expected);
      expect(insertInto).toHaveBeenCalledWith("interviewSummary");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });

    it("creates a summary with parent", async () => {
      const expected = {
        id: "s2",
        interviewId: "i1",
        parentSummaryId: "s1",
        content: "Updated summary",
        messageCount: 20,
        createdAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await interviewSummaryRepository.create({
        interviewId: "i1",
        parentSummaryId: "s1",
        content: "Updated summary",
        messageCount: 20,
      });

      expect(result).toEqual(expected);
      expect(insertInto).toHaveBeenCalledWith("interviewSummary");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("findLatestByInterviewId", () => {
    it("returns the most recent summary", async () => {
      const expected = {
        id: "s2",
        interviewId: "i1",
        parentSummaryId: "s1",
        content: "Latest summary",
        messageCount: 20,
        createdAt: new Date(),
      };
      executeTakeFirst.mockResolvedValue(expected);

      const result =
        await interviewSummaryRepository.findLatestByInterviewId("i1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("interviewSummary");
      expect(executeTakeFirst).toHaveBeenCalled();
    });

    it("returns null when no summaries exist", async () => {
      executeTakeFirst.mockResolvedValue(undefined);

      const result =
        await interviewSummaryRepository.findLatestByInterviewId("i1");

      expect(result).toBeNull();
      expect(selectFrom).toHaveBeenCalledWith("interviewSummary");
    });
  });
});
