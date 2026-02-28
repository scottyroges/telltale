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

describe("storySectionRepository", () => {
  let storySectionRepository: Awaited<
    typeof import("@/repositories/story-section.repository")
  >["storySectionRepository"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/repositories/story-section.repository");
    storySectionRepository = mod.storySectionRepository;
  });

  describe("create", () => {
    it("creates a section with GENERATING status", async () => {
      const expected = {
        id: "ss1",
        storyId: "st1",
        orderIndex: 0,
        content: "First section draft",
        status: "GENERATING",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await storySectionRepository.create({
        storyId: "st1",
        orderIndex: 0,
        content: "First section draft",
      });

      expect(result).toEqual(expected);
      expect(insertInto).toHaveBeenCalledWith("storySection");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("findByStoryId", () => {
    it("returns sections ordered by orderIndex", async () => {
      const expected = [
        {
          id: "ss1",
          storyId: "st1",
          orderIndex: 0,
          content: "Section 1",
          status: "DRAFT",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "ss2",
          storyId: "st1",
          orderIndex: 1,
          content: "Section 2",
          status: "GENERATING",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      execute.mockResolvedValue(expected);

      const result = await storySectionRepository.findByStoryId("st1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("storySection");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("updateContent", () => {
    it("updates section content", async () => {
      const expected = {
        id: "ss1",
        storyId: "st1",
        orderIndex: 0,
        content: "Updated content",
        status: "DRAFT",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await storySectionRepository.updateContent(
        "ss1",
        "Updated content",
      );

      expect(result).toEqual(expected);
      expect(updateTable).toHaveBeenCalledWith("storySection");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("updates section status", async () => {
      const expected = {
        id: "ss1",
        storyId: "st1",
        orderIndex: 0,
        content: "Section 1",
        status: "FINAL",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await storySectionRepository.updateStatus("ss1", "FINAL");

      expect(result).toEqual(expected);
      expect(updateTable).toHaveBeenCalledWith("storySection");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });
});
