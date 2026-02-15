import Link from "next/link";
import type { Book } from "@/domain/book";
import styles from "./book-list.module.css";

type BookListProps = {
  books: Book[];
};

export function BookList({ books }: BookListProps) {
  if (books.length === 0) {
    return (
      <div className={styles.empty}>
        <p>You don&apos;t have any books yet.</p>
        <Link href="/books/new" className={styles.createLink}>
          Create Your First Book
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/books/new" className={styles.newButton}>
        New Book
      </Link>
      <ul className={styles.list}>
        {books.map((book) => (
          <li key={book.id} className={styles.item}>
            <span className={styles.title}>{book.title}</span>
            <Link
              href={`/book/${book.id}/interviews`}
              className={styles.openLink}
            >
              Open &rarr;
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
