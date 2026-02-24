import { router } from "@/server/trpc";
import { healthRouter } from "@/server/routers/health";
import { questionRouter } from "@/server/routers/question";
import { bookRouter } from "@/server/routers/book";
import { interviewRouter } from "@/server/routers/interview";
import { adminRouter } from "@/server/routers/admin";

export const appRouter = router({
  health: healthRouter,
  question: questionRouter,
  book: bookRouter,
  interview: interviewRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
