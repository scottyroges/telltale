"use client";

import type { MessageRole } from "@/domain/message";
import styles from "./interview-message.module.css";

export type InterviewMessageProps = {
  role: MessageRole;
  content: string;
};

export function InterviewMessage({ role, content }: InterviewMessageProps) {
  const isUser = role === "USER";
  const isAssistant = role === "ASSISTANT";

  return (
    <div
      className={`${styles.message} ${isUser ? styles.messageUser : ""} ${isAssistant ? styles.messageAssistant : ""}`}
    >
      <div className={styles.messageContent}>{content}</div>
    </div>
  );
}
