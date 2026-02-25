import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import type { Book, BookStatus, BookWithDetails } from "@/domain/book";

/** Parses ISO-string dates in JSON-embedded Kysely subquery results back into Date objects. */
function parseJsonDates<T>(obj: T): T {
  const r = { ...(obj as Record<string, unknown>) };
  if ("createdAt" in r) r.createdAt = new Date(r.createdAt as string);
  if ("updatedAt" in r) r.updatedAt = new Date(r.updatedAt as string);
  return r as T;
}

const columns = [
  "id",
  "userId",
  "title",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const bookRepository = {
  async create(data: { userId: string; title: string }): Promise<Book> {
    // INSERT INTO book (id, "userId", title, status, "updatedAt")
    //   VALUES ($1, $2, $3, 'IN_PROGRESS', $4)
    //   RETURNING <columns>
    return db
      .insertInto("book")
      .values({
        id: createId(),
        userId: data.userId,
        title: data.title,
        status: "IN_PROGRESS",
        updatedAt: new Date(),
      })
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async findById(id: string): Promise<Book | null> {
    // SELECT <columns> FROM book WHERE id = $1
    return (
      (await db
        .selectFrom("book")
        .where("id", "=", id)
        .select([...columns])
        .executeTakeFirst()) ?? null
    );
  },

  async findByIdWithDetails(id: string): Promise<BookWithDetails | null> {
    // SELECT book.*, (
    //   SELECT json_agg(bq.* || json_build_object('question', (
    //     SELECT to_json(q.*) FROM question q WHERE q.id = bq."questionId"
    //   ))) FROM book_question bq WHERE bq."bookId" = book.id ORDER BY bq."orderIndex"
    // ) AS "bookQuestions", (
    //   SELECT json_agg(i.*) FROM interview i WHERE i."bookId" = book.id
    // ) AS interviews
    // FROM book WHERE book.id = $1
    const row = await db
      .selectFrom("book")
      .where("book.id", "=", id)
      .select([
        "book.id",
        "book.userId",
        "book.title",
        "book.status",
        "book.createdAt",
        "book.updatedAt",
      ])
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("book_question")
            .whereRef("book_question.bookId", "=", "book.id")
            .select([
              "book_question.id",
              "book_question.bookId",
              "book_question.questionId",
              "book_question.orderIndex",
              "book_question.interviewId",
              "book_question.createdAt",
              "book_question.updatedAt",
            ])
            .select((eb2) => [
              jsonObjectFrom(
                eb2
                  .selectFrom("question")
                  .whereRef("question.id", "=", "book_question.questionId")
                  .select([
                    "question.id",
                    "question.category",
                    "question.prompt",
                    "question.orderIndex",
                    "question.createdAt",
                    "question.updatedAt",
                  ]),
              ).as("question"),
            ])
            .orderBy("book_question.orderIndex", "asc"),
        ).as("bookQuestions"),
        jsonArrayFrom(
          eb
            .selectFrom("interview")
            .whereRef("interview.bookId", "=", "book.id")
            .select([
              "interview.id",
              "interview.bookId",
              "interview.topic",
              "interview.status",
              "interview.createdAt",
              "interview.updatedAt",
            ]),
        ).as("interviews"),
      ])
      .executeTakeFirst();

    if (!row) return null;

    // Top-level book dates are parsed by the pg driver. Nested JSON subquery
    // results contain ISO-string dates that must be converted to Date objects.
    type JsonRow = Record<string, unknown>;
    return {
      ...row,
      bookQuestions: (row.bookQuestions as JsonRow[]).map((bq) => ({
        ...parseJsonDates(bq),
        question: parseJsonDates(bq.question as JsonRow),
      })),
      interviews: (row.interviews as JsonRow[]).map(parseJsonDates),
    } as BookWithDetails;
  },

  async findByUserId(userId: string): Promise<Book[]> {
    // SELECT <columns> FROM book WHERE "userId" = $1
    return db
      .selectFrom("book")
      .where("userId", "=", userId)
      .select([...columns])
      .execute();
  },

  async updateStatus(id: string, status: BookStatus): Promise<Book> {
    // UPDATE book SET status = $1, "updatedAt" = $2 WHERE id = $3 RETURNING <columns>
    return db
      .updateTable("book")
      .set({ status, updatedAt: new Date() })
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },
};
