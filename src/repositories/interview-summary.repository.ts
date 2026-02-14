import { prisma } from "@/lib/prisma";
import type { InterviewSummary } from "@/domain/interview-summary";

const select = {
  id: true,
  interviewId: true,
  parentSummaryId: true,
  content: true,
  messageCount: true,
  createdAt: true,
} as const;

export const interviewSummaryRepository = {
  async create(data: {
    interviewId: string;
    parentSummaryId?: string;
    content: string;
    messageCount: number;
  }): Promise<InterviewSummary> {
    return prisma.interviewSummary.create({
      data,
      select,
    });
  },

  async findLatestByInterviewId(
    interviewId: string,
  ): Promise<InterviewSummary | null> {
    return prisma.interviewSummary.findFirst({
      where: { interviewId },
      select,
      orderBy: { createdAt: "desc" },
    });
  },
};
