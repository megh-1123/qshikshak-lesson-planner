import './ProgressBars.css';

// Colour and word for a chapter's progress
const statusOf = (p) =>
  p >= 100
    ? { label: 'Done', color: 'var(--st-completed)' }
    : p > 0
      ? { label: 'In progress', color: 'var(--primary)' }
      : { label: 'Not started', color: 'var(--st-empty)' };

/** Chapter-wise progress: "Ch 2. Friction  ████████░░ 80%  In progress" */
export default function ProgressBars({ chapters }) {
  const done = chapters.filter((c) => c.percent >= 100).length;
  return (
    <div className="ch-progress">
      <div className="ch-summary">
        <span className="strong">
          {done} of {chapters.length} chapters done
        </span>
        <span className="ch-legend">
          {[100, 50, 0].map((p) => (
            <span key={p}>
              <i style={{ background: statusOf(p).color }} /> {statusOf(p).label}
            </span>
          ))}
        </span>
      </div>

      {chapters.map((c, i) => {
        const st = statusOf(c.percent);
        return (
          <div key={c.id || i} className="ch-row">
            <div className="ch-name">
              <span className="strong">
                Ch {i + 1}. {c.title}
              </span>
              <small>
                {c.term} · {c.topics} topics
              </small>
            </div>
            <div className="ch-bar" aria-label={`${c.title}: ${c.percent}%`}>
              <div className="ch-track">
                <div className="ch-fill" style={{ width: `${c.percent}%`, background: st.color }} />
              </div>
              <span className="ch-pct">{c.percent}%</span>
            </div>
            <span className="ch-tag" style={{ '--c': st.color }}>
              {st.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}