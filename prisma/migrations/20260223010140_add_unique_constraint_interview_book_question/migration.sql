-- First, handle any existing duplicate interviews
-- Keep the most recently created interview for each (bookId, questionId) pair
-- and delete older duplicates

WITH ranked_interviews AS (
  SELECT
    id,
    "bookId",
    "questionId",
    ROW_NUMBER() OVER (
      PARTITION BY "bookId", "questionId"
      ORDER BY "createdAt" DESC
    ) AS rn
  FROM interview
)
DELETE FROM interview
WHERE id IN (
  SELECT id FROM ranked_interviews WHERE rn > 1
);

-- CreateIndex
CREATE UNIQUE INDEX "interview_bookId_questionId_key" ON "interview"("bookId", "questionId");
