import { TRPCError } from "@trpc/server";
import { bookRepository } from "@/repositories/book.repository";

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
