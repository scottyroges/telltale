"use client";

import styles from "./approval-banner.module.css";

export function ApprovalBanner() {
  return (
    <div className={styles.banner}>
      <div className={styles.icon}>⏳</div>
      <div className={styles.content}>
        <h3 className={styles.title}>Account Pending Approval</h3>
        <p className={styles.message}>
          Your account is awaiting approval. You can browse books and questions,
          but you won&apos;t be able to start interviews until your account is approved.
          We&apos;ll notify you once your account is ready.
        </p>
      </div>
    </div>
  );
}
