import { prisma } from "@/lib/prisma";
import type { BookQuestion, BookQuestionStatus } from "@/domain/book-question";

const select = {
  id: true,
  bookId: true,
  questionId: true,
  orderIndex: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const bookQuestionRepository = {
  async create(data: {
    bookId: string;
    questionId: string;
    orderIndex: number;
  }): Promise<BookQuestion> {
    return prisma.bookQuestion.create({
      data: {
        ...data,
        status: "NOT_STARTED",
      },
      select,
    });
  },

  async findByBookId(bookId: string): Promise<BookQuestion[]> {
    return prisma.bookQuestion.findMany({
      where: { bookId },
      select,
      orderBy: { orderIndex: "asc" },
    });
  },

  async updateStatus(
    id: string,
    status: BookQuestionStatus,
  ): Promise<BookQuestion> {
    return prisma.bookQuestion.update({
      where: { id },
      data: { status },
      select,
    });
  },

  async delete(id: string): Promise<BookQuestion> {
    return prisma.bookQuestion.delete({
      where: { id },
      select,
    });
  },
};
