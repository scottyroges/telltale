export type InsightType = "ENTITY" | "EVENT" | "EMOTION" | "DETAIL";

export type Insight = {
  id: string;
  bookId: string;
  interviewId: string;
  type: InsightType;
  content: string;
  explored: boolean;
  createdAt: Date;
  updatedAt: Date;
};
