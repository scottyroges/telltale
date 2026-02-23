"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PasswordInput } from "@/components/ui/password-input";
import styles from "../login/page.module.css";
import formStyles from "../signup/sign-up-form.module.css";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("Invalid or missing reset token");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    setLoading(true);

    try {
      await authClient.resetPassword({
        newPassword: password,
        token,
      });

      // Success — redirect to login with success message
      router.push("/login?message=password-reset");
    } catch (err: unknown) {
      const authError = err as { code?: string; message?: string };

      if (authError.message?.includes("expired") || authError.message?.includes("invalid")) {
        setError("This reset link has expired or is invalid. Please request a new one.");
      } else {
        setError(authError.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Set new password</h1>

      <form className={formStyles.form} onSubmit={handleSubmit}>
        {error && <div className={formStyles.error}>{error}</div>}

        <PasswordInput
          id="password"
          label="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className={formStyles.input}
        />

        <PasswordInput
          id="confirm-password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className={formStyles.input}
        />

        <button type="submit" disabled={loading || !token} className={formStyles.button}>
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>

      <p className={styles.footer}>
        <a href="/login" className={styles.link}>Back to sign in</a>
      </p>
    </div>
  );
}
