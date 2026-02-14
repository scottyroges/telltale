import { prisma } from "@/lib/prisma";
import type { Book, BookStatus, BookWithDetails } from "@/domain/book";

const select = {
  id: true,
  userId: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const bookRepository = {
  async create(data: { userId: string; title: string }): Promise<Book> {
    return prisma.book.create({
      data: {
        userId: data.userId,
        title: data.title,
        status: "IN_PROGRESS",
      },
      select,
    });
  },

  async findById(id: string): Promise<Book | null> {
    return prisma.book.findUnique({
      where: { id },
      select,
    });
  },

  async findByIdWithDetails(id: string): Promise<BookWithDetails | null> {
    return prisma.book.findUnique({
      where: { id },
      select: {
        ...select,
        bookQuestions: {
          select: {
            id: true,
            bookId: true,
            questionId: true,
            orderIndex: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            question: {
              select: {
                id: true,
                category: true,
                prompt: true,
                orderIndex: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
        interviews: {
          select: {
            id: true,
            bookId: true,
            questionId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  },

  async findByUserId(userId: string): Promise<Book[]> {
    return prisma.book.findMany({
      where: { userId },
      select,
    });
  },

  async updateStatus(id: string, status: BookStatus): Promise<Book> {
    return prisma.book.update({
      where: { id },
      data: { status },
      select,
    });
  },
};
