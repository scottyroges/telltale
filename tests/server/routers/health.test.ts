// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

describe("health router", () => {
  it("ping returns status and timestamp without auth", async () => {
    const { createCallerFactory } = await import("@/server/trpc");
    const { appRouter } = await import("@/server/routers/_app");

    const caller = createCallerFactory(appRouter)({
      session: null,
      userId: null,
    });

    const result = await caller.health.ping();

    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it("dbCheck returns user info when authenticated", async () => {
    const mockUser = { id: "user-1", name: "Test User", email: "test@example.com" };
    mockFindUnique.mockResolvedValue(mockUser);

    const { createCallerFactory } = await import("@/server/trpc");
    const { appRouter } = await import("@/server/routers/_app");

    const caller = createCallerFactory(appRouter)({
      session: { user: mockUser } as never,
      userId: "user-1",
    });

    const result = await caller.health.dbCheck();

    expect(result.status).toBe("ok");
    expect(result.user).toEqual(mockUser);
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, name: true, email: true },
    });
  });

  it("dbCheck throws UNAUTHORIZED when no session", async () => {
    const { createCallerFactory } = await import("@/server/trpc");
    const { appRouter } = await import("@/server/routers/_app");
    const { TRPCError } = await import("@trpc/server");

    const caller = createCallerFactory(appRouter)({
      session: null,
      userId: null,
    });

    await expect(caller.health.dbCheck()).rejects.toThrow(TRPCError);
    await expect(caller.health.dbCheck()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
