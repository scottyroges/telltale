// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.fn();
const mockFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSummary: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

const select = {
  id: true,
  interviewId: true,
  parentSummaryId: true,
  content: true,
  messageCount: true,
  createdAt: true,
};

describe("interviewSummaryRepository", () => {
  let interviewSummaryRepository: Awaited<
    typeof import("@/repositories/interview-summary.repository")
  >["interviewSummaryRepository"];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("@/repositories/interview-summary.repository");
    interviewSummaryRepository = mod.interviewSummaryRepository;
  });

  describe("create", () => {
    it("creates a summary without parent", async () => {
      const input = { interviewId: "i1", content: "Summary of first 10 messages", messageCount: 10 };
      const expected = { id: "s1", ...input, parentSummaryId: null, createdAt: new Date() };
      mockCreate.mockResolvedValue(expected);

      const result = await interviewSummaryRepository.create(input);

      expect(result).toEqual(expected);
      expect(mockCreate).toHaveBeenCalledWith({ data: input, select });
    });

    it("creates a summary with parent", async () => {
      const input = { interviewId: "i1", parentSummaryId: "s1", content: "Updated summary", messageCount: 20 };
      const expected = { id: "s2", ...input, createdAt: new Date() };
      mockCreate.mockResolvedValue(expected);

      const result = await interviewSummaryRepository.create(input);

      expect(result).toEqual(expected);
      expect(mockCreate).toHaveBeenCalledWith({ data: input, select });
    });
  });

  describe("findLatestByInterviewId", () => {
    it("returns the most recent summary", async () => {
      const expected = { id: "s2", interviewId: "i1", parentSummaryId: "s1", content: "Latest summary", messageCount: 20, createdAt: new Date() };
      mockFindFirst.mockResolvedValue(expected);

      const result = await interviewSummaryRepository.findLatestByInterviewId("i1");

      expect(result).toEqual(expected);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { interviewId: "i1" },
        select,
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns null when no summaries exist", async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await interviewSummaryRepository.findLatestByInterviewId("i1");

      expect(result).toBeNull();
    });
  });
});
