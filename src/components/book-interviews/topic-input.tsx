"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import styles from "./topic-input.module.css";

type TopicInputProps = {
  bookId: string;
};

export function TopicInput({ bookId }: TopicInputProps) {
  const [topic, setTopic] = useState("");
  const router = useRouter();
  const trpc = useTRPC();

  const startInterview = useMutation(
    trpc.interview.start.mutationOptions({
      onSuccess(data) {
        router.push(`/interview/${data.interviewId}`);
      },
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startInterview.mutate({ bookId, topic: topic.trim() });
  }

  const isValid = topic.trim().length >= 5;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label htmlFor="topic-input" className={styles.label}>
        Topic
      </label>
      <input
        id="topic-input"
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        className={styles.input}
        placeholder="e.g. My first day of school"
      />
      {startInterview.error && (
        <p className={styles.error}>{startInterview.error.message}</p>
      )}
      <button
        type="submit"
        disabled={!isValid || startInterview.isPending}
        className={styles.button}
      >
        {startInterview.isPending ? "Starting\u2026" : "Begin"}
      </button>
    </form>
  );
}
