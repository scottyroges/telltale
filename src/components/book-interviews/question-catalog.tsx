"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import type { Question } from "@/domain/question";
import styles from "./question-catalog.module.css";

type QuestionCatalogProps = {
  bookId: string;
  allQuestions: Question[];
  existingQuestionIds: string[];
};

export function QuestionCatalog({
  bookId,
  allQuestions,
  existingQuestionIds,
}: QuestionCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const router = useRouter();
  const trpc = useTRPC();

  const addQuestion = useMutation(
    trpc.book.addQuestion.mutationOptions({
      onSuccess() {
        router.refresh();
      },
    }),
  );

  const availableQuestions = useMemo(
    () => allQuestions.filter((q) => !existingQuestionIds.includes(q.id)),
    [allQuestions, existingQuestionIds],
  );

  const categories = useMemo(() => {
    const unique = [...new Set(availableQuestions.map((q) => q.category))];
    return ["All", ...unique.sort()];
  }, [availableQuestions]);

  const filteredQuestions = useMemo(
    () =>
      selectedCategory === "All"
        ? availableQuestions
        : availableQuestions.filter((q) => q.category === selectedCategory),
    [availableQuestions, selectedCategory],
  );

  if (availableQuestions.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No more questions available.</p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.filter}>
        <select
          className={styles.select}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filter by category"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {filteredQuestions.length === 0 ? (
        <div className={styles.empty}>
          <p>No questions in this category.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {filteredQuestions.map((q) => (
            <li key={q.id} className={styles.item}>
              <div className={styles.info}>
                <span className={styles.prompt}>{q.prompt}</span>
                <span className={styles.category}>{q.category}</span>
              </div>
              <button
                className={styles.addButton}
                disabled={addQuestion.isPending}
                onClick={() =>
                  addQuestion.mutate({ bookId, questionId: q.id })
                }
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
