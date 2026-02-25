import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, approvedProcedure } from "@/server/trpc";
import { conversationService } from "@/services/conversation.service";
import {
  verifyBookOwnership,
  verifyBookQuestionOwnership,
  verifyInterviewOwnership,
} from "@/server/routers/ownership";

export const interviewRouter = router({
  start: approvedProcedure
    .input(z.object({ bookQuestionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyBookQuestionOwnership(input.bookQuestionId, ctx.userId);
      return conversationService.startInterview(input.bookQuestionId, ctx.userName);
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
      return conversationService.getInsights(input.interviewId);
    }),

  getBookInsights: approvedProcedure
    .input(z.object({ bookId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyBookOwnership(input.bookId, ctx.userId);
      return conversationService.getBookInsights(input.bookId);
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
