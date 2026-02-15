import Link from "next/link";
import { serverTRPC } from "@/lib/trpc/server";
import { QuestionList } from "@/components/book-interviews/question-list";
import { QuestionCatalog } from "@/components/book-interviews/question-catalog";
import styles from "./interviews.module.css";

type InterviewsPageProps = {
  params: Promise<{ bookId: string }>;
};

export default async function InterviewsPage({ params }: InterviewsPageProps) {
  const { bookId } = await params;
  const trpc = await serverTRPC();
  const [book, allQuestions] = await Promise.all([
    trpc.book.getById({ id: bookId }),
    trpc.question.list(),
  ]);

  const existingQuestionIds = book.bookQuestions.map((bq) => bq.questionId);

  return (
    <div className={styles.page}>
      <Link href="/books" className={styles.back}>
        &larr; Books
      </Link>
      <h1 className={styles.heading}>{book.title}</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Your Questions</h2>
        <QuestionList
          bookQuestions={book.bookQuestions}
          interviews={book.interviews}
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
