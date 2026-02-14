import { router } from "@/server/trpc";
import { healthRouter } from "@/server/routers/health";
import { questionRouter } from "@/server/routers/question";
import { bookRouter } from "@/server/routers/book";
import { interviewRouter } from "@/server/routers/interview";

export const appRouter = router({
  health: healthRouter,
  question: questionRouter,
  book: bookRouter,
  interview: interviewRouter,
});

export type AppRouter = typeof appRouter;
