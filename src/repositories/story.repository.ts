import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import type { Story, StoryStatus } from "@/domain/story";

const columns = [
  "id",
  "bookId",
  "interviewId",
  "title",
  "prose",
  "orderIndex",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const storyRepository = {
  async create(data: {
    bookId: string;
    interviewId: string;
    title: string;
    orderIndex: number;
  }): Promise<Story> {
    // INSERT INTO story (id, "bookId", "interviewId", title, "orderIndex", status, "updatedAt")
    //   VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6)
    //   RETURNING <columns>
    return db
      .insertInto("story")
      .values({
        id: createId(),
        ...data,
        status: "DRAFT",
        updatedAt: new Date(),
      })
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async findById(id: string): Promise<Story | null> {
    // SELECT <columns> FROM story WHERE id = $1
    return (
      (await db
        .selectFrom("story")
        .where("id", "=", id)
        .select([...columns])
        .executeTakeFirst()) ?? null
    );
  },

  async findByBookId(bookId: string): Promise<Story[]> {
    // SELECT <columns> FROM story WHERE "bookId" = $1 ORDER BY "orderIndex" ASC
    return db
      .selectFrom("story")
      .where("bookId", "=", bookId)
      .select([...columns])
      .orderBy("orderIndex", "asc")
      .execute();
  },

  async findByInterviewId(interviewId: string): Promise<Story[]> {
    // SELECT <columns> FROM story WHERE "interviewId" = $1
    return db
      .selectFrom("story")
      .where("interviewId", "=", interviewId)
      .select([...columns])
      .execute();
  },

  async updateProse(id: string, prose: string): Promise<Story> {
    // UPDATE story SET prose = $1, "updatedAt" = $2 WHERE id = $3 RETURNING <columns>
    return db
      .updateTable("story")
      .set({ prose, updatedAt: new Date() })
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async updateStatus(id: string, status: StoryStatus): Promise<Story> {
    // UPDATE story SET status = $1, "updatedAt" = $2 WHERE id = $3 RETURNING <columns>
    return db
      .updateTable("story")
      .set({ status, updatedAt: new Date() })
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },
};
