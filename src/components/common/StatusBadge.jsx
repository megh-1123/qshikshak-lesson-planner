import { PLAN_STATUS_META, STATUS_META } from '@/utils/constants';

export function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.empty;
  return (
    <span className={`badge ${status === 'cancelled' ? 'cancelled' : ''}`} style={{ '--c': m.color }}>
      <span className="dot" />
      {m.label}
    </span>
  );
}

export function PlanStatusBadge({ status }) {
  const m = PLAN_STATUS_META[status] || PLAN_STATUS_META.draft;
  return (
    <span className="badge" style={{ '--c': m.color }}>
      <span className="dot" />
      {m.label}
    </span>
  );
}

export function StatusLegend({ keys = ['planned', 'completed', 'partial', 'not_done', 'rescheduled', 'cancelled'] }) {
  return (
    <div className="legend">
      {keys.map((k) => (
        <span key={k}>
          <i style={{ '--c': STATUS_META[k].color }} />
          {STATUS_META[k].label}
        </span>
      ))}
    </div>
  );
}
