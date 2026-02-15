import { serverTRPC } from "@/lib/trpc/server";
import { BookList } from "@/components/books/book-list";
import styles from "./books.module.css";

export default async function BooksPage() {
  const trpc = await serverTRPC();
  const books = await trpc.book.list();

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Your Books</h1>
      <BookList books={books} />
    </div>
  );
}
