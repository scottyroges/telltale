import Link from "next/link";
import { serverTRPC } from "@/lib/trpc/server";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const trpc = await serverTRPC();
  const { status, user, timestamp } = await trpc.health.dbCheck();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome back, {user.name}</h1>
        <p className={styles.subtitle}>Ready to continue your story?</p>
      </header>

      <Link href="/books" className={styles.cta}>
        <span className={styles.ctaText}>Continue Your Story</span>
        <span className={styles.ctaArrow}>→</span>
      </Link>

      <div className={styles.infoCard}>
        <h2 className={styles.cardTitle}>Account Information</h2>
        <dl className={styles.infoList}>
          <div className={styles.infoItem}>
            <dt className={styles.infoLabel}>Email</dt>
            <dd className={styles.infoValue}>{user.email}</dd>
          </div>
          <div className={styles.infoItem}>
            <dt className={styles.infoLabel}>User ID</dt>
            <dd className={styles.infoValue}>{user.id}</dd>
          </div>
          <div className={styles.infoItem}>
            <dt className={styles.infoLabel}>Database Status</dt>
            <dd className={styles.infoValue}>
              <span className={styles.statusBadge}>{status}</span>
            </dd>
          </div>
          <div className={styles.infoItem}>
            <dt className={styles.infoLabel}>Last Check</dt>
            <dd className={styles.infoValue}>
              {timestamp.toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
