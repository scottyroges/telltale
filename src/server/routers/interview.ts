import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/server/trpc";
import { conversationService } from "@/services/conversation.service";
import {
  verifyBookOwnership,
  verifyBookQuestionOwnership,
  verifyInterviewOwnership,
} from "@/server/routers/ownership";

export const interviewRouter = router({
  start: protectedProcedure
    .input(z.object({ bookQuestionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyBookQuestionOwnership(input.bookQuestionId, ctx.userId);
      return conversationService.startInterview(input.bookQuestionId);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const interview = await verifyInterviewOwnership(input.id, ctx.userId);
      return interview;
    }),

  sendMessage: protectedProcedure
    .input(z.object({ interviewId: z.string(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const interview = await verifyInterviewOwnership(
        input.interviewId,
        ctx.userId,
      );
      if (interview.status === "COMPLETE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Interview is already complete",
        });
      }
      return conversationService.sendMessage(input.interviewId, interview.bookId, input.content);
    }),

  getMessages: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyInterviewOwnership(input.interviewId, ctx.userId);
      return conversationService.getInterviewMessages(input.interviewId);
    }),

  getInsights: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyInterviewOwnership(input.interviewId, ctx.userId);
      return conversationService.getInsights(input.interviewId);
    }),

  getBookInsights: protectedProcedure
    .input(z.object({ bookId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyBookOwnership(input.bookId, ctx.userId);
      return conversationService.getBookInsights(input.bookId);
    }),

  complete: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const interview = await verifyInterviewOwnership(
        input.interviewId,
        ctx.userId,
      );
      if (interview.status === "COMPLETE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Interview is already complete",
        });
      }
      return conversationService.completeInterview(input.interviewId);
    }),
});
