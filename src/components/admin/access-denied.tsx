import styles from "./access-denied.module.css";

export function AccessDenied() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Access Denied</h1>
      <p className={styles.message}>
        You do not have permission to access this page.
      </p>
    </div>
  );
}
