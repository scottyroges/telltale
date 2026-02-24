"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import styles from "./interview-input.module.css";

export type InterviewInputProps = {
  onSend: (content: string) => void;
  isDisabled: boolean;
};

export function InterviewInput({ onSend, isDisabled }: InterviewInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isDisabled) return;

    onSend(trimmedContent);
    setContent("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSendDisabled = isDisabled || !content.trim();

  return (
    <div className={styles.inputContainer}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Share your story..."
        disabled={isDisabled}
        rows={1}
      />
      <button
        className={styles.sendButton}
        onClick={handleSend}
        disabled={isSendDisabled}
      >
        Send
      </button>
    </div>
  );
}
