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
  const hasScrolledInitiallyRef = useRef(false);
  const wasNearBottomRef = useRef(true);

  // Track if user is near bottom, updated on scroll and resize
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateNearBottomState = () => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        AUTOSCROLL_THRESHOLD_PX;
      wasNearBottomRef.current = isNearBottom;
    };

    // Update on scroll
    container.addEventListener("scroll", updateNearBottomState);

    // Update on resize (important for mobile keyboard and device rotation)
    window.addEventListener("resize", updateNearBottomState);

    return () => {
      container.removeEventListener("scroll", updateNearBottomState);
      window.removeEventListener("resize", updateNearBottomState);
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // On initial load, scroll to bottom without animation
    if (!hasScrolledInitiallyRef.current && messages.length > 0) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "auto",
      });
      hasScrolledInitiallyRef.current = true;
      prevMessagesLengthRef.current = messages.length;
      wasNearBottomRef.current = true;
      return;
    }

    // Auto-scroll on new messages if user was near bottom
    if (messages.length > prevMessagesLengthRef.current && wasNearBottomRef.current) {
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
