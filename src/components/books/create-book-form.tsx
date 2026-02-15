"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import styles from "./create-book-form.module.css";

export function CreateBookForm() {
  const [title, setTitle] = useState("");
  const router = useRouter();
  const trpc = useTRPC();

  const createBook = useMutation(
    trpc.book.create.mutationOptions({
      onSuccess(data) {
        router.push(`/book/${data.id}/interviews`);
      },
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createBook.mutate({ title });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label htmlFor="book-title" className={styles.label}>
        Title
      </label>
      <input
        id="book-title"
        type="text"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={styles.input}
        placeholder="e.g. My Life Story"
      />
      {createBook.error && (
        <p className={styles.error}>{createBook.error.message}</p>
      )}
      <button
        type="submit"
        disabled={createBook.isPending}
        className={styles.button}
      >
        {createBook.isPending ? "Creating…" : "Create Book"}
      </button>
    </form>
  );
}
