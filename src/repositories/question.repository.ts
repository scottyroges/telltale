import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import type { Question } from "@/domain/question";

const columns = [
  "id",
  "category",
  "prompt",
  "orderIndex",
  "createdAt",
  "updatedAt",
] as const;

export const questionRepository = {
  async create(data: {
    category: string;
    prompt: string;
    orderIndex: number;
  }): Promise<Question> {
    // INSERT INTO question (id, category, prompt, "orderIndex", "updatedAt")
    //   VALUES ($1, $2, $3, $4, $5)
    //   RETURNING <columns>
    return db
      .insertInto("question")
      .values({
        id: createId(),
        ...data,
        updatedAt: new Date(),
      })
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async findById(id: string): Promise<Question | null> {
    // SELECT <columns> FROM question WHERE id = $1
    return (
      (await db
        .selectFrom("question")
        .where("id", "=", id)
        .select([...columns])
        .executeTakeFirst()) ?? null
    );
  },

  async findAll(): Promise<Question[]> {
    // SELECT <columns> FROM question ORDER BY "orderIndex" ASC
    return db
      .selectFrom("question")
      .select([...columns])
      .orderBy("orderIndex", "asc")
      .execute();
  },

  async findByCategory(category: string): Promise<Question[]> {
    // SELECT <columns> FROM question WHERE category = $1 ORDER BY "orderIndex" ASC
    return db
      .selectFrom("question")
      .where("category", "=", category)
      .select([...columns])
      .orderBy("orderIndex", "asc")
      .execute();
  },
};
