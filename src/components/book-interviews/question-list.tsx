"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import type { BookQuestion } from "@/domain/book-question";
import type { Question } from "@/domain/question";
import styles from "./question-list.module.css";

type QuestionListProps = {
  bookId: string;
  bookQuestions: (BookQuestion & { question: Question })[];
};

export function QuestionList({
  bookId,
  bookQuestions,
}: QuestionListProps) {
  if (bookQuestions.length === 0) {
    return (
      <div className={styles.empty}>
        <p>
          You haven&apos;t added any questions yet. Browse the catalog below to
          get started.
        </p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {bookQuestions.map((bq) => (
        <li key={bq.id} className={styles.item}>
          <div className={styles.info}>
            <span className={styles.prompt}>{bq.question.prompt}</span>
            <StatusIndicator interviewId={bq.interviewId} />
          </div>
          <div className={styles.actions}>
            <RemoveQuestionButton bookQuestionId={bq.id} />
            <QuestionAction
              bookId={bookId}
              bookQuestionId={bq.id}
              topic={bq.question.prompt}
              interviewId={bq.interviewId}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatusIndicator({ interviewId }: { interviewId: string | null }) {
  if (interviewId) {
    return (
      <span className={styles.status}>
        <span className={styles.checkmark}>&#10003;</span>
        Complete
      </span>
    );
  }

  return (
    <span className={styles.status}>
      <span className={styles.dot} />
      Not Started
    </span>
  );
}

function RemoveQuestionButton({
  bookQuestionId,
}: {
  bookQuestionId: string;
}) {
  const router = useRouter();
  const trpc = useTRPC();

  const removeQuestion = useMutation(
    trpc.book.removeQuestion.mutationOptions({
      onSuccess() {
        router.refresh();
      },
    }),
  );

  const handleRemove = () => {
    if (confirm("Remove this question from your book?")) {
      removeQuestion.mutate({ bookQuestionId });
    }
  };

  return (
    <button
      className={styles.removeButton}
      onClick={handleRemove}
      disabled={removeQuestion.isPending}
      aria-label="Remove question"
      title="Remove question"
    >
      {removeQuestion.isPending ? "…" : "×"}
    </button>
  );
}

function QuestionAction({
  bookId,
  bookQuestionId,
  topic,
  interviewId,
}: {
  bookId: string;
  bookQuestionId: string;
  topic: string;
  interviewId: string | null;
}) {
  const router = useRouter();
  const trpc = useTRPC();

  const startInterview = useMutation(
    trpc.interview.start.mutationOptions({
      onSuccess(data) {
        router.push(`/interview/${data.interviewId}`);
      },
    }),
  );

  if (interviewId) {
    return (
      <Link href={`/interview/${interviewId}`} className={styles.actionLink}>
        Review &rarr;
      </Link>
    );
  }

  return (
    <button
      className={styles.actionButton}
      disabled={startInterview.isPending}
      onClick={() =>
        startInterview.mutate({ bookId, topic, bookQuestionId })
      }
    >
      {startInterview.isPending ? "Starting\u2026" : "Begin"}
    </button>
  );
}
