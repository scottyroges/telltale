// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("server-only", () => ({}));

const mockUserRepository = {
  findById: vi.fn(),
};

vi.mock("@/repositories/user.repository", () => ({
  userRepository: mockUserRepository,
}));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("RESEND_API_KEY", "test-resend-key");
vi.stubEnv("EMAIL_FROM", "test@example.com");

describe("approvedProcedure", () => {
  const mockApprovedUser = {
    id: "user-1",
    name: "Approved User",
    email: "approved@example.com",
    emailVerified: true,
    image: null,
    approvalStatus: "APPROVED" as const,
    role: "USER" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPendingUser = {
    ...mockApprovedUser,
    approvalStatus: "PENDING" as const,
  };

  const mockRejectedUser = {
    ...mockApprovedUser,
    approvalStatus: "REJECTED" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow approved users to proceed", async () => {
    mockUserRepository.findById.mockResolvedValue(mockApprovedUser);

    const { approvedProcedure, createCallerFactory, router } = await import(
      "@/server/trpc"
    );

    const testRouter = router({
      test: approvedProcedure.query(async () => {
        return { success: true };
      }),
    });

    const caller = createCallerFactory(testRouter)({
      session: { user: mockApprovedUser } as never,
      userId: "user-1",
    });

    const result = await caller.test();

    expect(result).toEqual({ success: true });
    expect(mockUserRepository.findById).toHaveBeenCalledWith("user-1");
  });

  it("should block pending users with FORBIDDEN error", async () => {
    mockUserRepository.findById.mockResolvedValue(mockPendingUser);

    const { approvedProcedure, createCallerFactory, router } = await import(
      "@/server/trpc"
    );

    const testRouter = router({
      test: approvedProcedure.query(async () => {
        return { success: true };
      }),
    });

    const caller = createCallerFactory(testRouter)({
      session: { user: mockPendingUser } as never,
      userId: "user-1",
    });

    await expect(caller.test()).rejects.toThrow(TRPCError);
    await expect(caller.test()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Your account is pending approval. Please contact support.",
    });
  });

  it("should block rejected users with FORBIDDEN error", async () => {
    mockUserRepository.findById.mockResolvedValue(mockRejectedUser);

    const { approvedProcedure, createCallerFactory, router } = await import(
      "@/server/trpc"
    );

    const testRouter = router({
      test: approvedProcedure.query(async () => {
        return { success: true };
      }),
    });

    const caller = createCallerFactory(testRouter)({
      session: { user: mockRejectedUser } as never,
      userId: "user-1",
    });

    await expect(caller.test()).rejects.toThrow(TRPCError);
    await expect(caller.test()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Your account is pending approval. Please contact support.",
    });
  });

  it("should block when user not found with UNAUTHORIZED error", async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    const { approvedProcedure, createCallerFactory, router } = await import(
      "@/server/trpc"
    );

    const testRouter = router({
      test: approvedProcedure.query(async () => {
        return { success: true };
      }),
    });

    const caller = createCallerFactory(testRouter)({
      session: null,
      userId: "user-1",
    });

    await expect(caller.test()).rejects.toThrow(TRPCError);
    await expect(caller.test()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("should block unauthenticated users with UNAUTHORIZED error", async () => {
    const { approvedProcedure, createCallerFactory, router } = await import(
      "@/server/trpc"
    );

    const testRouter = router({
      test: approvedProcedure.query(async () => {
        return { success: true };
      }),
    });

    const caller = createCallerFactory(testRouter)({
      session: null,
      userId: null,
    });

    await expect(caller.test()).rejects.toThrow(TRPCError);
    await expect(caller.test()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
