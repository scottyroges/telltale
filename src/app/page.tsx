import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/server/auth";
import styles from "./page.module.css";

export default async function Home() {
  // Redirect authenticated users to dashboard
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Telltale</h1>
      <p className={styles.tagline}>
        AI-powered life story platform &mdash; conversational AI that draws out
        rich, deep stories through natural follow-up questions.
      </p>
      <div className={styles.actions}>
        <Link href="/signup" className={styles.primaryButton}>
          Sign Up
        </Link>
        <Link href="/login" className={styles.secondaryButton}>
          Sign In
        </Link>
      </div>
    </div>
  );
}
