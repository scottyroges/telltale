export const INSIGHT_TYPES = ["ENTITY", "EVENT", "EMOTION", "DETAIL"] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];

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
