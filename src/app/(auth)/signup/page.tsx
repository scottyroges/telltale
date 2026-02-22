import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { SignUpForm } from "./sign-up-form";
import styles from "../login/page.module.css";

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Create an account</h1>
      <SignUpForm />
      <p className={styles.footer}>
        Already have an account? <a href="/login" className={styles.link}>Sign in</a>
      </p>
    </div>
  );
}
