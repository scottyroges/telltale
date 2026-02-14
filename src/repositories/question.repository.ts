import { prisma } from "@/lib/prisma";
import type { Question } from "@/domain/question";

const select = {
  id: true,
  category: true,
  prompt: true,
  orderIndex: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const questionRepository = {
  async create(data: {
    category: string;
    prompt: string;
    orderIndex: number;
  }): Promise<Question> {
    return prisma.question.create({
      data,
      select,
    });
  },

  async findById(id: string): Promise<Question | null> {
    return prisma.question.findUnique({
      where: { id },
      select,
    });
  },

  async findAll(): Promise<Question[]> {
    return prisma.question.findMany({
      select,
      orderBy: { orderIndex: "asc" },
    });
  },

  async findByCategory(category: string): Promise<Question[]> {
    return prisma.question.findMany({
      where: { category },
      select,
      orderBy: { orderIndex: "asc" },
    });
  },
};
