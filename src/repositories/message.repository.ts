import { prisma } from "@/lib/prisma";
import type { Message, MessageRole } from "@/domain/message";

const select = {
  id: true,
  interviewId: true,
  role: true,
  content: true,
  createdAt: true,
} as const;

export const messageRepository = {
  async create(data: {
    interviewId: string;
    role: MessageRole;
    content: string;
  }): Promise<Message> {
    return prisma.message.create({
      data,
      select,
    });
  },

  async findByInterviewId(interviewId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: { interviewId },
      select,
      orderBy: { createdAt: "asc" },
    });
  },
};
