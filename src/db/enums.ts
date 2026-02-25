export const BookStatus = {
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETE: "COMPLETE",
    ARCHIVED: "ARCHIVED"
} as const;
export type BookStatus = (typeof BookStatus)[keyof typeof BookStatus];
export const InterviewStatus = {
    ACTIVE: "ACTIVE",
    PAUSED: "PAUSED",
    COMPLETE: "COMPLETE"
} as const;
export type InterviewStatus = (typeof InterviewStatus)[keyof typeof InterviewStatus];
export const MessageRole = {
    USER: "USER",
    ASSISTANT: "ASSISTANT",
    SYSTEM: "SYSTEM"
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];
export const InsightType = {
    ENTITY: "ENTITY",
    EVENT: "EVENT",
    EMOTION: "EMOTION",
    DETAIL: "DETAIL"
} as const;
export type InsightType = (typeof InsightType)[keyof typeof InsightType];
export const StoryStatus = {
    DRAFT: "DRAFT",
    REVIEWED: "REVIEWED",
    FINAL: "FINAL"
} as const;
export type StoryStatus = (typeof StoryStatus)[keyof typeof StoryStatus];
export const StorySectionStatus = {
    GENERATING: "GENERATING",
    DRAFT: "DRAFT",
    FINAL: "FINAL"
} as const;
export type StorySectionStatus = (typeof StorySectionStatus)[keyof typeof StorySectionStatus];
export const UserApprovalStatus = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED"
} as const;
export type UserApprovalStatus = (typeof UserApprovalStatus)[keyof typeof UserApprovalStatus];
export const UserRole = {
    USER: "USER",
    ADMIN: "ADMIN"
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
