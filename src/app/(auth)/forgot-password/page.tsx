"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "../login/page.module.css";
import formStyles from "../signup/sign-up-form.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      setSubmitted(true);
    } catch {
      // Show generic success message even on error (prevent email enumeration)
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.message}>
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
        <p className={styles.footer}>
          <a href="/login" className={styles.link}>Back to sign in</a>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Reset your password</h1>
      <p className={styles.message}>
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form className={formStyles.form} onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className={formStyles.label}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={formStyles.input}
          />
        </div>

        <button type="submit" disabled={loading} className={formStyles.button}>
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className={styles.footer}>
        <a href="/login" className={styles.link}>Back to sign in</a>
      </p>
    </div>
  );
}
