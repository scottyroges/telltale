import { prisma } from "@/lib/prisma";
import type { Insight, InsightType } from "@/domain/insight";

const select = {
  id: true,
  bookId: true,
  interviewId: true,
  type: true,
  content: true,
  explored: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const insightRepository = {
  async createMany(
    insights: Array<{
      bookId: string;
      interviewId: string;
      type: InsightType;
      content: string;
    }>,
  ): Promise<{ count: number }> {
    return prisma.insight.createMany({
      data: insights,
    });
  },

  async findByInterviewId(interviewId: string): Promise<Insight[]> {
    return prisma.insight.findMany({
      where: { interviewId },
      select,
    });
  },

  async findByBookId(bookId: string): Promise<Insight[]> {
    return prisma.insight.findMany({
      where: { bookId },
      select,
    });
  },

  async markExplored(id: string): Promise<Insight> {
    return prisma.insight.update({
      where: { id },
      data: { explored: true },
      select,
    });
  },
};
