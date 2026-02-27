import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, approvedProcedure } from "@/server/trpc";
import { conversationService } from "@/services/conversation.service";
import { bookQuestionRepository } from "@/repositories/book-question.repository";
import { insightRepository } from "@/repositories/insight.repository";
import {
  verifyBookOwnership,
  verifyInterviewOwnership,
} from "@/server/routers/ownership";

export const interviewRouter = router({
  start: approvedProcedure
    .input(
      z.object({
        bookId: z.string(),
        topic: z.string().min(5).max(500),
        bookQuestionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyBookOwnership(input.bookId, ctx.userId);

      if (input.bookQuestionId) {
        const bq = await bookQuestionRepository.findById(input.bookQuestionId);
        if (!bq || bq.bookId !== input.bookId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "BookQuestion not found or does not belong to this book",
          });
        }
      }

      const result = await conversationService.startInterview(
        input.bookId,
        input.topic,
        ctx.userName,
      );

      if (input.bookQuestionId) {
        await bookQuestionRepository.setInterviewId(
          input.bookQuestionId,
          result.interviewId,
        );
      }

      return result;
    }),

  getById: approvedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await verifyInterviewOwnership(input.id, ctx.userId);
      return interview;
    }),

  sendMessage: approvedProcedure
    .input(z.object({ interviewId: z.string(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const interview = await verifyInterviewOwnership(
        input.interviewId,
        ctx.userId,
      );
      if (interview.status === "COMPLETE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send messages to completed interviews",
        });
      }
      return conversationService.sendMessage(input.interviewId, interview.bookId, input.content, ctx.userName);
    }),

  getMessages: approvedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyInterviewOwnership(input.interviewId, ctx.userId);
      return conversationService.getInterviewMessages(input.interviewId);
    }),

  getInsights: approvedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyInterviewOwnership(input.interviewId, ctx.userId);
      return insightRepository.findByInterviewId(input.interviewId);
    }),

  getBookInsights: approvedProcedure
    .input(z.object({ bookId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyBookOwnership(input.bookId, ctx.userId);
      return insightRepository.findByBookId(input.bookId);
    }),

  redirect: approvedProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const interview = await verifyInterviewOwnership(
        input.interviewId,
        ctx.userId,
      );
      if (interview.status === "COMPLETE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot redirect completed interviews",
        });
      }
      return conversationService.redirect(input.interviewId, interview.bookId, ctx.userName);
    }),

  complete: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyInterviewOwnership(input.interviewId, ctx.userId);
      return conversationService.completeInterview(input.interviewId);
    }),
});
