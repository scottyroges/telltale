import { prisma } from "@/lib/prisma";
import type { StorySection, StorySectionStatus } from "@/domain/story-section";

const select = {
  id: true,
  storyId: true,
  orderIndex: true,
  content: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const storySectionRepository = {
  async create(data: {
    storyId: string;
    orderIndex: number;
    content: string;
  }): Promise<StorySection> {
    return prisma.storySection.create({
      data: {
        ...data,
        status: "GENERATING",
      },
      select,
    });
  },

  async findByStoryId(storyId: string): Promise<StorySection[]> {
    return prisma.storySection.findMany({
      where: { storyId },
      select,
      orderBy: { orderIndex: "asc" },
    });
  },

  async updateContent(id: string, content: string): Promise<StorySection> {
    return prisma.storySection.update({
      where: { id },
      data: { content },
      select,
    });
  },

  async updateStatus(
    id: string,
    status: StorySectionStatus,
  ): Promise<StorySection> {
    return prisma.storySection.update({
      where: { id },
      data: { status },
      select,
    });
  },
};
