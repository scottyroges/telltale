export type InterviewStatus = "ACTIVE" | "PAUSED" | "COMPLETE";

export type Interview = {
  id: string;
  bookId: string;
  questionId: string;
  status: InterviewStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
