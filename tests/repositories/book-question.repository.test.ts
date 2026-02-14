// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/mock-db";

vi.mock("server-only", () => ({}));

const {
  db,
  executeTakeFirstOrThrow,
  execute,
  selectFrom,
  insertInto,
  updateTable,
  deleteFrom,
} = createMockDb();

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/id", () => ({ createId: () => "generated-id" }));

describe("bookQuestionRepository", () => {
  let bookQuestionRepository: Awaited<
    typeof import("@/repositories/book-question.repository")
  >["bookQuestionRepository"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/repositories/book-question.repository");
    bookQuestionRepository = mod.bookQuestionRepository;
  });

  describe("create", () => {
    it("creates a book question with NOT_STARTED status", async () => {
      const expected = {
        id: "bq1",
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
        status: "NOT_STARTED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await bookQuestionRepository.create({
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
      });

      expect(result).toEqual(expected);
      expect(insertInto).toHaveBeenCalledWith("book_question");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("findByBookId", () => {
    it("returns book questions for a book", async () => {
      const expected = [
        {
          id: "bq1",
          bookId: "b1",
          questionId: "q1",
          orderIndex: 0,
          status: "NOT_STARTED",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      execute.mockResolvedValue(expected);

      const result = await bookQuestionRepository.findByBookId("b1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("book_question");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("updates book question status", async () => {
      const expected = {
        id: "bq1",
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
        status: "STARTED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await bookQuestionRepository.updateStatus("bq1", "STARTED");

      expect(result).toEqual(expected);
      expect(updateTable).toHaveBeenCalledWith("book_question");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes a book question", async () => {
      const expected = {
        id: "bq1",
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
        status: "NOT_STARTED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await bookQuestionRepository.delete("bq1");

      expect(result).toEqual(expected);
      expect(deleteFrom).toHaveBeenCalledWith("book_question");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });
});
