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
      const expected = { id: "m1", interviewId: "i1", role: "USER", content: "Hello", createdAt: new Date() };
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
  });

  describe("findByInterviewId", () => {
    it("returns messages ordered by createdAt", async () => {
      const expected = [
        { id: "m1", interviewId: "i1", role: "USER", content: "Hello", createdAt: new Date() },
        { id: "m2", interviewId: "i1", role: "ASSISTANT", content: "Hi there!", createdAt: new Date() },
      ];
      execute.mockResolvedValue(expected);

      const result = await messageRepository.findByInterviewId("i1");

      expect(result).toEqual(expected);
      expect(selectFrom).toHaveBeenCalledWith("message");
      expect(execute).toHaveBeenCalled();
    });
  });
});
