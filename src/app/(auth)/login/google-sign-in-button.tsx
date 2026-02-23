"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./google-sign-in-button.module.css";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  function handleClick() {
    setLoading(true);
    authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
    // Note: No need to setLoading(false) since the page will redirect
  }

  return (
    <button className={styles.button} onClick={handleClick} disabled={loading}>
      {loading ? "Redirecting to Google..." : "Continue with Google"}
    </button>
  );
}
