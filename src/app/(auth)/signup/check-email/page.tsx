import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import styles from "../../login/page.module.css";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const email = params.email || "your email";

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Check your email</h1>
      <p className={styles.message}>
        We&apos;ve sent a verification email to <strong>{email}</strong>.
        Please check your inbox and click the link to verify your account.
      </p>
      <p className={styles.footer}>
        <a href="/login" className={styles.link}>Back to sign in</a>
      </p>
    </div>
  );
}
