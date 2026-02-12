import { userRepository } from "@/repositories/user.repository";

export const healthService = {
  async checkDatabase(userId: string) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return {
      status: "ok" as const,
      user,
      timestamp: new Date(),
    };
  },
};
