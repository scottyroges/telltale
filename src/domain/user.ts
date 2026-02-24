export type UserApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type UserRole = "USER" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  approvalStatus: UserApprovalStatus;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};
