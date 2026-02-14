// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/mock-db";

vi.mock("server-only", () => ({}));

const {
  db,
  executeTakeFirstOrThrow,
  executeTakeFirst,
  execute,
  selectFrom,
  insertInto,
  updateTable,
} = createMockDb();

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/id", () => ({ createId: () => "generated-id" }));
vi.mock("kysely/helpers/postgres", () => ({
  jsonArrayFrom: (qb: unknown) => qb,
  jsonObjectFrom: (qb: unknown) => qb,
}));

describe("bookRepository", () => {
  let bookRepository: Awaited<
    typeof import("@/repositories/book.repository")
  >["bookRepository"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/repositories/book.repository");
    bookRepository = mod.bookRepository;
  });

  describe("create", () => {
    it("creates a book with IN_PROGRESS status", async () => {
      const expected = {
        id: "b1",
        userId: "user1",
        title: "My Life Story",
        status: "IN_PROGRESS",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await bookRepository.create({
        userId: "user1",
        title: "My Life Story",
      });

      expect(result).toEqual(expected);
      expect(insertInto).toHaveBeenCalledWith("book");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns a book when found", async () => {
      const expected = {
        id: "b1",
        userId: "user1",
        title: "My Life Story",
        status: "IN_PROGRESS",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirst.mockResolvedValue(expected);

      const result = await bookRepository.findById("b1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("book");
      expect(executeTakeFirst).toHaveBeenCalled();
    });

    it("returns null when not found", async () => {
      executeTakeFirst.mockResolvedValue(undefined);
      const result = await bookRepository.findById("missing");
      expect(result).toBeNull();
      expect(selectFrom).toHaveBeenCalledWith("book");
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
            question: {
              id: "q1",
              category: "childhood",
              prompt: "Tell me…",
              orderIndex: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
        interviews: [
          {
            id: "i1",
            bookId: "b1",
            questionId: "q1",
            status: "ACTIVE",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      executeTakeFirst.mockResolvedValue(expected);

      const result = await bookRepository.findByIdWithDetails("b1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("book");
      expect(executeTakeFirst).toHaveBeenCalled();
    });

    it("returns null when not found", async () => {
      executeTakeFirst.mockResolvedValue(undefined);
      const result = await bookRepository.findByIdWithDetails("missing");
      expect(result).toBeNull();
      expect(selectFrom).toHaveBeenCalledWith("book");
    });
  });

  describe("findByUserId", () => {
    it("returns books for a user", async () => {
      const expected = [
        {
          id: "b1",
          userId: "user1",
          title: "Book 1",
          status: "IN_PROGRESS",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      execute.mockResolvedValue(expected);

      const result = await bookRepository.findByUserId("user1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("book");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("updates book status", async () => {
      const expected = {
        id: "b1",
        userId: "user1",
        title: "Book 1",
        status: "COMPLETE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await bookRepository.updateStatus("b1", "COMPLETE");

      expect(result).toEqual(expected);
      expect(updateTable).toHaveBeenCalledWith("book");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });
});
