"use client";

import { authClient } from "@/lib/auth-client";
import styles from "./google-sign-in-button.module.css";

export function GoogleSignInButton() {
  function handleClick() {
    authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
  }

  return (
    <button className={styles.button} onClick={handleClick}>
      Continue with Google
    </button>
  );
}
