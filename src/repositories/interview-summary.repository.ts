import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import type { InterviewSummary } from "@/domain/interview-summary";

const columns = [
  "id",
  "interviewId",
  "parentSummaryId",
  "content",
  "messageCount",
  "createdAt",
] as const;

export const interviewSummaryRepository = {
  async create(data: {
    interviewId: string;
    parentSummaryId?: string;
    content: string;
    messageCount: number;
  }): Promise<InterviewSummary> {
    // INSERT INTO interview_summary (id, "interviewId", "parentSummaryId", content, "messageCount")
    //   VALUES ($1, $2, $3, $4, $5)
    //   RETURNING <columns>
    return db
      .insertInto("interviewSummary")
      .values({
        id: createId(),
        interviewId: data.interviewId,
        parentSummaryId: data.parentSummaryId ?? null,
        content: data.content,
        messageCount: data.messageCount,
      })
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async findLatestByInterviewId(
    interviewId: string,
  ): Promise<InterviewSummary | null> {
    // SELECT <columns> FROM interview_summary
    //   WHERE "interviewId" = $1 ORDER BY "createdAt" DESC LIMIT 1
    return (
      (await db
        .selectFrom("interviewSummary")
        .where("interviewId", "=", interviewId)
        .select([...columns])
        .orderBy("createdAt", "desc")
        .limit(1)
        .executeTakeFirst()) ?? null
    );
  },
};
