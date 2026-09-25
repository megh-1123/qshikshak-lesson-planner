export default function TimePlanBar({ plan }) {
  if (!plan?.length) return null;
  const total = plan.reduce((a, b) => a + b.min, 0);
  return (
    <div>
      <div className="timeplan" aria-label="Lesson time plan">
        {plan.map((b) => (
          <div
            key={b.label}
            style={{ flex: b.min, background: b.color || 'var(--primary)' }}
            title={`${b.label} – ${b.min} min`}
          >
            {b.label} {b.min}′
          </div>
        ))}
      </div>
      <div className="faint">Total {total} min</div>
    </div>
  );
}
