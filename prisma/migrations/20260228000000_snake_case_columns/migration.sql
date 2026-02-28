-- Rename camelCase columns to snake_case across all tables.
-- Safe operation: RENAME COLUMN preserves data.

-- user
ALTER TABLE "user" RENAME COLUMN "emailVerified" TO "email_verified";
ALTER TABLE "user" RENAME COLUMN "approvalStatus" TO "approval_status";
ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at";

-- account
ALTER TABLE "account" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "account" RENAME COLUMN "accountId" TO "account_id";
ALTER TABLE "account" RENAME COLUMN "providerId" TO "provider_id";
ALTER TABLE "account" RENAME COLUMN "accessToken" TO "access_token";
ALTER TABLE "account" RENAME COLUMN "refreshToken" TO "refresh_token";
ALTER TABLE "account" RENAME COLUMN "idToken" TO "id_token";
ALTER TABLE "account" RENAME COLUMN "accessTokenExpiresAt" TO "access_token_expires_at";
ALTER TABLE "account" RENAME COLUMN "refreshTokenExpiresAt" TO "refresh_token_expires_at";
ALTER TABLE "account" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "account" RENAME COLUMN "updatedAt" TO "updated_at";

-- session
ALTER TABLE "session" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "session" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "session" RENAME COLUMN "ipAddress" TO "ip_address";
ALTER TABLE "session" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "session" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "session" RENAME COLUMN "updatedAt" TO "updated_at";

-- verification
ALTER TABLE "verification" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "verification" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "verification" RENAME COLUMN "updatedAt" TO "updated_at";

-- question
ALTER TABLE "question" RENAME COLUMN "orderIndex" TO "order_index";
ALTER TABLE "question" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "question" RENAME COLUMN "updatedAt" TO "updated_at";

-- book
ALTER TABLE "book" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "book" RENAME COLUMN "coreMemory" TO "core_memory";
ALTER TABLE "book" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "book" RENAME COLUMN "updatedAt" TO "updated_at";

-- book_question
ALTER TABLE "book_question" RENAME COLUMN "bookId" TO "book_id";
ALTER TABLE "book_question" RENAME COLUMN "questionId" TO "question_id";
ALTER TABLE "book_question" RENAME COLUMN "orderIndex" TO "order_index";
ALTER TABLE "book_question" RENAME COLUMN "interviewId" TO "interview_id";
ALTER TABLE "book_question" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "book_question" RENAME COLUMN "updatedAt" TO "updated_at";

-- interview
ALTER TABLE "interview" RENAME COLUMN "bookId" TO "book_id";
ALTER TABLE "interview" RENAME COLUMN "completedAt" TO "completed_at";
ALTER TABLE "interview" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "interview" RENAME COLUMN "updatedAt" TO "updated_at";

-- message
ALTER TABLE "message" RENAME COLUMN "interviewId" TO "interview_id";
ALTER TABLE "message" RENAME COLUMN "createdAt" TO "created_at";

-- insight
ALTER TABLE "insight" RENAME COLUMN "bookId" TO "book_id";
ALTER TABLE "insight" RENAME COLUMN "interviewId" TO "interview_id";
ALTER TABLE "insight" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "insight" RENAME COLUMN "updatedAt" TO "updated_at";

-- interview_summary
ALTER TABLE "interview_summary" RENAME COLUMN "interviewId" TO "interview_id";
ALTER TABLE "interview_summary" RENAME COLUMN "parentSummaryId" TO "parent_summary_id";
ALTER TABLE "interview_summary" RENAME COLUMN "messageCount" TO "message_count";
ALTER TABLE "interview_summary" RENAME COLUMN "createdAt" TO "created_at";

-- story
ALTER TABLE "story" RENAME COLUMN "bookId" TO "book_id";
ALTER TABLE "story" RENAME COLUMN "interviewId" TO "interview_id";
ALTER TABLE "story" RENAME COLUMN "orderIndex" TO "order_index";
ALTER TABLE "story" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "story" RENAME COLUMN "updatedAt" TO "updated_at";

