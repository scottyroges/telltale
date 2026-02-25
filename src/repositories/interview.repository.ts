import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import type { Interview, InterviewStatus } from "@/domain/interview";

const columns = [
  "id",
  "bookId",
  "topic",
  "status",
  "completedAt",
  "createdAt",
  "updatedAt",
] as const;

export const interviewRepository = {
  async create(data: {
    bookId: string;
    topic: string;
  }): Promise<Interview> {
    // INSERT INTO interview (id, "bookId", topic, status, "updatedAt")
    //   VALUES ($1, $2, $3, 'ACTIVE', $4)
    //   RETURNING <columns>
    return db
      .insertInto("interview")
      .values({
        id: createId(),
        bookId: data.bookId,
        topic: data.topic,
        status: "ACTIVE",
        updatedAt: new Date(),
      })
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async findById(id: string): Promise<Interview | null> {
    // SELECT <columns> FROM interview WHERE id = $1
    return (
      (await db
        .selectFrom("interview")
        .where("id", "=", id)
        .select([...columns])
        .executeTakeFirst()) ?? null
    );
  },

  async findByBookId(bookId: string): Promise<Interview[]> {
    // SELECT <columns> FROM interview WHERE "bookId" = $1
    return db
      .selectFrom("interview")
      .where("bookId", "=", bookId)
      .select([...columns])
      .execute();
  },

  async updateStatus(
    id: string,
    status: InterviewStatus,
  ): Promise<Interview> {
    // UPDATE interview SET status = $1, "updatedAt" = $2 WHERE id = $3 RETURNING <columns>
    return db
      .updateTable("interview")
      .set({ status, updatedAt: new Date() })
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async complete(id: string): Promise<Interview> {
    // UPDATE interview SET status = 'COMPLETE', "completedAt" = $1, "updatedAt" = $1 WHERE id = $2 RETURNING <columns>
    const now = new Date();
    return db
      .updateTable("interview")
      .set({
        status: "COMPLETE",
        completedAt: now,
        updatedAt: now,
      })
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },
};
