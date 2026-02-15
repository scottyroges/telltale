"use client";

import { useRef, useEffect } from "react";
import type { Message } from "@/domain/message";
import { InterviewMessage } from "./interview-message";
import styles from "./transcript.module.css";

// Auto-scroll threshold: scroll automatically if user is within this distance from bottom
const AUTOSCROLL_THRESHOLD_PX = 100;

export type TranscriptProps = {
  messages: Message[];
  isWaitingForResponse: boolean;
};

export function Transcript({ messages, isWaitingForResponse }: TranscriptProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Only auto-scroll if user is near bottom
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      AUTOSCROLL_THRESHOLD_PX;

    // Auto-scroll on new messages if user is already near bottom
    if (messages.length > prevMessagesLengthRef.current && isNearBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Filter out the first message (internal system message)
  const displayMessages = messages.slice(1);

  return (
    <div ref={scrollContainerRef} className={styles.transcript}>
      {displayMessages.map((message) => (
        <InterviewMessage
          key={message.id}
          role={message.role}
          content={message.content}
        />
      ))}
      {isWaitingForResponse && (
        <div className={styles.thinkingIndicator}>
          <div className={styles.thinkingDots}>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </div>
        </div>
      )}
    </div>
  );
}