-- story_section
ALTER TABLE "story_section" RENAME COLUMN "storyId" TO "story_id";
ALTER TABLE "story_section" RENAME COLUMN "orderIndex" TO "order_index";
ALTER TABLE "story_section" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "story_section" RENAME COLUMN "updatedAt" TO "updated_at";

-- Rename foreign key constraints
ALTER TABLE "account" RENAME CONSTRAINT "account_userId_fkey" TO "account_user_id_fkey";
ALTER TABLE "book" RENAME CONSTRAINT "book_userId_fkey" TO "book_user_id_fkey";
ALTER TABLE "book_question" RENAME CONSTRAINT "book_question_bookId_fkey" TO "book_question_book_id_fkey";
ALTER TABLE "book_question" RENAME CONSTRAINT "book_question_interviewId_fkey" TO "book_question_interview_id_fkey";
ALTER TABLE "book_question" RENAME CONSTRAINT "book_question_questionId_fkey" TO "book_question_question_id_fkey";
ALTER TABLE "insight" RENAME CONSTRAINT "insight_bookId_fkey" TO "insight_book_id_fkey";
ALTER TABLE "insight" RENAME CONSTRAINT "insight_interviewId_fkey" TO "insight_interview_id_fkey";
ALTER TABLE "interview" RENAME CONSTRAINT "interview_bookId_fkey" TO "interview_book_id_fkey";
ALTER TABLE "interview_summary" RENAME CONSTRAINT "interview_summary_interviewId_fkey" TO "interview_summary_interview_id_fkey";
ALTER TABLE "interview_summary" RENAME CONSTRAINT "interview_summary_parentSummaryId_fkey" TO "interview_summary_parent_summary_id_fkey";
ALTER TABLE "message" RENAME CONSTRAINT "message_interviewId_fkey" TO "message_interview_id_fkey";
ALTER TABLE "session" RENAME CONSTRAINT "session_userId_fkey" TO "session_user_id_fkey";
ALTER TABLE "story" RENAME CONSTRAINT "story_bookId_fkey" TO "story_book_id_fkey";
ALTER TABLE "story" RENAME CONSTRAINT "story_interviewId_fkey" TO "story_interview_id_fkey";
ALTER TABLE "story_section" RENAME CONSTRAINT "story_section_storyId_fkey" TO "story_section_story_id_fkey";

-- Rename indexes
ALTER INDEX "account_userId_idx" RENAME TO "account_user_id_idx";
ALTER INDEX "book_userId_idx" RENAME TO "book_user_id_idx";
ALTER INDEX "book_question_bookId_idx" RENAME TO "book_question_book_id_idx";
ALTER INDEX "book_question_bookId_questionId_key" RENAME TO "book_question_book_id_question_id_key";
ALTER INDEX "book_question_interviewId_key" RENAME TO "book_question_interview_id_key";
ALTER INDEX "book_question_questionId_idx" RENAME TO "book_question_question_id_idx";
ALTER INDEX "insight_bookId_idx" RENAME TO "insight_book_id_idx";
ALTER INDEX "insight_interviewId_idx" RENAME TO "insight_interview_id_idx";
ALTER INDEX "interview_bookId_idx" RENAME TO "interview_book_id_idx";
ALTER INDEX "interview_summary_interviewId_idx" RENAME TO "interview_summary_interview_id_idx";
ALTER INDEX "interview_summary_parentSummaryId_idx" RENAME TO "interview_summary_parent_summary_id_idx";
ALTER INDEX "interview_summary_parentSummaryId_key" RENAME TO "interview_summary_parent_summary_id_key";
ALTER INDEX "message_interviewId_idx" RENAME TO "message_interview_id_idx";
ALTER INDEX "session_userId_idx" RENAME TO "session_user_id_idx";
ALTER INDEX "story_bookId_idx" RENAME TO "story_book_id_idx";
ALTER INDEX "story_interviewId_idx" RENAME TO "story_interview_id_idx";
ALTER INDEX "story_section_storyId_idx" RENAME TO "story_section_story_id_idx";
