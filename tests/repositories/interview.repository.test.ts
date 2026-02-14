// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.fn();
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interview: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

const select = {
  id: true,
  bookId: true,
  questionId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

describe("interviewRepository", () => {
  let interviewRepository: Awaited<
    typeof import("@/repositories/interview.repository")
  >["interviewRepository"];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("@/repositories/interview.repository");
    interviewRepository = mod.interviewRepository;
  });

  describe("create", () => {
    it("creates an interview with ACTIVE status", async () => {
      const input = { bookId: "b1", questionId: "q1" };
      const expected = { id: "i1", ...input, status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
      mockCreate.mockResolvedValue(expected);

      const result = await interviewRepository.create(input);

      expect(result).toEqual(expected);
      expect(mockCreate).toHaveBeenCalledWith({
        data: { bookId: "b1", questionId: "q1", status: "ACTIVE" },
        select,
      });
    });
  });

  describe("findById", () => {
    it("returns an interview when found", async () => {
      const expected = { id: "i1", bookId: "b1", questionId: "q1", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
      mockFindUnique.mockResolvedValue(expected);

      const result = await interviewRepository.findById("i1");

      expect(result).toEqual(expected);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "i1" }, select });
    });

    it("returns null when not found", async () => {
      mockFindUnique.mockResolvedValue(null);
      const result = await interviewRepository.findById("missing");
      expect(result).toBeNull();
    });
  });

  describe("findByBookId", () => {
    it("returns interviews for a book", async () => {
      const expected = [{ id: "i1", bookId: "b1", questionId: "q1", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() }];
      mockFindMany.mockResolvedValue(expected);

      const result = await interviewRepository.findByBookId("b1");

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({ where: { bookId: "b1" }, select });
    });
  });

  describe("updateStatus", () => {
    it("updates interview status", async () => {
      const expected = { id: "i1", bookId: "b1", questionId: "q1", status: "COMPLETE", createdAt: new Date(), updatedAt: new Date() };
      mockUpdate.mockResolvedValue(expected);

      const result = await interviewRepository.updateStatus("i1", "COMPLETE");

      expect(result).toEqual(expected);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "i1" },
        data: { status: "COMPLETE" },
        select,
      });
    });
  });
});
