"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import type { BookQuestion } from "@/domain/book-question";
import type { Question } from "@/domain/question";
import type { Interview } from "@/domain/interview";
import styles from "./question-list.module.css";

type QuestionListProps = {
  bookQuestions: (BookQuestion & { question: Question })[];
  interviews: Interview[];
};

export function QuestionList({
  bookQuestions,
  interviews,
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
      {bookQuestions.map((bq) => {
        const interview = interviews.find(
          (i) => i.questionId === bq.questionId,
        );
        return (
          <li key={bq.id} className={styles.item}>
            <div className={styles.info}>
              <span className={styles.prompt}>{bq.question.prompt}</span>
              <StatusIndicator status={bq.status} />
            </div>
            <div className={styles.action}>
              <QuestionAction
                bookQuestionId={bq.id}
                status={bq.status}
                interviewId={interview?.id}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StatusIndicator({ status }: { status: BookQuestion["status"] }) {
  switch (status) {
    case "NOT_STARTED":
      return (
        <span className={styles.status}>
          <span className={styles.dot} />
          Not Started
        </span>
      );
    case "STARTED":
      return (
        <span className={styles.status}>
          <span className={`${styles.dot} ${styles.dotStarted}`} />
          In Progress
        </span>
      );
    case "COMPLETE":
      return (
        <span className={styles.status}>
          <span className={styles.checkmark}>&#10003;</span>
          Complete
        </span>
      );
  }
}

function QuestionAction({
  bookQuestionId,
  status,
  interviewId,
}: {
  bookQuestionId: string;
  status: BookQuestion["status"];
  interviewId?: string;
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

  if (status === "NOT_STARTED") {
    return (
      <button
        className={styles.actionButton}
        disabled={startInterview.isPending}
        onClick={() => startInterview.mutate({ bookQuestionId })}
      >
        {startInterview.isPending ? "Starting\u2026" : "Begin"}
      </button>
    );
  }

  if (!interviewId) {
    return <span className={styles.errorText}>Error</span>;
  }

  if (status === "STARTED") {
    return (
      <Link href={`/interview/${interviewId}`} className={styles.actionLink}>
        Continue &rarr;
      </Link>
    );
  }

  return (
    <Link href={`/interview/${interviewId}`} className={styles.actionLink}>
      Review &rarr;
    </Link>
  );
}
