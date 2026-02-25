import Link from "next/link";
import type { Interview } from "@/domain/interview";
import styles from "./interview-list.module.css";

type InterviewListProps = {
  interviews: Interview[];
};

export function InterviewList({ interviews }: InterviewListProps) {
  if (interviews.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No interviews yet. Start your first conversation below.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {interviews.map((interview) => (
        <li key={interview.id} className={styles.item}>
          <Link href={`/interview/${interview.id}`} className={styles.link}>
            <div className={styles.info}>
              <span className={styles.topic}>{interview.topic}</span>
              <StatusIndicator status={interview.status} />
            </div>
            <span className={styles.date}>
              {new Date(interview.createdAt).toLocaleDateString()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StatusIndicator({ status }: { status: Interview["status"] }) {
  if (status === "COMPLETE") {
    return (
      <span className={styles.status}>
        <span className={styles.checkmark}>&#10003;</span>
        Completed
      </span>
    );
  }

  return (
    <span className={styles.status}>
      <span className={styles.activeDot} />
      Active
    </span>
  );
}
