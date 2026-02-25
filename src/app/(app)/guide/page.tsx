import styles from "./guide.module.css";

export default function GuidePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Interview Tips</h1>
        <p className={styles.subtitle}>
          A few things to know before you start sharing your story.
        </p>
      </header>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>How It Works</h2>
        <ul className={styles.tipList}>
          <li className={styles.tip}>
            <span className={styles.tipIcon} aria-hidden="true">
              1.
            </span>
            <div className={styles.tipContent}>
              <p className={styles.tipHeading}>You&rsquo;re in control</p>
              <p className={styles.tipBody}>
                Answer what feels right and skip what doesn&rsquo;t. There are no
                wrong answers, and you can always come back later.
              </p>
            </div>
          </li>
          <li className={styles.tip}>
            <span className={styles.tipIcon} aria-hidden="true">
              2.
            </span>
            <div className={styles.tipContent}>
              <p className={styles.tipHeading}>
                The AI helps you remember details
              </p>
              <p className={styles.tipBody}>
                It asks follow-up questions to draw out the little moments and
                specifics that make stories come alive. Just go with the
                conversation.
              </p>
            </div>
          </li>
          <li className={styles.tip}>
            <span className={styles.tipIcon} aria-hidden="true">
              3.
            </span>
            <div className={styles.tipContent}>
              <p className={styles.tipHeading}>
                Don&rsquo;t worry about making it polished
              </p>
              <p className={styles.tipBody}>
                Short answers, typos, and stream-of-consciousness are all
                perfectly fine. The goal is to capture details, not write a final
                draft.
              </p>
            </div>
          </li>
          <li className={styles.tip}>
            <span className={styles.tipIcon} aria-hidden="true">
              4.
            </span>
            <div className={styles.tipContent}>
              <p className={styles.tipHeading}>
                We&rsquo;ll craft your story later
              </p>
              <p className={styles.tipBody}>
                Everything you share gets turned into a polished narrative
                afterward. Right now, just focus on remembering.
              </p>
            </div>
          </li>
        </ul>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Quick Tips</h2>
        <ul className={styles.tipList}>
          <li className={styles.tip}>
            <div className={styles.tipContent}>
              <p className={styles.tipBody}>
                If a question doesn&rsquo;t resonate, use the{" "}
                <strong>Try a different question</strong> button to move on.
              </p>
            </div>
          </li>
          <li className={styles.tip}>
            <div className={styles.tipContent}>
              <p className={styles.tipBody}>
                When you feel done with a topic, click{" "}
                <strong>End Interview</strong> and pick another question from the
                list.
              </p>
            </div>
          </li>
          <li className={styles.tip}>
            <div className={styles.tipContent}>
              <p className={styles.tipBody}>
                There&rsquo;s no time limit. Take breaks whenever you need to.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
