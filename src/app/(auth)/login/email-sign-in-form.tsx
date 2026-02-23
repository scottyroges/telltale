"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PasswordInput } from "@/components/ui/password-input";
import styles from "./email-sign-in-form.module.css";

export function EmailSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authClient.signIn.email({
        email,
        password,
        callbackURL: "/dashboard",
      });

      // Success — redirect to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Sign-in error:", err);
      const authError = err as {
        code?: string;
        message?: string;
        error?: { status?: number; message?: string };
        status?: number;
      };

      // Handle different error formats from Better Auth
      if (authError.code === "INVALID_CREDENTIALS" || authError.status === 401) {
        setError("Invalid email or password");
      } else if (authError.code === "EMAIL_NOT_VERIFIED") {
        setError(
          "Please verify your email first. Check your inbox for a verification link."
        );
      } else if (authError.error?.status === 401) {
        setError("Invalid email or password");
      } else if (authError.message) {
        setError(authError.message);
      } else if (authError.error?.message) {
        setError(authError.error.message);
      } else {
        // Fallback - always show some error so user knows what happened
        setError("Sign-in failed. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error}>{error}</div>}

      <div>
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
          className={styles.input}
        />
      </div>

      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        disabled={loading}
        className={styles.input}
      />

      <button type="submit" disabled={loading} className={styles.button}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
