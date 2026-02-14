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

describe("interviewRepository", () => {
  let interviewRepository: Awaited<
    typeof import("@/repositories/interview.repository")
  >["interviewRepository"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/repositories/interview.repository");
    interviewRepository = mod.interviewRepository;
  });

  describe("create", () => {
    it("creates an interview with ACTIVE status", async () => {
      const expected = {
        id: "i1",
        bookId: "b1",
        questionId: "q1",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await interviewRepository.create({
        bookId: "b1",
        questionId: "q1",
      });

      expect(result).toEqual(expected);
      expect(insertInto).toHaveBeenCalledWith("interview");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns an interview when found", async () => {
      const expected = {
        id: "i1",
        bookId: "b1",
        questionId: "q1",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirst.mockResolvedValue(expected);

      const result = await interviewRepository.findById("i1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("interview");
      expect(executeTakeFirst).toHaveBeenCalled();
    });

    it("returns null when not found", async () => {
      executeTakeFirst.mockResolvedValue(undefined);
      const result = await interviewRepository.findById("missing");
      expect(result).toBeNull();
      expect(selectFrom).toHaveBeenCalledWith("interview");
    });
  });

  describe("findByBookId", () => {
    it("returns interviews for a book", async () => {
      const expected = [
        {
          id: "i1",
          bookId: "b1",
          questionId: "q1",
          status: "ACTIVE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      execute.mockResolvedValue(expected);

      const result = await interviewRepository.findByBookId("b1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("interview");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("updates interview status", async () => {
      const expected = {
        id: "i1",
        bookId: "b1",
        questionId: "q1",
        status: "COMPLETE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await interviewRepository.updateStatus("i1", "COMPLETE");

      expect(result).toEqual(expected);
      expect(updateTable).toHaveBeenCalledWith("interview");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });
});
