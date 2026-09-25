export default function ProgressBar({ value = 0, color, showValue = true }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress" aria-label={`${v}%`}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${v}%`, background: color }} />
      </div>
      {showValue && <span className="progress-value">{v}%</span>}
    </div>
  );
}

export function Ring({ value = 0, label }) {
  return (
    <div className="stack" style={{ alignItems: 'center', gap: 8 }}>
      <div className="ring" style={{ '--p': value }}>
        <div>{value}%</div>
      </div>
      {label && <span className="muted small">{label}</span>}
    </div>
  );
}
