export default function Switch({ checked, onChange, label, hint }) {
  return (
    <label className="row-between" style={{ cursor: 'pointer', padding: '10px 0' }}>
      <span className="stack" style={{ gap: 2 }}>
        <span className="strong small">{label}</span>
        {hint && <span className="faint">{hint}</span>}
      </span>
      <span className="switch">
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
    </label>
  );
}
