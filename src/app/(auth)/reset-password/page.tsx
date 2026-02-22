import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";
import styles from "../login/page.module.css";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className={styles.card}>
        <h1 className={styles.title}>Set new password</h1>
        <p className={styles.message}>Loading...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
