// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.fn();
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    question: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

const select = {
  id: true,
  category: true,
  prompt: true,
  orderIndex: true,
  createdAt: true,
  updatedAt: true,
};

describe("questionRepository", () => {
  let questionRepository: Awaited<
    typeof import("@/repositories/question.repository")
  >["questionRepository"];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("@/repositories/question.repository");
    questionRepository = mod.questionRepository;
  });

  describe("create", () => {
    it("creates a question with the given data", async () => {
      const input = { category: "childhood", prompt: "Tell me about…", orderIndex: 1 };
      const expected = { id: "q1", ...input, createdAt: new Date(), updatedAt: new Date() };
      mockCreate.mockResolvedValue(expected);

      const result = await questionRepository.create(input);

      expect(result).toEqual(expected);
      expect(mockCreate).toHaveBeenCalledWith({ data: input, select });
    });
  });

  describe("findById", () => {
    it("returns a question when found", async () => {
      const expected = { id: "q1", category: "childhood", prompt: "Tell me about…", orderIndex: 1, createdAt: new Date(), updatedAt: new Date() };
      mockFindUnique.mockResolvedValue(expected);

      const result = await questionRepository.findById("q1");

      expect(result).toEqual(expected);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "q1" }, select });
    });

    it("returns null when not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await questionRepository.findById("missing");

      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("returns all questions ordered by orderIndex", async () => {
      const expected = [
        { id: "q1", category: "childhood", prompt: "Q1", orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: "q2", category: "career", prompt: "Q2", orderIndex: 2, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(expected);

      const result = await questionRepository.findAll();

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({ select, orderBy: { orderIndex: "asc" } });
    });
  });

  describe("findByCategory", () => {
    it("returns questions filtered by category", async () => {
      const expected = [{ id: "q1", category: "childhood", prompt: "Q1", orderIndex: 1, createdAt: new Date(), updatedAt: new Date() }];
      mockFindMany.mockResolvedValue(expected);

      const result = await questionRepository.findByCategory("childhood");

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { category: "childhood" },
        select,
        orderBy: { orderIndex: "asc" },
      });
    });
  });
});
