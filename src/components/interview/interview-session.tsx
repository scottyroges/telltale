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

  const trpc = useTRPC();
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
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsWaitingForResponse(false);
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

  const isComplete = status === "COMPLETE";
  const isInputDisabled = isWaitingForResponse || isComplete;

  return (
    <div className={styles.sessionContainer}>
      <div className={styles.header}>
        <Link href={`/book/${bookId}/interviews`} className={styles.back}>
          &larr; Questions
        </Link>
        <h1 className={styles.questionPrompt}>{questionPrompt}</h1>
      </div>
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
