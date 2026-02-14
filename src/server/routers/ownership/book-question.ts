import { TRPCError } from "@trpc/server";
import { bookQuestionRepository } from "@/repositories/book-question.repository";
import { verifyBookOwnership } from "./book";

export async function verifyBookQuestionOwnership(
  bookQuestionId: string,
  userId: string,
) {
  const bookQuestion = await bookQuestionRepository.findById(bookQuestionId);
  if (!bookQuestion) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "BookQuestion not found",
    });
  }
  await verifyBookOwnership(bookQuestion.bookId, userId);
  return bookQuestion;
}
