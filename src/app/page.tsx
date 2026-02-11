import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Telltale</h1>
      <p className={styles.tagline}>
        AI-powered life story platform &mdash; conversational AI that draws out
        rich, deep stories through natural follow-up questions.
      </p>
    </div>
  );
}
