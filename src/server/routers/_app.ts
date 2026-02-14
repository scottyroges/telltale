import { router } from "@/server/trpc";
import { healthRouter } from "@/server/routers/health";
import { questionRouter } from "@/server/routers/question";
import { bookRouter } from "@/server/routers/book";

export const appRouter = router({
  health: healthRouter,
  question: questionRouter,
  book: bookRouter,
});

export type AppRouter = typeof appRouter;
