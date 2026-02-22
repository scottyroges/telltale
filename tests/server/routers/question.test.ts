// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { db } = (await import("../../helpers/mock-db")).createMockDb();
vi.mock("@/lib/db", () => ({ db }));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("RESEND_API_KEY", "test-resend-key");
vi.stubEnv("EMAIL_FROM", "test@example.com");

const mockFindAll = vi.hoisted(() => vi.fn());
const mockFindByCategory = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
vi.mock("@/repositories/question.repository", () => ({
  questionRepository: {
    findAll: mockFindAll,
    findByCategory: mockFindByCategory,
    create: mockCreate,
  },
}));

describe("question router", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let caller: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let createCaller: (ctx: Record<string, unknown>) => any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createCallerFactory } = await import("@/server/trpc");
    const { appRouter } = await import("@/server/routers/_app");
    createCaller = (ctx) => createCallerFactory(appRouter)(ctx as never);
    caller = createCaller({ session: { user: { id: "user-1" } }, userId: "user-1" });
  });

  it("list returns all questions", async () => {
    const questions = [
      { id: "q1", category: "childhood", prompt: "Tell me", orderIndex: 0 },
    ];
    mockFindAll.mockResolvedValue(questions);

    const result = await caller.question.list();

    expect(result).toEqual(questions);
    expect(mockFindAll).toHaveBeenCalled();
  });

  it("listByCategory passes category to repository", async () => {
    const questions = [
      { id: "q1", category: "career", prompt: "Your job?", orderIndex: 0 },
    ];
    mockFindByCategory.mockResolvedValue(questions);

    const result = await caller.question.listByCategory({ category: "career" });

    expect(result).toEqual(questions);
    expect(mockFindByCategory).toHaveBeenCalledWith("career");
  });

  it("create passes input to repository", async () => {
    const input = { category: "childhood", prompt: "Earliest memory?", orderIndex: 0 };
    const created = { id: "q1", ...input, createdAt: new Date(), updatedAt: new Date() };
    mockCreate.mockResolvedValue(created);

    const result = await caller.question.create(input);

    expect(result).toEqual(created);
    expect(mockCreate).toHaveBeenCalledWith(input);
  });

  it("throws UNAUTHORIZED when no session", async () => {
    const { TRPCError } = await import("@trpc/server");
    const unauthCaller = createCaller({ session: null, userId: null });

    await expect(unauthCaller.question.list()).rejects.toThrow(TRPCError);
    await expect(unauthCaller.question.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
