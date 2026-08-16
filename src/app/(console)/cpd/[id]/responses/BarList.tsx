import styles from './responses.module.css';

/**
 * A horizontal bar list — the form for "compare these counts".
 *
 * One hue rather than a colour per option: the bars measure the same thing, so
 * colour is not carrying identity here (the label beside each bar is), and a
 * categorical palette would run out well before the sixty options a question
 * may declare. The track is a lighter step of the same ramp, so an option
 * nobody chose still reads as a row with a zero rather than blank space.
 *
 * Every bar is directly labelled with its count and share, so there is nothing
 * a tooltip would reveal that is not already on screen — which is why the bar
 * itself is hidden from assistive technology rather than described twice.
 */
export function BarList({
  rows, total, showPercent = true,
}: {
  rows: { key: string; label: string; count: number; note?: string }[];
  /** The denominator for the share. */
  total: number;
  showPercent?: boolean;
}) {
  if (rows.length === 0) {
    return <p className={styles.empty}>Nothing to show yet.</p>;
  }

  // Bars are scaled against the largest value, not the total: with one option
  // on 3% and another on 5%, scaling to the total leaves two invisible slivers
  // and the comparison the reader came for is lost.
  const peak = Math.max(...rows.map((r) => r.count), 1);

  return (
    <ul className={styles.bars}>
      {rows.map((row) => {
        const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
        const width = (row.count / peak) * 100;

        return (
          <li key={row.key} className={styles.bar}>
            <span className={styles.barLabel}>
              {row.label}
              {row.note && <span className={styles.retired}>{row.note}</span>}
            </span>
            <span className={`${styles.barValue} ${row.count === 0 ? styles.barZero : ''}`}>
              <span className={row.count > 0 ? styles.barValueCount : undefined}>{row.count}</span>
              {showPercent && ` · ${share}%`}
            </span>
            <span className={styles.barTrack} aria-hidden="true">
              <span className={styles.barFill} style={{ width: `${width}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
