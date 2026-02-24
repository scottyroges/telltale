import "server-only";

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/server/trpc";
import { adminService } from "@/services/admin.service";
import { userRepository } from "@/repositories/user.repository";

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await userRepository.findById(ctx.userId);
  if (!user || user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  getPendingUsers: adminProcedure.query(async () => {
    return adminService.getPendingUsers();
  }),

  approveUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await adminService.approveUser(input.userId);
    }),

  rejectUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await adminService.rejectUser(input.userId);
    }),
});
