-- Step 1: Add topic column with a temporary default
ALTER TABLE "interview" ADD COLUMN "topic" TEXT NOT NULL DEFAULT '';

-- Step 2: Backfill topic from the linked question's prompt
UPDATE "interview"
SET "topic" = (
  SELECT "prompt" FROM "question" WHERE "question"."id" = "interview"."questionId"
);

-- Step 3: Remove the temporary default
ALTER TABLE "interview" ALTER COLUMN "topic" DROP DEFAULT;

-- Step 4: Add interviewId column to book_question
ALTER TABLE "book_question" ADD COLUMN "interviewId" TEXT;

-- Step 5: Backfill interviewId from existing interviews
UPDATE "book_question"
SET "interviewId" = (
  SELECT "id" FROM "interview"
  WHERE "interview"."bookId" = "book_question"."bookId"
    AND "interview"."questionId" = "book_question"."questionId"
);

-- Step 6: Drop the unique constraint and index on interview(bookId, questionId)
DROP INDEX IF EXISTS "interview_bookId_questionId_key";

-- Step 7: Drop the index on interview(questionId)
DROP INDEX IF EXISTS "interview_questionId_idx";

-- Step 8: Drop the FK from interview to question
ALTER TABLE "interview" DROP CONSTRAINT IF EXISTS "interview_questionId_fkey";

-- Step 9: Drop the questionId column from interview
ALTER TABLE "interview" DROP COLUMN "questionId";

-- Step 10: Drop the status column from book_question
ALTER TABLE "book_question" DROP COLUMN "status";

-- Step 11: Drop the BookQuestionStatus enum
DROP TYPE IF EXISTS "BookQuestionStatus";

-- Step 12: Add unique constraint on book_question(interviewId)
ALTER TABLE "book_question" ADD CONSTRAINT "book_question_interviewId_key" UNIQUE ("interviewId");

-- Step 13: Add FK from book_question(interviewId) to interview(id)
ALTER TABLE "book_question"
  ADD CONSTRAINT "book_question_interviewId_fkey"
  FOREIGN KEY ("interviewId") REFERENCES "interview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
