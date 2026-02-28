import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import type { BookQuestion } from "@/domain/book-question";

const columns = [
  "id",
  "bookId",
  "questionId",
  "orderIndex",
  "interviewId",
  "createdAt",
  "updatedAt",
] as const;

export const bookQuestionRepository = {
  async create(data: {
    bookId: string;
    questionId: string;
    orderIndex: number;
  }): Promise<BookQuestion> {
    // INSERT INTO book_question (id, "bookId", "questionId", "orderIndex", "updatedAt")
    //   VALUES ($1, $2, $3, $4, $5)
    //   RETURNING <columns>
    return db
      .insertInto("bookQuestion")
      .values({
        id: createId(),
        ...data,
        updatedAt: new Date(),
      })
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async findById(id: string): Promise<BookQuestion | null> {
    // SELECT <columns> FROM book_question WHERE id = $1
    return (
      (await db
        .selectFrom("bookQuestion")
        .where("id", "=", id)
        .select([...columns])
        .executeTakeFirst()) ?? null
    );
  },

  async findByBookId(bookId: string): Promise<BookQuestion[]> {
    // SELECT <columns> FROM book_question WHERE "bookId" = $1 ORDER BY "orderIndex" ASC
    return db
      .selectFrom("bookQuestion")
      .where("bookId", "=", bookId)
      .select([...columns])
      .orderBy("orderIndex", "asc")
      .execute();
  },

  async setInterviewId(id: string, interviewId: string): Promise<BookQuestion> {
    // UPDATE book_question SET "interviewId" = $1, "updatedAt" = $2 WHERE id = $3 RETURNING <columns>
    return db
      .updateTable("bookQuestion")
      .set({ interviewId, updatedAt: new Date() })
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async getNextOrderIndex(bookId: string): Promise<number> {
    const result = await db
      .selectFrom("bookQuestion")
      .where("bookId", "=", bookId)
      .select(db.fn.max("orderIndex").as("maxIndex"))
      .executeTakeFirst();
    return (result?.maxIndex ?? -1) + 1;
  },

  async delete(id: string): Promise<BookQuestion> {
    // DELETE FROM book_question WHERE id = $1 RETURNING <columns>
    return db
      .deleteFrom("bookQuestion")
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },
};
