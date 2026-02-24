import { userRepository } from "@/repositories/user.repository";

export const adminService = {
  async getPendingUsers() {
    return userRepository.findPendingUsers();
  },

  async approveUser(userId: string) {
    await userRepository.updateApprovalStatus(userId, "APPROVED");
  },

  async rejectUser(userId: string) {
    await userRepository.updateApprovalStatus(userId, "REJECTED");
  },
};
