import { GoogleSignInButton } from "./google-sign-in-button";
import styles from "./page.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Sign in to Telltale</h1>
      {error && (
        <p className={styles.error} role="alert">
          Something went wrong. Please try again.
        </p>
      )}
      <GoogleSignInButton />
    </div>
  );
}
