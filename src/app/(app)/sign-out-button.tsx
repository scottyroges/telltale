"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import styles from "./sign-out-button.module.css";

export function SignOutButton() {
  const router = useRouter();

  async function handleClick() {
    try {
      const result = await authClient.signOut();

      // Better Auth returns { data, error } instead of throwing
      if (result.error) {
        console.error("Sign-out error:", result.error);
        // Even if sign-out fails, redirect to login for security
        router.push("/login");
      } else {
        // Success — redirect to login
        router.push("/login");
      }
    } catch (err: unknown) {
      console.error("Sign-out error:", err);
      // Even if sign-out fails, redirect to login for security
      router.push("/login");
    }
  }

  return (
    <button className={styles.button} onClick={handleClick}>
      Sign out
    </button>
  );
}
