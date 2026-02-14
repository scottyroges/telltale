// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.fn();
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    story: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

const select = {
  id: true,
  bookId: true,
  interviewId: true,
  title: true,
  prose: true,
  orderIndex: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

describe("storyRepository", () => {
  let storyRepository: Awaited<
    typeof import("@/repositories/story.repository")
  >["storyRepository"];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("@/repositories/story.repository");
    storyRepository = mod.storyRepository;
  });

  describe("create", () => {
    it("creates a story with DRAFT status", async () => {
      const input = { bookId: "b1", interviewId: "i1", title: "Childhood Memories", orderIndex: 0 };
      const expected = { id: "st1", ...input, prose: null, status: "DRAFT", createdAt: new Date(), updatedAt: new Date() };
      mockCreate.mockResolvedValue(expected);

      const result = await storyRepository.create(input);

      expect(result).toEqual(expected);
      expect(mockCreate).toHaveBeenCalledWith({
        data: { ...input, status: "DRAFT" },
        select,
      });
    });
  });

  describe("findById", () => {
    it("returns a story when found", async () => {
      const expected = { id: "st1", bookId: "b1", interviewId: "i1", title: "Childhood Memories", prose: null, orderIndex: 0, status: "DRAFT", createdAt: new Date(), updatedAt: new Date() };
      mockFindUnique.mockResolvedValue(expected);

      const result = await storyRepository.findById("st1");

      expect(result).toEqual(expected);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "st1" }, select });
    });

    it("returns null when not found", async () => {
      mockFindUnique.mockResolvedValue(null);
      const result = await storyRepository.findById("missing");
      expect(result).toBeNull();
    });
  });

  describe("findByBookId", () => {
    it("returns stories ordered by orderIndex", async () => {
      const expected = [
        { id: "st1", bookId: "b1", interviewId: "i1", title: "Story 1", prose: null, orderIndex: 0, status: "DRAFT", createdAt: new Date(), updatedAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(expected);

      const result = await storyRepository.findByBookId("b1");

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { bookId: "b1" },
        select,
        orderBy: { orderIndex: "asc" },
      });
    });
  });

  describe("findByInterviewId", () => {
    it("returns stories for an interview", async () => {
      const expected = [
        { id: "st1", bookId: "b1", interviewId: "i1", title: "Story 1", prose: null, orderIndex: 0, status: "DRAFT", createdAt: new Date(), updatedAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(expected);

      const result = await storyRepository.findByInterviewId("i1");

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({ where: { interviewId: "i1" }, select });
    });
  });

  describe("updateProse", () => {
    it("updates prose content", async () => {
      const expected = { id: "st1", bookId: "b1", interviewId: "i1", title: "Story 1", prose: "Once upon a time…", orderIndex: 0, status: "DRAFT", createdAt: new Date(), updatedAt: new Date() };
      mockUpdate.mockResolvedValue(expected);

      const result = await storyRepository.updateProse("st1", "Once upon a time…");

      expect(result).toEqual(expected);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "st1" },
        data: { prose: "Once upon a time…" },
        select,
      });
    });
  });

  describe("updateStatus", () => {
    it("updates story status", async () => {
      const expected = { id: "st1", bookId: "b1", interviewId: "i1", title: "Story 1", prose: null, orderIndex: 0, status: "FINAL", createdAt: new Date(), updatedAt: new Date() };
      mockUpdate.mockResolvedValue(expected);

      const result = await storyRepository.updateStatus("st1", "FINAL");

      expect(result).toEqual(expected);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "st1" },
        data: { status: "FINAL" },
        select,
      });
    });
  });
});
