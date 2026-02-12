import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { healthService } from "@/services/health.service";

export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return {
      status: "ok" as const,
      timestamp: new Date(),
    };
  }),

  dbCheck: protectedProcedure.query(async ({ ctx }) => {
    return healthService.checkDatabase(ctx.userId);
  }),
});
