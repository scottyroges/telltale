import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { EmailSignInForm } from "./email-sign-in-form";
import { GoogleSignInButton } from "./google-sign-in-button";
import styles from "./page.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const message = typeof params.message === "string" ? params.message : undefined;

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Sign in to Telltale</h1>
      {error && (
        <p className={styles.error} role="alert">
          Something went wrong. Please try again.
        </p>
      )}
      {message === "password-reset" && (
        <div className={styles.success}>
          Password reset successful. You can now sign in with your new password.
        </div>
      )}
      <EmailSignInForm />
      <div className={styles.forgotPassword}>
        <a href="/forgot-password" className={styles.link}>
          Forgot password?
        </a>
      </div>
      <div className={styles.divider}>or continue with</div>
      <div className={styles.socialButtons}>
        <GoogleSignInButton />
      </div>
      <p className={styles.footer}>
        Don&apos;t have an account? <a href="/signup" className={styles.link}>Sign up</a>
      </p>
    </div>
  );
}
