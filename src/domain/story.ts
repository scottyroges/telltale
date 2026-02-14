export type StoryStatus = "DRAFT" | "REVIEWED" | "FINAL";

export type Story = {
  id: string;
  bookId: string;
  interviewId: string;
  title: string;
  prose: string | null;
  orderIndex: number;
  status: StoryStatus;
  createdAt: Date;
  updatedAt: Date;
};
