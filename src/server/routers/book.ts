import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/trpc";
import { bookRepository } from "@/repositories/book.repository";
import { bookQuestionRepository } from "@/repositories/book-question.repository";
import { questionRepository } from "@/repositories/question.repository";
import {
  verifyBookOwnership,
  verifyBookQuestionOwnership,
} from "@/server/routers/ownership";

export const bookRouter = router({
  create: protectedProcedure
    .input(z.object({ title: z.string() }))
    .mutation(({ ctx, input }) => {
      return bookRepository.create({ userId: ctx.userId, title: input.title });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const book = await bookRepository.findByIdWithDetails(input.id);
      if (!book) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
      }
      if (book.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your book" });
      }
      return book;
    }),

  list: protectedProcedure.query(({ ctx }) => {
    return bookRepository.findByUserId(ctx.userId);
  }),

  addQuestion: protectedProcedure
    .input(z.object({ bookId: z.string(), questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyBookOwnership(input.bookId, ctx.userId);

      const question = await questionRepository.findById(input.questionId);
      if (!question) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found",
        });
      }

      const orderIndex = await bookQuestionRepository.getNextOrderIndex(
        input.bookId,
      );
      return bookQuestionRepository.create({
        bookId: input.bookId,
        questionId: input.questionId,
        orderIndex,
      });
    }),

  removeQuestion: protectedProcedure
    .input(z.object({ bookQuestionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyBookQuestionOwnership(input.bookQuestionId, ctx.userId);
      return bookQuestionRepository.delete(input.bookQuestionId);
    }),
});
