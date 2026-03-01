"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import type { InterviewStatus } from "@/domain/interview";
import type { Message } from "@/domain/message";
import type { StreamChunk } from "@/domain/streaming";
import { useTRPC, useTRPCClient } from "@/lib/trpc/client";
import { Transcript } from "./transcript";
import { InterviewInput } from "./interview-input";
import styles from "./interview-session.module.css";

const COMPLETION_MESSAGE =
  "Interview marked as complete. You can review the conversation or return to your book.";

export type InterviewSessionProps = {
  interviewId: string;
  bookId: string;
  topic: string;
  status: InterviewStatus;
  initialMessages: Message[];
};

export function InterviewSession({
  interviewId,
  bookId,
  topic,
  status,
  initialMessages,
}: InterviewSessionProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(status === "COMPLETE");

  const trpc = useTRPC();
  const trpcClient = useTRPCClient();

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

  const consumeStream = async (
    stream: AsyncIterable<StreamChunk>,
    onDone?: (chunk: { shouldComplete: boolean }) => void
  ): Promise<void> => {
    let accumulated = "";
    for await (const chunk of stream) {
      if (chunk.type === "text") {
        accumulated += chunk.text;
        setStreamingContent(accumulated);
      } else if (chunk.type === "done") {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), interviewId, role: "ASSISTANT", content: accumulated, hidden: false, createdAt: new Date() }]);
        setStreamingContent(null);
        setIsWaitingForResponse(false);
        onDone?.(chunk);
      }
    }
  };

  const handleSend = async (content: string): Promise<void> => {
    setError(null);

    // Optimistic user message
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    setMessages((prev) => [...prev, { id: optimisticId, interviewId, role: "USER", content, hidden: false, createdAt: new Date() }]);
    setIsWaitingForResponse(true);
    setStreamingContent("");

    try {
      const stream = await trpcClient.interview.sendMessage.mutate({ interviewId, content });
      await consumeStream(stream, (done) => {
        if (done.shouldComplete) {
          setIsCompleted(true);
          setCompletionMessage(COMPLETION_MESSAGE);
        }
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      setStreamingContent(null);
      setIsWaitingForResponse(false);
      setError("Something went wrong. Try again.");
    }
  };

  const handleRedirect = async (): Promise<void> => {
    setError(null);
    setIsWaitingForResponse(true);
    setStreamingContent("");

    try {
      const stream = await trpcClient.interview.redirect.mutate({ interviewId });
      await consumeStream(stream);
    } catch (error) {
      console.error("Failed to redirect:", error);
      setStreamingContent(null);
      setIsWaitingForResponse(false);
      setError("Something went wrong. Try again.");
    }
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
  const hasUserSentMessage = messages.some((m) => m.role === "USER");

  return (
    <div className={styles.sessionContainer}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <Link href={`/book/${bookId}/interviews`} className={styles.back}>
            &larr; Back
          </Link>
          <div className={styles.headerActions}>
            <Link
              href="/guide"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.tipsLink}
            >
              Tips
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
        </div>
        <h1 className={styles.topic}>{topic}</h1>
      </div>
      {completionMessage && (
        <div className={styles.completionMessage}>{completionMessage}</div>
      )}
      <Transcript messages={messages} isWaitingForResponse={isWaitingForResponse} streamingContent={streamingContent} />
      {!isComplete && (
        <>
          <InterviewInput
            onSend={handleSend}
            onRedirect={handleRedirect}
            isDisabled={isInputDisabled}
            redirectDisabled={isInputDisabled || !hasUserSentMessage}
          />
          {error && <div className={styles.errorMessage}>{error}</div>}
        </>
      )}
    </div>
  );
}
