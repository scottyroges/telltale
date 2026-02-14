import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import type { BookQuestion, BookQuestionStatus } from "@/domain/book-question";

const columns = [
  "id",
  "bookId",
  "questionId",
  "orderIndex",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const bookQuestionRepository = {
  async create(data: {
    bookId: string;
    questionId: string;
    orderIndex: number;
  }): Promise<BookQuestion> {
    // INSERT INTO book_question (id, "bookId", "questionId", "orderIndex", status, "updatedAt")
    //   VALUES ($1, $2, $3, $4, 'NOT_STARTED', $5)
    //   RETURNING <columns>
    return db
      .insertInto("book_question")
      .values({
        id: createId(),
        ...data,
        status: "NOT_STARTED",
        updatedAt: new Date(),
      })
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async findById(id: string): Promise<BookQuestion | null> {
    // SELECT <columns> FROM book_question WHERE id = $1
    return (
      (await db
        .selectFrom("book_question")
        .where("id", "=", id)
        .select([...columns])
        .executeTakeFirst()) ?? null
    );
  },

  async findByBookId(bookId: string): Promise<BookQuestion[]> {
    // SELECT <columns> FROM book_question WHERE "bookId" = $1 ORDER BY "orderIndex" ASC
    return db
      .selectFrom("book_question")
      .where("bookId", "=", bookId)
      .select([...columns])
      .orderBy("orderIndex", "asc")
      .execute();
  },

  async updateStatus(
    id: string,
    status: BookQuestionStatus,
  ): Promise<BookQuestion> {
    // UPDATE book_question SET status = $1, "updatedAt" = $2 WHERE id = $3 RETURNING <columns>
    return db
      .updateTable("book_question")
      .set({ status, updatedAt: new Date() })
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async delete(id: string): Promise<BookQuestion> {
    // DELETE FROM book_question WHERE id = $1 RETURNING <columns>
    return db
      .deleteFrom("book_question")
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },
};
