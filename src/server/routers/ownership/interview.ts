import { TRPCError } from "@trpc/server";
import { interviewRepository } from "@/repositories/interview.repository";
import { verifyBookOwnership } from "./book";

export async function verifyInterviewOwnership(
  interviewId: string,
  userId: string,
) {
  const interview = await interviewRepository.findById(interviewId);
  if (!interview) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Interview not found",
    });
  }
  await verifyBookOwnership(interview.bookId, userId);
  return interview;
}
