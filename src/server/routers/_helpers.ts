import { TRPCError } from "@trpc/server";
import { bookRepository } from "@/repositories/book.repository";
import { bookQuestionRepository } from "@/repositories/book-question.repository";
import { interviewRepository } from "@/repositories/interview.repository";

export async function verifyBookOwnership(bookId: string, userId: string) {
  const book = await bookRepository.findById(bookId);
  if (!book) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Book not found" });
  }
  if (book.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your book" });
  }
  return book;
}

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
