import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { questionRepository } from "@/repositories/question.repository";

export const questionRouter = router({
  list: protectedProcedure.query(() => {
    return questionRepository.findAll();
  }),

  listByCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(({ input }) => {
      return questionRepository.findByCategory(input.category);
    }),

  create: protectedProcedure
    .input(
      z.object({
        category: z.string(),
        prompt: z.string(),
        orderIndex: z.number(),
      }),
    )
    .mutation(({ input }) => {
      return questionRepository.create(input);
    }),
});
