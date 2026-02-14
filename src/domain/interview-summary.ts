export type InterviewSummary = {
  id: string;
  interviewId: string;
  parentSummaryId: string | null;
  content: string;
  messageCount: number;
  createdAt: Date;
};
