-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('IN_PROGRESS', 'COMPLETE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BookQuestionStatus" AS ENUM ('NOT_STARTED', 'STARTED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('ENTITY', 'EVENT', 'EMOTION', 'DETAIL');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'REVIEWED', 'FINAL');

-- CreateEnum
CREATE TYPE "StorySectionStatus" AS ENUM ('GENERATING', 'DRAFT', 'FINAL');

-- CreateTable
CREATE TABLE "question" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "BookStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_question" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "status" "BookQuestionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "content" TEXT NOT NULL,
    "explored" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_summary" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "parentSummaryId" TEXT,
    "content" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prose" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_section" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "StorySectionStatus" NOT NULL DEFAULT 'GENERATING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "book_userId_idx" ON "book"("userId");

-- CreateIndex
CREATE INDEX "book_question_bookId_idx" ON "book_question"("bookId");

-- CreateIndex
CREATE INDEX "book_question_questionId_idx" ON "book_question"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "book_question_bookId_questionId_key" ON "book_question"("bookId", "questionId");

-- CreateIndex
CREATE INDEX "interview_bookId_idx" ON "interview"("bookId");

-- CreateIndex
CREATE INDEX "interview_questionId_idx" ON "interview"("questionId");

-- CreateIndex
CREATE INDEX "message_interviewId_idx" ON "message"("interviewId");

-- CreateIndex
CREATE INDEX "insight_bookId_idx" ON "insight"("bookId");

-- CreateIndex
CREATE INDEX "insight_interviewId_idx" ON "insight"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_summary_parentSummaryId_key" ON "interview_summary"("parentSummaryId");

-- CreateIndex
CREATE INDEX "interview_summary_interviewId_idx" ON "interview_summary"("interviewId");

-- CreateIndex
CREATE INDEX "interview_summary_parentSummaryId_idx" ON "interview_summary"("parentSummaryId");

-- CreateIndex
CREATE INDEX "story_bookId_idx" ON "story"("bookId");

-- CreateIndex
CREATE INDEX "story_interviewId_idx" ON "story"("interviewId");

-- CreateIndex
CREATE INDEX "story_section_storyId_idx" ON "story_section"("storyId");

-- AddForeignKey
ALTER TABLE "book" ADD CONSTRAINT "book_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_question" ADD CONSTRAINT "book_question_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_question" ADD CONSTRAINT "book_question_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "interview_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "interview_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight" ADD CONSTRAINT "insight_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight" ADD CONSTRAINT "insight_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_summary" ADD CONSTRAINT "interview_summary_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_summary" ADD CONSTRAINT "interview_summary_parentSummaryId_fkey" FOREIGN KEY ("parentSummaryId") REFERENCES "interview_summary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story" ADD CONSTRAINT "story_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story" ADD CONSTRAINT "story_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_section" ADD CONSTRAINT "story_section_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
