import Link from "next/link";
import { serverTRPC } from "@/lib/trpc/server";
import { InterviewList } from "@/components/book-interviews/interview-list";
import { TopicInput } from "@/components/book-interviews/topic-input";
import { QuestionList } from "@/components/book-interviews/question-list";
import { QuestionCatalog } from "@/components/book-interviews/question-catalog";
import type { Interview } from "@/domain/interview";
import styles from "./interviews.module.css";

type InterviewsPageProps = {
  params: Promise<{ bookId: string }>;
};

function sortInterviews(interviews: Interview[]): Interview[] {
  return [...interviews].sort((a, b) => {
    const aActive = a.status !== "COMPLETE";
    const bActive = b.status !== "COMPLETE";
    if (aActive !== bActive) return aActive ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export default async function InterviewsPage({ params }: InterviewsPageProps) {
  const { bookId } = await params;
  const trpc = await serverTRPC();
  const [book, allQuestions] = await Promise.all([
    trpc.book.getById({ id: bookId }),
    trpc.question.list(),
  ]);

  const existingQuestionIds = book.bookQuestions.map((bq) => bq.questionId);
  const sortedInterviews = sortInterviews(book.interviews);

  return (
    <div className={styles.page}>
      <Link href="/books" className={styles.back}>
        &larr; Books
      </Link>
      <h1 className={styles.heading}>{book.title}</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Your Interviews</h2>
        <InterviewList interviews={sortedInterviews} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Start a New Interview</h2>
        <TopicInput bookId={bookId} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Your Questions</h2>
        <QuestionList
          bookId={bookId}
          bookQuestions={book.bookQuestions}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Add More Questions</h2>
        <QuestionCatalog
          bookId={bookId}
          allQuestions={allQuestions}
          existingQuestionIds={existingQuestionIds}
        />
      </section>
    </div>
  );
}
