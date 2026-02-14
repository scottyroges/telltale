// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    message: {
      create: (...args: unknown[]) => mockCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

const select = {
  id: true,
  interviewId: true,
  role: true,
  content: true,
  createdAt: true,
};

describe("messageRepository", () => {
  let messageRepository: Awaited<
    typeof import("@/repositories/message.repository")
  >["messageRepository"];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("@/repositories/message.repository");
    messageRepository = mod.messageRepository;
  });

  describe("create", () => {
    it("creates a message", async () => {
      const input = { interviewId: "i1", role: "USER" as const, content: "Hello" };
      const expected = { id: "m1", ...input, createdAt: new Date() };
      mockCreate.mockResolvedValue(expected);

      const result = await messageRepository.create(input);

      expect(result).toEqual(expected);
      expect(mockCreate).toHaveBeenCalledWith({ data: input, select });
    });
  });

  describe("findByInterviewId", () => {
    it("returns messages ordered by createdAt", async () => {
      const expected = [
        { id: "m1", interviewId: "i1", role: "USER", content: "Hello", createdAt: new Date() },
        { id: "m2", interviewId: "i1", role: "ASSISTANT", content: "Hi there!", createdAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(expected);

      const result = await messageRepository.findByInterviewId("i1");

      expect(result).toEqual(expected);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { interviewId: "i1" },
        select,
        orderBy: { createdAt: "asc" },
      });
    });
  });
});
