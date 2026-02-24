-- CreateEnum
CREATE TYPE "UserApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "approvalStatus" "UserApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Backfill existing users to APPROVED status
UPDATE "user" SET "approvalStatus" = 'APPROVED' WHERE "createdAt" < NOW();
