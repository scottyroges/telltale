import { prisma } from "@/lib/prisma";

export const userRepository = {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });
  },
};
