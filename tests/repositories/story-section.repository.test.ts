// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    storySection: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

const select = {
  id: true,
  storyId: true,
  orderIndex: true,
  content: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

describe("storySectionRepository", () => {
  let storySectionRepository: Awaited<
    typeof import("@/repositories/story-section.repository")
  >["storySectionRepository"];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("@/repositories/story-section.repository");
    storySectionRepository = mod.storySectionRepository;
  });

  describe("create", () => {
    it("creates a section with GENERATING status", async () => {
      const input = { storyId: "st1", orderIndex: 0, content: "First section draft" };
      const expected = { id: "ss1", ...input, status: "GENERATING", createdAt: new Date(), updatedAt: new Date() };
      mockCreate.mockResolvedValue(expected);

      const result = await storySectionRepository.create(input);

      expect(result).toEqual(expected);
      expect(mockCreate).toHaveBeenCalledWith({
        data: { ...input, status: "GENERATING" },
        select,
      });
    });
  });

  describe("findByStoryId", () => {
    it("returns sections ordered by orderIndex", async () => {
      const expected = [
        { id: "ss1", storyId: "st1", orderIndex: 0, content: "Section 1", status: "DRAFT", createdAt: new Date(), updatedAt: new Date() },
        { id: "ss2", storyId: "st1", orderIndex: 1, content: "Section 2", status: "GENERATING", createdAt: new Date(), updatedAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(expected);

      const result = await storySectionRepository.findByStoryId("st1");

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { storyId: "st1" },
        select,
        orderBy: { orderIndex: "asc" },
      });
    });
  });

  describe("updateContent", () => {
    it("updates section content", async () => {
      const expected = { id: "ss1", storyId: "st1", orderIndex: 0, content: "Updated content", status: "DRAFT", createdAt: new Date(), updatedAt: new Date() };
      mockUpdate.mockResolvedValue(expected);

      const result = await storySectionRepository.updateContent("ss1", "Updated content");

      expect(result).toEqual(expected);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "ss1" },
        data: { content: "Updated content" },
        select,
      });
    });
  });

  describe("updateStatus", () => {
    it("updates section status", async () => {
      const expected = { id: "ss1", storyId: "st1", orderIndex: 0, content: "Section 1", status: "FINAL", createdAt: new Date(), updatedAt: new Date() };
      mockUpdate.mockResolvedValue(expected);

      const result = await storySectionRepository.updateStatus("ss1", "FINAL");

      expect(result).toEqual(expected);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "ss1" },
        data: { status: "FINAL" },
        select,
      });
    });
  });
});
