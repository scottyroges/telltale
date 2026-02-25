export type BookQuestion = {
  id: string;
  bookId: string;
  questionId: string;
  orderIndex: number;
  interviewId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
