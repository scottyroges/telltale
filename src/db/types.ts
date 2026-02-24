import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

import type { BookStatus, BookQuestionStatus, InterviewStatus, MessageRole, InsightType, StoryStatus, StorySectionStatus, UserApprovalStatus, UserRole } from "./enums";

export type Account = {
    id: string;
    userId: string;
    accountId: string;
    providerId: string;
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
    accessTokenExpiresAt: Timestamp | null;
    refreshTokenExpiresAt: Timestamp | null;
    scope: string | null;
    password: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Book = {
    id: string;
    userId: string;
    title: string;
    status: Generated<BookStatus>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type BookQuestion = {
    id: string;
    bookId: string;
    questionId: string;
    orderIndex: number;
    status: Generated<BookQuestionStatus>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Insight = {
    id: string;
    bookId: string;
    interviewId: string;
    type: InsightType;
    content: string;
    explored: Generated<boolean>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Interview = {
    id: string;
    bookId: string;
    questionId: string;
    status: Generated<InterviewStatus>;
    completedAt: Timestamp | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type InterviewSummary = {
    id: string;
    interviewId: string;
    parentSummaryId: string | null;
    content: string;
    messageCount: number;
    createdAt: Generated<Timestamp>;
};
export type Message = {
    id: string;
    interviewId: string;
    role: MessageRole;
    content: string;
    createdAt: Generated<Timestamp>;
};
export type Question = {
    id: string;
    category: string;
    prompt: string;
    orderIndex: number;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Session = {
    id: string;
    userId: string;
    token: string;
    expiresAt: Timestamp;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Story = {
    id: string;
    bookId: string;
    interviewId: string;
    title: string;
    prose: string | null;
    orderIndex: number;
    status: Generated<StoryStatus>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type StorySection = {
    id: string;
    storyId: string;
    orderIndex: number;
    content: string;
    status: Generated<StorySectionStatus>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type User = {
    id: string;
    name: string;
    email: string;
    emailVerified: Generated<boolean>;
    image: string | null;
    approvalStatus: Generated<UserApprovalStatus>;
    role: Generated<UserRole>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type Verification = {
    id: string;
    identifier: string;
    value: string;
    expiresAt: Timestamp;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type DB = {
    account: Account;
    book: Book;
    book_question: BookQuestion;
    insight: Insight;
    interview: Interview;
    interview_summary: InterviewSummary;
    message: Message;
    question: Question;
    session: Session;
    story: Story;
    story_section: StorySection;
    user: User;
    verification: Verification;
};
