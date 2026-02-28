// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/mock-db";

vi.mock("server-only", () => ({}));

const {
  db,
  executeTakeFirst,
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
    it("creates a book question", async () => {
      const expected = {
        id: "bq1",
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
        interviewId: null,
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
      expect(insertInto).toHaveBeenCalledWith("bookQuestion");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns a book question by id", async () => {
      const expected = {
        id: "bq1",
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
        interviewId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirst.mockResolvedValue(expected);

      const result = await bookQuestionRepository.findById("bq1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("bookQuestion");
      expect(executeTakeFirst).toHaveBeenCalled();
    });

    it("returns null when not found", async () => {
      executeTakeFirst.mockResolvedValue(undefined);

      const result = await bookQuestionRepository.findById("missing");

      expect(result).toBeNull();
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
          interviewId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      execute.mockResolvedValue(expected);

      const result = await bookQuestionRepository.findByBookId("b1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("bookQuestion");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("setInterviewId", () => {
    it("sets interviewId on a book question", async () => {
      const expected = {
        id: "bq1",
        bookId: "b1",
        questionId: "q1",
        orderIndex: 0,
        interviewId: "int-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await bookQuestionRepository.setInterviewId("bq1", "int-1");

      expect(result).toEqual(expected);
      expect(updateTable).toHaveBeenCalledWith("bookQuestion");
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
        interviewId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await bookQuestionRepository.delete("bq1");

      expect(result).toEqual(expected);
      expect(deleteFrom).toHaveBeenCalledWith("bookQuestion");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });
});
