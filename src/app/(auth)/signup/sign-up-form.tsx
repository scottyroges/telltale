"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PasswordInput } from "@/components/ui/password-input";
import styles from "./sign-up-form.module.css";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: "/dashboard",
      });

      // Success — redirect to check-email page
      router.push(`/signup/check-email?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      const authError = err as { code?: string; message?: string };

      if (authError.code === "USER_ALREADY_EXISTS") {
        setError("An account with this email already exists");
      } else if (authError.message?.includes("password")) {
        setError("Password must be at least 8 characters");
      } else {
        setError(authError.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <div className={styles.error}>{error}</div>}

      <div>
        <label htmlFor="name" className={styles.label}>
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={styles.input}
        />
      </div>

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
          className={styles.input}
        />
      </div>

      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        className={styles.input}
      />

      <PasswordInput
        id="confirm-password"
        label="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        minLength={8}
        className={styles.input}
      />

      <button type="submit" disabled={loading} className={styles.button}>
        {loading ? "Creating account..." : "Sign up"}
      </button>
    </form>
  );
}
