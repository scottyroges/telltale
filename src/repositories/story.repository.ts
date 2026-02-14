import { prisma } from "@/lib/prisma";
import type { Story, StoryStatus } from "@/domain/story";

const select = {
  id: true,
  bookId: true,
  interviewId: true,
  title: true,
  prose: true,
  orderIndex: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const storyRepository = {
  async create(data: {
    bookId: string;
    interviewId: string;
    title: string;
    orderIndex: number;
  }): Promise<Story> {
    return prisma.story.create({
      data: {
        ...data,
        status: "DRAFT",
      },
      select,
    });
  },

  async findById(id: string): Promise<Story | null> {
    return prisma.story.findUnique({
      where: { id },
      select,
    });
  },

  async findByBookId(bookId: string): Promise<Story[]> {
    return prisma.story.findMany({
      where: { bookId },
      select,
      orderBy: { orderIndex: "asc" },
    });
  },

  async findByInterviewId(interviewId: string): Promise<Story[]> {
    return prisma.story.findMany({
      where: { interviewId },
      select,
    });
  },

  async updateProse(id: string, prose: string): Promise<Story> {
    return prisma.story.update({
      where: { id },
      data: { prose },
      select,
    });
  },

  async updateStatus(id: string, status: StoryStatus): Promise<Story> {
    return prisma.story.update({
      where: { id },
      data: { status },
      select,
    });
  },
};
