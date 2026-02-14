export type StorySectionStatus = "GENERATING" | "DRAFT" | "FINAL";

export type StorySection = {
  id: string;
  storyId: string;
  orderIndex: number;
  content: string;
  status: StorySectionStatus;
  createdAt: Date;
  updatedAt: Date;
};
