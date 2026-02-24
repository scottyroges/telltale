// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "../helpers/mock-db";

vi.mock("server-only", () => ({}));

const {
  db,
  executeTakeFirst,
  execute,
  selectFrom,
  updateTable,
} = createMockDb();

vi.mock("@/lib/db", () => ({ db }));

describe("userRepository", () => {
  let userRepository: Awaited<
    typeof import("@/repositories/user.repository")
  >["userRepository"];

  const mockUser = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    emailVerified: true,
    image: null,
    approvalStatus: "APPROVED" as const,
    role: "USER" as const,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/repositories/user.repository");
    userRepository = mod.userRepository;
  });

  describe("findById", () => {
    it("returns a user when found", async () => {
      executeTakeFirst.mockResolvedValue(mockUser);

      const result = await userRepository.findById("user-1");

      expect(result).toEqual(mockUser);
      expect(selectFrom).toHaveBeenCalledWith("user");
      expect(executeTakeFirst).toHaveBeenCalled();
    });

    it("returns null when not found", async () => {
      executeTakeFirst.mockResolvedValue(undefined);

      const result = await userRepository.findById("missing");

      expect(result).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("returns a user when found", async () => {
      executeTakeFirst.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail("test@example.com");

      expect(result).toEqual(mockUser);
      expect(selectFrom).toHaveBeenCalledWith("user");
      expect(executeTakeFirst).toHaveBeenCalled();
    });

    it("returns null when not found", async () => {
      executeTakeFirst.mockResolvedValue(undefined);

      const result = await userRepository.findByEmail("missing@example.com");

      expect(result).toBeNull();
    });
  });

  describe("findPendingUsers", () => {
    it("returns users with PENDING approval status ordered by createdAt", async () => {
      const pendingUsers = [
        { ...mockUser, id: "user-1", approvalStatus: "PENDING" as const, createdAt: new Date("2024-01-01") },
        { ...mockUser, id: "user-2", approvalStatus: "PENDING" as const, createdAt: new Date("2024-01-02") },
      ];
      execute.mockResolvedValue(pendingUsers);

      const result = await userRepository.findPendingUsers();

      expect(result).toEqual(pendingUsers);
      expect(selectFrom).toHaveBeenCalledWith("user");
      expect(execute).toHaveBeenCalled();
    });

    it("returns empty array when no pending users", async () => {
      execute.mockResolvedValue([]);

      const result = await userRepository.findPendingUsers();

      expect(result).toEqual([]);
    });
  });

  describe("updateApprovalStatus", () => {
    it("updates user approval status to APPROVED", async () => {
      execute.mockResolvedValue(undefined);

      await userRepository.updateApprovalStatus("user-1", "APPROVED");

      expect(updateTable).toHaveBeenCalledWith("user");
      expect(execute).toHaveBeenCalled();
    });

    it("updates user approval status to REJECTED", async () => {
      execute.mockResolvedValue(undefined);

      await userRepository.updateApprovalStatus("user-1", "REJECTED");

      expect(updateTable).toHaveBeenCalledWith("user");
      expect(execute).toHaveBeenCalled();
    });
  });
});
