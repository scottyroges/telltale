import Link from "next/link";
import { serverTRPC } from "@/lib/trpc/server";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const trpc = await serverTRPC();
  const { status, user, timestamp } = await trpc.health.dbCheck();

  return (
    <div className={styles.page}>
      <h1>Welcome, {user.name}</h1>
      <Link href="/books" className={styles.cta}>
        Continue Your Story →
      </Link>
      <dl>
        <dt>User ID</dt>
        <dd>{user.id}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>DB Status</dt>
        <dd>{status}</dd>
        <dt>Timestamp</dt>
        <dd>{timestamp.toISOString()}</dd>
      </dl>
    </div>
  );
}
