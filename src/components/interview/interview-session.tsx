"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import type { InterviewStatus } from "@/domain/interview";
import type { Message } from "@/domain/message";
import { useTRPC } from "@/lib/trpc/client";
import { Transcript } from "./transcript";
import { InterviewInput } from "./interview-input";
import styles from "./interview-session.module.css";

const COMPLETION_MESSAGE =
  "Interview marked as complete. You can review the conversation or return to the question list.";

export type InterviewSessionProps = {
  interviewId: string;
  bookId: string;
  questionPrompt: string;
  status: InterviewStatus;
  initialMessages: Message[];
};

export function InterviewSession({
  interviewId,
  bookId,
  questionPrompt,
  status,
  initialMessages,
}: InterviewSessionProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(status === "COMPLETE");

  const trpc = useTRPC();

  const completeMutation = useMutation(
    trpc.interview.complete.mutationOptions({
      onSuccess: () => {
        setIsCompleted(true);
        setCompletionMessage(COMPLETION_MESSAGE);
      },
      onError: (error) => {
        console.error("Failed to complete interview:", error);
        setError("Failed to mark interview as complete. Please try again.");
      },
    })
  );

  const sendMessage = useMutation(
    trpc.interview.sendMessage.mutationOptions({
      onMutate: async ({ content }) => {
        // Add optimistic user message and return its ID in context
        // Use prefix to distinguish temporary client IDs from server IDs
        const optimisticId = `optimistic-${crypto.randomUUID()}`;
        const userMessage: Message = {
          id: optimisticId,
          interviewId,
          role: "USER",
          content,
          hidden: false,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsWaitingForResponse(true);

        return { optimisticId };
      },
      onSuccess: (response) => {
        // Add AI response to messages
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          interviewId,
          role: "ASSISTANT",
          content: response.content,
          hidden: false,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsWaitingForResponse(false);

        if (response.shouldComplete) {
          setIsCompleted(true);
          setCompletionMessage(COMPLETION_MESSAGE);
        }
      },
      onError: (error, _variables, context) => {
        console.error("Failed to send message:", error);
        // Remove the specific optimistic message using ID from context
        if (context?.optimisticId) {
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== context.optimisticId)
          );
        }
        setIsWaitingForResponse(false);
        setError("Something went wrong. Try again.");
      },
    })
  );

  const handleSend = (content: string): void => {
    // Clear any previous error
    setError(null);

    // Send to server (optimistic update happens in onMutate)
    sendMessage.mutate({ interviewId, content });
  };

  const handleComplete = (): void => {
    const confirmed = confirm(
      "Are you sure you want to end this interview? You won't be able to add more messages after completion."
    );
    if (confirmed) {
      setError(null);
      completeMutation.mutate({ interviewId });
    }
  };

  const isComplete = isCompleted;
  const isInputDisabled = isWaitingForResponse || isComplete;

  return (
    <div className={styles.sessionContainer}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <Link href={`/book/${bookId}/interviews`} className={styles.back}>
            &larr; Questions
          </Link>
          {!isComplete && (
            <button
              onClick={handleComplete}
              disabled={completeMutation.isPending || isWaitingForResponse}
              className={styles.completeButton}
            >
              End Interview
            </button>
          )}
        </div>
        <h1 className={styles.questionPrompt}>{questionPrompt}</h1>
      </div>
      {completionMessage && (
        <div className={styles.completionMessage}>{completionMessage}</div>
      )}
      <Transcript messages={messages} isWaitingForResponse={isWaitingForResponse} />
      {!isComplete && (
        <>
          <InterviewInput onSend={handleSend} isDisabled={isInputDisabled} />
          {error && <div className={styles.errorMessage}>{error}</div>}
        </>
      )}
    </div>
  );
}
