import { STATUS_META, WEEKDAYS, periodById } from '@/utils/constants';
import { addDays, fmtTime, parseISO, startOfWeek, todayISO, toISO } from '@/utils/date';
import { StatusBadge } from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { CalendarOff } from 'lucide-react';

export function MonthView({ month, items, holidays = [], exams = [], onSelect, onDay }) {
  const first = parseISO(month);
  const gridStart = startOfWeek(month);
  const last = toISO(new Date(first.getFullYear(), first.getMonth() + 1, 0));
  const days = [];
  for (let d = gridStart; d <= last || days.length % 7; d = addDays(d, 1)) days.push(d);
  const today = todayISO();
  const labels = [...WEEKDAYS, 'SUN'];
  return (
    <div className="month">
      {labels.map((l) => (
        <div key={l} className="mh">
          {l}
        </div>
      ))}
      {days.map((d) => {
        const list = items.filter((i) => i.date === d && i.status !== 'rescheduled');
        const hol = holidays.find((h) => h.date === d) || exams.find((e) => e.date === d);
        const out = parseISO(d).getMonth() !== first.getMonth();
        return (
          <div key={d} className={`md ${out ? 'out' : ''} ${hol ? 'holiday' : ''} ${d === today ? 'today' : ''}`}>
            <div className="dn">
              <span>{parseISO(d).getDate()}</span>
            </div>
            {hol && <span className="htag">{hol.title}</span>}
            {list.slice(0, 3).map((it) => (
              <button
                key={it.id}
                className="mchip"
                style={{ '--c': STATUS_META[it.status].color }}
                onClick={() => onSelect(it)}
                title={`${it.classLabel} · ${it.topicTitle}`}
              >
                {periodById(it.periodId)?.start} {it.classLabel} · {it.topicTitle}
              </button>
            ))}
            {list.length > 3 && (
              <button className="mmore" onClick={() => onDay(d)}>
                +{list.length - 3} more
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Day view. If `periods` is given (teacher's day from utils/daySummary.js), every period of the day
 * is listed – lessons, classes with no lesson yet, and free periods. Otherwise only lessons are listed.
 */
export function DayView({ date, items, holidays = [], onSelect, periods, onPlan }) {
  const hol = holidays.find((h) => h.date === date);
  const list = items.filter((i) => i.date === date && i.status !== 'rescheduled');
  if (hol) return <EmptyState icon={CalendarOff} title={hol.title} text="School holiday – no lessons today." />;

  const lessonRow = (it) => (
    <div
      key={it.id}
      className="tl-item"
      style={{ '--c': STATUS_META[it.status].color, cursor: 'pointer' }}
      onClick={() => onSelect(it)}
    >
      <div className="tl-time">
        {fmtTime(it.start)}
        <small>{it.periodLabel}</small>
      </div>
      <span className="tl-dot" />
      <div className="tl-body">
        <h4>{it.topicTitle}</h4>
        <div className="small muted">
          {it.classLabel} · {it.subjectName} · {it.chapterTitle}
        </div>
      </div>
      <StatusBadge status={it.status} />
    </div>
  );

  if (periods) {
    return (
      <div className="timeline">
        {periods.map((p) =>
          p.item ? (
            lessonRow(p.item)
          ) : (
            <div
              key={p.id}
              className={`tl-item tl-${p.kind}`}
              style={{ '--c': p.kind === 'free' ? 'var(--st-empty)' : 'var(--st-partial)' }}
            >
              <div className="tl-time">
                {fmtTime(p.start)}
                <small>{p.label}</small>
              </div>
              <span className="tl-dot" />
              <div className="tl-body">
                <h4>{p.kind === 'free' ? 'Free period' : 'No lesson planned yet'}</h4>
                <div className="small muted">{p.kind === 'free' ? 'No class in this period' : p.slotLabel}</div>
              </div>
              {p.kind === 'no-lesson' && onPlan && (
                <button className="btn sm" onClick={onPlan}>
                  Plan
                </button>
              )}
            </div>
          ),
        )}
      </div>
    );
  }

  if (!list.length)
    return (
      <EmptyState
        icon={CalendarOff}
        title="No lessons on this day"
        text="Pick another day, or create a plan to fill your periods."
      />
    );
  return <div className="timeline">{list.map(lessonRow)}</div>;
}