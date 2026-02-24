import { db } from "@/lib/db";
import type { User, UserApprovalStatus } from "@/domain/types";

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    // SELECT * FROM "user" WHERE id = $1
    return (
      (await db
        .selectFrom("user")
        .where("id", "=", id)
        .selectAll()
        .executeTakeFirst()) ?? null
    );
  },

  async findByEmail(email: string): Promise<User | null> {
    // SELECT * FROM "user" WHERE email = $1
    return (
      (await db
        .selectFrom("user")
        .where("email", "=", email)
        .selectAll()
        .executeTakeFirst()) ?? null
    );
  },

  async findPendingUsers(): Promise<User[]> {
    // SELECT * FROM "user" WHERE approvalStatus = 'PENDING' ORDER BY createdAt ASC
    return db
      .selectFrom("user")
      .where("approvalStatus", "=", "PENDING")
      .selectAll()
      .orderBy("createdAt", "asc")
      .execute();
  },

  async updateApprovalStatus(
    userId: string,
    status: UserApprovalStatus
  ): Promise<void> {
    // UPDATE "user" SET approvalStatus = $1, updatedAt = NOW() WHERE id = $2
    await db
      .updateTable("user")
      .set({
        approvalStatus: status,
        updatedAt: new Date(),
      })
      .where("id", "=", userId)
      .execute();
  },
};
