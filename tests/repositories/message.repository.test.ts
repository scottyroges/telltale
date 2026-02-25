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
  where,
} = createMockDb();

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/id", () => ({ createId: () => "generated-id" }));

describe("messageRepository", () => {
  let messageRepository: Awaited<
    typeof import("@/repositories/message.repository")
  >["messageRepository"];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/repositories/message.repository");
    messageRepository = mod.messageRepository;
  });

  describe("create", () => {
    it("creates a message", async () => {
      const expected = { id: "m1", interviewId: "i1", role: "USER", content: "Hello", hidden: false, createdAt: new Date() };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await messageRepository.create({
        interviewId: "i1",
        role: "USER",
        content: "Hello",
      });

      expect(result).toEqual(expected);
      expect(insertInto).toHaveBeenCalledWith("message");
      expect(executeTakeFirstOrThrow).toHaveBeenCalled();
    });

    it("creates a hidden message when hidden: true is passed", async () => {
      const expected = { id: "m1", interviewId: "i1", role: "USER", content: "Redirect prompt", hidden: true, createdAt: new Date() };
      executeTakeFirstOrThrow.mockResolvedValue(expected);

      const result = await messageRepository.create({
        interviewId: "i1",
        role: "USER",
        content: "Redirect prompt",
        hidden: true,
      });

      expect(result).toEqual(expected);
      expect(insertInto).toHaveBeenCalledWith("message");
    });
  });

  describe("findByInterviewId", () => {
    it("returns messages ordered by createdAt", async () => {
      const expected = [
        { id: "m1", interviewId: "i1", role: "USER", content: "Hello", hidden: false, createdAt: new Date() },
        { id: "m2", interviewId: "i1", role: "ASSISTANT", content: "Hi there!", hidden: false, createdAt: new Date() },
      ];
      execute.mockResolvedValue(expected);

      const result = await messageRepository.findByInterviewId("i1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("message");
      expect(execute).toHaveBeenCalled();
    });

    it("excludes hidden messages by default", async () => {
      execute.mockResolvedValue([]);

      await messageRepository.findByInterviewId("i1");

      expect(selectFrom).toHaveBeenCalledWith("message");
      // Two .where() calls: interviewId filter + hidden filter
      expect(where).toHaveBeenCalledTimes(2);
      expect(where).toHaveBeenCalledWith("interviewId", "=", "i1");
      expect(where).toHaveBeenCalledWith("hidden", "=", false);
    });

    it("includes hidden messages when includeHidden is true", async () => {
      execute.mockResolvedValue([]);

      await messageRepository.findByInterviewId("i1", { includeHidden: true });

      expect(selectFrom).toHaveBeenCalledWith("message");
      // Only one .where() call: interviewId filter, no hidden filter
      expect(where).toHaveBeenCalledTimes(1);
      expect(where).toHaveBeenCalledWith("interviewId", "=", "i1");
      expect(where).not.toHaveBeenCalledWith("hidden", "=", false);
    });
  });
});
