import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import type { Message, MessageRole } from "@/domain/message";

const columns = [
  "id",
  "interviewId",
  "role",
  "content",
  "hidden",
  "createdAt",
] as const;

export const messageRepository = {
  async create(data: {
    interviewId: string;
    role: MessageRole;
    content: string;
    hidden?: boolean;
  }): Promise<Message> {
    // INSERT INTO message (id, "interviewId", role, content, hidden)
    //   VALUES ($1, $2, $3, $4, $5)
    //   RETURNING <columns>
    return db
      .insertInto("message")
      .values({
        id: createId(),
        ...data,
      })
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async findByInterviewId(
    interviewId: string,
    options?: { includeHidden?: boolean },
  ): Promise<Message[]> {
    // SELECT <columns> FROM message WHERE "interviewId" = $1 ORDER BY "createdAt" ASC
    let query = db
      .selectFrom("message")
      .where("interviewId", "=", interviewId);

    if (!options?.includeHidden) {
      query = query.where("hidden", "=", false);
    }

    return query
      .select([...columns])
      .orderBy("createdAt", "asc")
      .execute();
  },
};
