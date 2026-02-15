import Link from "next/link";
import { CreateBookForm } from "@/components/books/create-book-form";
import styles from "./new-book.module.css";

export default function NewBookPage() {
  return (
    <div className={styles.page}>
      <Link href="/books" className={styles.back}>
        &larr; Books
      </Link>
      <h1 className={styles.heading}>Create a New Book</h1>
      <CreateBookForm />
    </div>
  );
}
