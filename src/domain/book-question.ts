export type BookQuestionStatus = "NOT_STARTED" | "STARTED" | "COMPLETE";

export type BookQuestion = {
  id: string;
  bookId: string;
  questionId: string;
  orderIndex: number;
  status: BookQuestionStatus;
  createdAt: Date;
  updatedAt: Date;
};
