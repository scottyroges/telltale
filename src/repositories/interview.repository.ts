import { prisma } from "@/lib/prisma";
import type { Interview, InterviewStatus } from "@/domain/interview";

const select = {
  id: true,
  bookId: true,
  questionId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const interviewRepository = {
  async create(data: {
    bookId: string;
    questionId: string;
  }): Promise<Interview> {
    return prisma.interview.create({
      data: {
        bookId: data.bookId,
        questionId: data.questionId,
        status: "ACTIVE",
      },
      select,
    });
  },

  async findById(id: string): Promise<Interview | null> {
    return prisma.interview.findUnique({
      where: { id },
      select,
    });
  },

  async findByBookId(bookId: string): Promise<Interview[]> {
    return prisma.interview.findMany({
      where: { bookId },
      select,
    });
  },

  async updateStatus(
    id: string,
    status: InterviewStatus,
  ): Promise<Interview> {
    return prisma.interview.update({
      where: { id },
      data: { status },
      select,
    });
  },
};
