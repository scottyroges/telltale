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
} = createMockDb();

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/id", () => ({ createId: () => "generated-id" }));

describe("insightRepository", () => {
  let insightRepository: Awaited<
    typeof import("@/repositories/insight.repository")
  >["insightRepository"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/repositories/insight.repository");
    insightRepository = mod.insightRepository;
  });

  describe("createMany", () => {
    it("bulk creates insights and returns count", async () => {
      const input = [
        { bookId: "b1", interviewId: "i1", type: "ENTITY" as const, content: "Sister Maria" },
        { bookId: "b1", interviewId: "i1", type: "EVENT" as const, content: "Moving to the city" },
      ];
      execute.mockResolvedValue([]);

      const result = await insightRepository.createMany(input);

      expect(result).toEqual({ count: 2 });
      expect(insertInto).toHaveBeenCalledWith("insight");
      expect(execute).toHaveBeenCalled();
    });

    it("returns count 0 for empty array without calling db", async () => {
      const result = await insightRepository.createMany([]);

      expect(result).toEqual({ count: 0 });
      expect(insertInto).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
    });
  });

  describe("findByInterviewId", () => {
    it("returns insights for an interview", async () => {
      const expected = [
        {
          id: "ins1",
          bookId: "b1",
          interviewId: "i1",
          type: "ENTITY",
          content: "Sister Maria",
          explored: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      execute.mockResolvedValue(expected);

      const result = await insightRepository.findByInterviewId("i1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("insight");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("findByBookId", () => {
    it("returns insights across all interviews in a book", async () => {
      const expected = [
        {
          id: "ins1",
          bookId: "b1",
          interviewId: "i1",
          type: "ENTITY",
          content: "Sister Maria",
          explored: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "ins2",
          bookId: "b1",
          interviewId: "i2",
          type: "EMOTION",
          content: "Joy at reunion",
          explored: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      execute.mockResolvedValue(expected);

      const result = await insightRepository.findByBookId("b1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("insight");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("markExplored", () => {
    it("sets explored to true", async () => {
      const expected = {
        id: "ins1",
        bookId: "b1",
        interviewId: "i1",
        type: "ENTITY",
        content: "Sister Maria",
        explored: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await insightRepository.markExplored("ins1");

      expect(result).toEqual(expected);
      expect(updateTable).toHaveBeenCalledWith("insight");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });
});
