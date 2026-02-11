"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import styles from "./sign-out-button.module.css";

export function SignOutButton() {
  const router = useRouter();

  async function handleClick() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <button className={styles.button} onClick={handleClick}>
      Sign out
    </button>
  );
}
