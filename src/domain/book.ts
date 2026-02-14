import type { BookQuestion } from "./book-question";
import type { Interview } from "./interview";
import type { Question } from "./question";

export type BookStatus = "IN_PROGRESS" | "COMPLETE" | "ARCHIVED";

export type Book = {
  id: string;
  userId: string;
  title: string;
  status: BookStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type BookWithDetails = Book & {
  bookQuestions: (BookQuestion & { question: Question })[];
  interviews: Interview[];
};
