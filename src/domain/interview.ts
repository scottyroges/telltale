export type InterviewStatus = "ACTIVE" | "PAUSED" | "COMPLETE";

export type Interview = {
  id: string;
  bookId: string;
  questionId: string;
  status: InterviewStatus;
  createdAt: Date;
  updatedAt: Date;
};
