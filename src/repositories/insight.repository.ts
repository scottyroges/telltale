import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import type { Insight, InsightType } from "@/domain/insight";

const columns = [
  "id",
  "bookId",
  "interviewId",
  "type",
  "content",
  "explored",
  "createdAt",
  "updatedAt",
] as const;

export const insightRepository = {
  async createMany(
    insights: Array<{
      bookId: string;
      interviewId: string;
      type: InsightType;
      content: string;
    }>,
  ): Promise<{ count: number }> {
    if (insights.length === 0) return { count: 0 };

    // INSERT INTO insight (id, "bookId", "interviewId", type, content, explored, "updatedAt")
    //   VALUES ($1, $2, $3, $4, $5, false, $6), ...
    await db
      .insertInto("insight")
      .values(
        insights.map((i) => ({
          id: createId(),
          ...i,
          explored: false,
          updatedAt: new Date(),
        })),
      )
      .execute();
    return { count: insights.length };
  },

  async findByInterviewId(interviewId: string): Promise<Insight[]> {
    // SELECT <columns> FROM insight WHERE "interviewId" = $1
    return db
      .selectFrom("insight")
      .where("interviewId", "=", interviewId)
      .select([...columns])
      .execute();
  },

  async findByBookId(bookId: string): Promise<Insight[]> {
    // SELECT <columns> FROM insight WHERE "bookId" = $1
    return db
      .selectFrom("insight")
      .where("bookId", "=", bookId)
      .select([...columns])
      .execute();
  },

  async markExplored(id: string): Promise<Insight> {
    // UPDATE insight SET explored = true, "updatedAt" = $1 WHERE id = $2 RETURNING <columns>
    return db
      .updateTable("insight")
      .set({ explored: true, updatedAt: new Date() })
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },
};
