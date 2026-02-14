// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bookQuestion: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

const select = {
  id: true,
  bookId: true,
  questionId: true,
  orderIndex: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

describe("bookQuestionRepository", () => {
  let bookQuestionRepository: Awaited<
    typeof import("@/repositories/book-question.repository")
  >["bookQuestionRepository"];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("@/repositories/book-question.repository");
    bookQuestionRepository = mod.bookQuestionRepository;
  });

  describe("create", () => {
    it("creates a book question", async () => {
      const input = { bookId: "b1", questionId: "q1", orderIndex: 0 };
      const expected = { id: "bq1", ...input, status: "NOT_STARTED", createdAt: new Date(), updatedAt: new Date() };
      mockCreate.mockResolvedValue(expected);

      const result = await bookQuestionRepository.create(input);

      expect(result).toEqual(expected);
      expect(mockCreate).toHaveBeenCalledWith({
        data: { ...input, status: "NOT_STARTED" },
        select,
      });
    });
  });

  describe("findByBookId", () => {
    it("returns book questions ordered by orderIndex", async () => {
      const expected = [
        { id: "bq1", bookId: "b1", questionId: "q1", orderIndex: 0, status: "NOT_STARTED", createdAt: new Date(), updatedAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(expected);

      const result = await bookQuestionRepository.findByBookId("b1");

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { bookId: "b1" },
        select,
        orderBy: { orderIndex: "asc" },
      });
    });
  });

  describe("updateStatus", () => {
    it("updates book question status", async () => {
      const expected = { id: "bq1", bookId: "b1", questionId: "q1", orderIndex: 0, status: "STARTED", createdAt: new Date(), updatedAt: new Date() };
      mockUpdate.mockResolvedValue(expected);

      const result = await bookQuestionRepository.updateStatus("bq1", "STARTED");

      expect(result).toEqual(expected);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "bq1" },
        data: { status: "STARTED" },
        select,
      });
    });
  });

  describe("delete", () => {
    it("deletes a book question", async () => {
      const expected = { id: "bq1", bookId: "b1", questionId: "q1", orderIndex: 0, status: "NOT_STARTED", createdAt: new Date(), updatedAt: new Date() };
      mockDelete.mockResolvedValue(expected);

      const result = await bookQuestionRepository.delete("bq1");

      expect(result).toEqual(expected);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "bq1" }, select });
    });
  });
});
