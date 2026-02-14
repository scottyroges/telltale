// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.fn();
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    book: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

const select = {
  id: true,
  userId: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

describe("bookRepository", () => {
  let bookRepository: Awaited<
    typeof import("@/repositories/book.repository")
  >["bookRepository"];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("@/repositories/book.repository");
    bookRepository = mod.bookRepository;
  });

  describe("create", () => {
    it("creates a book with IN_PROGRESS status", async () => {
      const input = { userId: "user1", title: "My Life Story" };
      const expected = { id: "b1", ...input, status: "IN_PROGRESS", createdAt: new Date(), updatedAt: new Date() };
      mockCreate.mockResolvedValue(expected);

      const result = await bookRepository.create(input);

      expect(result).toEqual(expected);
      expect(mockCreate).toHaveBeenCalledWith({
        data: { userId: "user1", title: "My Life Story", status: "IN_PROGRESS" },
        select,
      });
    });
  });

  describe("findById", () => {
    it("returns a book when found", async () => {
      const expected = { id: "b1", userId: "user1", title: "My Life Story", status: "IN_PROGRESS", createdAt: new Date(), updatedAt: new Date() };
      mockFindUnique.mockResolvedValue(expected);

      const result = await bookRepository.findById("b1");

      expect(result).toEqual(expected);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "b1" }, select });
    });

    it("returns null when not found", async () => {
      mockFindUnique.mockResolvedValue(null);
      const result = await bookRepository.findById("missing");
      expect(result).toBeNull();
    });
  });

  describe("findByIdWithDetails", () => {
    it("returns book with bookQuestions and interviews", async () => {
      const expected = {
        id: "b1",
        userId: "user1",
        title: "My Life Story",
        status: "IN_PROGRESS",
        createdAt: new Date(),
        updatedAt: new Date(),
        bookQuestions: [
          {
            id: "bq1",
            bookId: "b1",
            questionId: "q1",
            orderIndex: 0,
            status: "NOT_STARTED",
            createdAt: new Date(),
            updatedAt: new Date(),
            question: { id: "q1", category: "childhood", prompt: "Tell me…", orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
          },
        ],
        interviews: [{ id: "i1", bookId: "b1", questionId: "q1", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() }],
      };
      mockFindUnique.mockResolvedValue(expected);

      const result = await bookRepository.findByIdWithDetails("b1");

      expect(result).toEqual(expected);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "b1" },
        select: {
          ...select,
          bookQuestions: {
            select: {
              id: true,
              bookId: true,
              questionId: true,
              orderIndex: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              question: {
                select: {
                  id: true,
                  category: true,
                  prompt: true,
                  orderIndex: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
            orderBy: { orderIndex: "asc" },
          },
          interviews: {
            select: {
              id: true,
              bookId: true,
              questionId: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });
  });

  describe("findByUserId", () => {
    it("returns books for a user", async () => {
      const expected = [{ id: "b1", userId: "user1", title: "Book 1", status: "IN_PROGRESS", createdAt: new Date(), updatedAt: new Date() }];
      mockFindMany.mockResolvedValue(expected);

      const result = await bookRepository.findByUserId("user1");

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({ where: { userId: "user1" }, select });
    });
  });

  describe("updateStatus", () => {
    it("updates book status", async () => {
      const expected = { id: "b1", userId: "user1", title: "Book 1", status: "COMPLETE", createdAt: new Date(), updatedAt: new Date() };
      mockUpdate.mockResolvedValue(expected);

      const result = await bookRepository.updateStatus("b1", "COMPLETE");

      expect(result).toEqual(expected);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: { status: "COMPLETE" },
        select,
      });
    });
  });
});
