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

describe("storyRepository", () => {
  let storyRepository: Awaited<
    typeof import("@/repositories/story.repository")
  >["storyRepository"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/repositories/story.repository");
    storyRepository = mod.storyRepository;
  });

  describe("create", () => {
    it("creates a story with DRAFT status", async () => {
      const expected = {
        id: "st1",
        bookId: "b1",
        interviewId: "i1",
        title: "Childhood Memories",
        prose: null,
        orderIndex: 0,
        status: "DRAFT",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await storyRepository.create({
        bookId: "b1",
        interviewId: "i1",
        title: "Childhood Memories",
        orderIndex: 0,
      });

      expect(result).toEqual(expected);
      expect(insertInto).toHaveBeenCalledWith("story");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns a story when found", async () => {
      const expected = {
        id: "st1",
        bookId: "b1",
        interviewId: "i1",
        title: "Childhood Memories",
        prose: null,
        orderIndex: 0,
        status: "DRAFT",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirst.mockResolvedValue(expected);

      const result = await storyRepository.findById("st1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("story");
      expect(executeTakeFirst).toHaveBeenCalled();
    });

    it("returns null when not found", async () => {
      executeTakeFirst.mockResolvedValue(undefined);
      const result = await storyRepository.findById("missing");
      expect(result).toBeNull();
      expect(selectFrom).toHaveBeenCalledWith("story");
    });
  });

  describe("findByBookId", () => {
    it("returns stories ordered by orderIndex", async () => {
      const expected = [
        {
          id: "st1",
          bookId: "b1",
          interviewId: "i1",
          title: "Story 1",
          prose: null,
          orderIndex: 0,
          status: "DRAFT",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      execute.mockResolvedValue(expected);

      const result = await storyRepository.findByBookId("b1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("story");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("findByInterviewId", () => {
    it("returns stories for an interview", async () => {
      const expected = [
        {
          id: "st1",
          bookId: "b1",
          interviewId: "i1",
          title: "Story 1",
          prose: null,
          orderIndex: 0,
          status: "DRAFT",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      execute.mockResolvedValue(expected);

      const result = await storyRepository.findByInterviewId("i1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("story");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("updateProse", () => {
    it("updates prose content", async () => {
      const expected = {
        id: "st1",
        bookId: "b1",
        interviewId: "i1",
        title: "Story 1",
        prose: "Once upon a time…",
        orderIndex: 0,
        status: "DRAFT",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await storyRepository.updateProse(
        "st1",
        "Once upon a time…",
      );

      expect(result).toEqual(expected);
      expect(updateTable).toHaveBeenCalledWith("story");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("updates story status", async () => {
      const expected = {
        id: "st1",
        bookId: "b1",
        interviewId: "i1",
        title: "Story 1",
        prose: null,
        orderIndex: 0,
        status: "FINAL",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await storyRepository.updateStatus("st1", "FINAL");

      expect(result).toEqual(expected);
      expect(updateTable).toHaveBeenCalledWith("story");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });
});
