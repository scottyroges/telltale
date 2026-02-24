// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("server-only", () => ({}));

const mockUserRepository = {
  findById: vi.fn(),
  findPendingUsers: vi.fn(),
  updateApprovalStatus: vi.fn(),
};

const mockAdminService = {
  getPendingUsers: vi.fn(),
  approveUser: vi.fn(),
  rejectUser: vi.fn(),
};

vi.mock("@/repositories/user.repository", () => ({
  userRepository: mockUserRepository,
}));

vi.mock("@/services/admin.service", () => ({
  adminService: mockAdminService,
}));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("RESEND_API_KEY", "test-resend-key");
vi.stubEnv("EMAIL_FROM", "test@example.com");

describe("adminRouter", () => {
  const mockAdminUser = {
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
    emailVerified: true,
    image: null,
    approvalStatus: "APPROVED" as const,
    role: "ADMIN" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRegularUser = {
    ...mockAdminUser,
    id: "user-1",
    name: "Regular User",
    email: "user@example.com",
    role: "USER" as const,
  };

  const mockPendingUsers = [
    {
      id: "pending-1",
      name: "Pending User 1",
      email: "pending1@example.com",
      emailVerified: false,
      image: null,
      approvalStatus: "PENDING" as const,
      role: "USER" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "pending-2",
      name: "Pending User 2",
      email: "pending2@example.com",
      emailVerified: false,
      image: null,
      approvalStatus: "PENDING" as const,
      role: "USER" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("should allow admin users to access admin endpoints", async () => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockAdminService.getPendingUsers.mockResolvedValue(mockPendingUsers);

      const { createCallerFactory } = await import("@/server/trpc");
      const { appRouter } = await import("@/server/routers/_app");

      const caller = createCallerFactory(appRouter)({
        session: { user: mockAdminUser } as never,
        userId: "admin-1",
      });

      const result = await caller.admin.getPendingUsers();

      expect(result).toEqual(mockPendingUsers);
      expect(mockUserRepository.findById).toHaveBeenCalledWith("admin-1");
      expect(mockAdminService.getPendingUsers).toHaveBeenCalled();
    });

    it("should block regular users from accessing admin endpoints", async () => {
      mockUserRepository.findById.mockResolvedValue(mockRegularUser);

      const { createCallerFactory } = await import("@/server/trpc");
      const { appRouter } = await import("@/server/routers/_app");

      const caller = createCallerFactory(appRouter)({
        session: { user: mockRegularUser } as never,
        userId: "user-1",
      });

      await expect(caller.admin.getPendingUsers()).rejects.toThrow(TRPCError);
      await expect(caller.admin.getPendingUsers()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    });

    it("should block unauthenticated users", async () => {
      const { createCallerFactory } = await import("@/server/trpc");
      const { appRouter } = await import("@/server/routers/_app");

      const caller = createCallerFactory(appRouter)({
        session: null,
        userId: null,
      });

      await expect(caller.admin.getPendingUsers()).rejects.toThrow(TRPCError);
      await expect(caller.admin.getPendingUsers()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("getPendingUsers", () => {
    it("should return list of pending users", async () => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockAdminService.getPendingUsers.mockResolvedValue(mockPendingUsers);

      const { createCallerFactory } = await import("@/server/trpc");
      const { appRouter } = await import("@/server/routers/_app");

      const caller = createCallerFactory(appRouter)({
        session: { user: mockAdminUser } as never,
        userId: "admin-1",
      });

      const result = await caller.admin.getPendingUsers();

      expect(result).toEqual(mockPendingUsers);
      expect(mockAdminService.getPendingUsers).toHaveBeenCalledOnce();
    });

    it("should return empty array when no pending users", async () => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockAdminService.getPendingUsers.mockResolvedValue([]);

      const { createCallerFactory } = await import("@/server/trpc");
      const { appRouter } = await import("@/server/routers/_app");

      const caller = createCallerFactory(appRouter)({
        session: { user: mockAdminUser } as never,
        userId: "admin-1",
      });

      const result = await caller.admin.getPendingUsers();

      expect(result).toEqual([]);
    });
  });

  describe("approveUser", () => {
    it("should approve a user", async () => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockAdminService.approveUser.mockResolvedValue(undefined);

      const { createCallerFactory } = await import("@/server/trpc");
      const { appRouter } = await import("@/server/routers/_app");

      const caller = createCallerFactory(appRouter)({
        session: { user: mockAdminUser } as never,
        userId: "admin-1",
      });

      await caller.admin.approveUser({ userId: "pending-1" });

      expect(mockAdminService.approveUser).toHaveBeenCalledWith("pending-1");
      expect(mockAdminService.approveUser).toHaveBeenCalledOnce();
    });
  });

  describe("rejectUser", () => {
    it("should reject a user", async () => {
      mockUserRepository.findById.mockResolvedValue(mockAdminUser);
      mockAdminService.rejectUser.mockResolvedValue(undefined);

      const { createCallerFactory } = await import("@/server/trpc");
      const { appRouter } = await import("@/server/routers/_app");

      const caller = createCallerFactory(appRouter)({
        session: { user: mockAdminUser } as never,
        userId: "admin-1",
      });

      await caller.admin.rejectUser({ userId: "pending-1" });

      expect(mockAdminService.rejectUser).toHaveBeenCalledWith("pending-1");
      expect(mockAdminService.rejectUser).toHaveBeenCalledOnce();
    });
  });
});
