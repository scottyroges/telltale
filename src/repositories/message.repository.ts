import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import type { Message, MessageRole } from "@/domain/message";

const columns = [
  "id",
  "interviewId",
  "role",
  "content",
  "createdAt",
] as const;

export const messageRepository = {
  async create(data: {
    interviewId: string;
    role: MessageRole;
    content: string;
  }): Promise<Message> {
    // INSERT INTO message (id, "interviewId", role, content)
    //   VALUES ($1, $2, $3, $4)
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

  async findByInterviewId(interviewId: string): Promise<Message[]> {
    // SELECT <columns> FROM message WHERE "interviewId" = $1 ORDER BY "createdAt" ASC
    return db
      .selectFrom("message")
      .where("interviewId", "=", interviewId)
      .select([...columns])
      .orderBy("createdAt", "asc")
      .execute();
  },
};
