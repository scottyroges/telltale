-- Backfill: mark the first message of each interview as hidden.
-- The first message is the topic/system prompt created by startInterview,
-- which was previously hidden via messages.slice(1) in the frontend.
UPDATE "message"
SET "hidden" = true
WHERE "id" IN (
  SELECT DISTINCT ON ("interviewId") "id"
  FROM "message"
  ORDER BY "interviewId", "createdAt" ASC
);
