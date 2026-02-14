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
} = createMockDb();

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/id", () => ({ createId: () => "generated-id" }));

describe("questionRepository", () => {
  let questionRepository: Awaited<
    typeof import("@/repositories/question.repository")
  >["questionRepository"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/repositories/question.repository");
    questionRepository = mod.questionRepository;
  });

  describe("create", () => {
    it("creates a question and returns it", async () => {
      const expected = {
        id: "q1",
        category: "childhood",
        prompt: "Tell me about…",
        orderIndex: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await questionRepository.create({
        category: "childhood",
        prompt: "Tell me about…",
        orderIndex: 1,
      });

      expect(result).toEqual(expected);
      expect(insertInto).toHaveBeenCalledWith("question");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns a question when found", async () => {
      const expected = {
        id: "q1",
        category: "childhood",
        prompt: "Tell me about…",
        orderIndex: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      executeTakeFirst.mockResolvedValue(expected);

      const result = await questionRepository.findById("q1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("question");
      expect(executeTakeFirst).toHaveBeenCalled();
    });

    it("returns null when not found", async () => {
      executeTakeFirst.mockResolvedValue(undefined);

      const result = await questionRepository.findById("missing");

      expect(result).toBeNull();
      expect(selectFrom).toHaveBeenCalledWith("question");
    });
  });

  describe("findAll", () => {
    it("returns all questions", async () => {
      const expected = [
        { id: "q1", category: "childhood", prompt: "Q1", orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
        { id: "q2", category: "career", prompt: "Q2", orderIndex: 2, createdAt: new Date(), updatedAt: new Date() },
      ];
      execute.mockResolvedValue(expected);

      const result = await questionRepository.findAll();

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("question");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("findByCategory", () => {
    it("returns questions filtered by category", async () => {
      const expected = [
        { id: "q1", category: "childhood", prompt: "Q1", orderIndex: 1, createdAt: new Date(), updatedAt: new Date() },
      ];
      execute.mockResolvedValue(expected);

      const result = await questionRepository.findByCategory("childhood");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("question");
      expect(execute).toHaveBeenCalled();
    });
  });
});
