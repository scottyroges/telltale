// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreateMany = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    insight: {
      createMany: (...args: unknown[]) => mockCreateMany(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

const select = {
  id: true,
  bookId: true,
  interviewId: true,
  type: true,
  content: true,
  explored: true,
  createdAt: true,
  updatedAt: true,
};

describe("insightRepository", () => {
  let insightRepository: Awaited<
    typeof import("@/repositories/insight.repository")
  >["insightRepository"];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("@/repositories/insight.repository");
    insightRepository = mod.insightRepository;
  });

  describe("createMany", () => {
    it("bulk creates insights and returns count", async () => {
      const input = [
        { bookId: "b1", interviewId: "i1", type: "ENTITY" as const, content: "Sister Maria" },
        { bookId: "b1", interviewId: "i1", type: "EVENT" as const, content: "Moving to the city" },
      ];
      mockCreateMany.mockResolvedValue({ count: 2 });

      const result = await insightRepository.createMany(input);

      expect(result).toEqual({ count: 2 });
      expect(mockCreateMany).toHaveBeenCalledWith({ data: input });
    });
  });

  describe("findByInterviewId", () => {
    it("returns insights for an interview", async () => {
      const expected = [
        { id: "ins1", bookId: "b1", interviewId: "i1", type: "ENTITY", content: "Sister Maria", explored: false, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(expected);

      const result = await insightRepository.findByInterviewId("i1");

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({ where: { interviewId: "i1" }, select });
    });
  });

  describe("findByBookId", () => {
    it("returns insights across all interviews in a book", async () => {
      const expected = [
        { id: "ins1", bookId: "b1", interviewId: "i1", type: "ENTITY", content: "Sister Maria", explored: false, createdAt: new Date(), updatedAt: new Date() },
        { id: "ins2", bookId: "b1", interviewId: "i2", type: "EMOTION", content: "Joy at reunion", explored: false, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(expected);

      const result = await insightRepository.findByBookId("b1");

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({ where: { bookId: "b1" }, select });
    });
  });

  describe("markExplored", () => {
    it("sets explored to true", async () => {
      const expected = { id: "ins1", bookId: "b1", interviewId: "i1", type: "ENTITY", content: "Sister Maria", explored: true, createdAt: new Date(), updatedAt: new Date() };
      mockUpdate.mockResolvedValue(expected);

      const result = await insightRepository.markExplored("ins1");

      expect(result).toEqual(expected);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "ins1" },
        data: { explored: true },
        select,
      });
    });
  });
});
