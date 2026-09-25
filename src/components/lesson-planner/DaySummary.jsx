import './DaySummary.css';
import { AlertCircle, BookOpen, CalendarOff, CheckCircle2, Clock, Coffee } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { daySummary } from '@/utils/daySummary';
import { fmtLong, fmtTime } from '@/utils/date';

export const PERIOD_KINDS = {
  done: { label: 'Taught', color: 'var(--st-completed)' },
  lesson: { label: 'Lesson ready', color: 'var(--st-planned)' },
  'no-lesson': { label: 'No lesson yet', color: 'var(--st-partial)' },
  cancelled: { label: 'Cancelled', color: 'var(--st-cancelled)' },
  free: { label: 'Free period', color: 'var(--st-empty)' },
};

function Stat({ icon: Icon, value, label, hint, tone = '' }) {
  return (
    <div className={`ds-stat ${tone}`}>
      <Icon size={20} aria-hidden="true" />
      <div>
        <div className="ds-value">{value}</div>
        <div className="ds-label">{label}</div>
        {hint && <div className="ds-hint">{hint}</div>}
      </div>
    </div>
  );
}

/** "Your day at a glance" – periods, classes, lessons ready, lessons missing, free periods */
export default function DaySummary({ date, items = [], holidays = [], exams = [], onPlan, title }) {
  const { user, masters, sectionLabel, subjectName } = useApp();
  const s = daySummary({ date, teacherId: user.id, timetable: masters.timetable, items, holidays, exams });

  const nameOf = (p) => {
    if (p.item)
      return `${p.item.classLabel || sectionLabel(p.item.sectionId)} · ${p.item.subjectName || subjectName(p.item.subjectId)}`;
    if (p.slot) return `${sectionLabel(p.slot.sectionId)} · ${subjectName(p.slot.subjectId)}`;
    return 'No class';
  };

  return (
    <section className="card day-summary" aria-label="Your day at a glance">
      <div className="ds-head">
        <h3>{title || fmtLong(date)}</h3>
        <span className="muted small">Your day at a glance</span>
      </div>

      {s.closed ? (
        <div className="ds-closed">
          <CalendarOff size={20} /> {s.closed} – no classes on this day.
        </div>
      ) : (
        <>
          <div className="ds-stats">
            <Stat icon={Clock} value={s.total} label="Periods in the day" hint="in the school timetable" />
            <Stat icon={BookOpen} value={s.classes} label="My classes" hint="periods you teach" />
            <Stat icon={CheckCircle2} value={s.withLesson} label="Lessons ready" hint="class has a lesson" tone="ok" />
            <Stat
              icon={AlertCircle}
              value={s.needLesson}
              label="Need a lesson"
              hint={s.needLesson ? 'no lesson planned yet' : 'all classes are planned'}
              tone={s.needLesson ? 'warn' : ''}
            />
            <Stat icon={Coffee} value={s.free} label="Free periods" hint="no class – your free time" tone="free" />
          </div>

          <div className="ds-bar" role="list" aria-label="Periods of the day">
            {s.periods.map((p) => (
              <div
                key={p.id}
                role="listitem"
                className={`ds-cell ${p.kind}`}
                style={{ '--c': PERIOD_KINDS[p.kind].color }}
                title={`${p.label} · ${fmtTime(p.start)}–${fmtTime(p.end)} · ${PERIOD_KINDS[p.kind].label}${p.item ? ` · ${p.item.topicTitle}` : ''}`}
              >
                <span className="ds-p">P{p.number}</span>
                <span className="ds-t">{nameOf(p)}</span>
                <span className="ds-k">{PERIOD_KINDS[p.kind].label}</span>
              </div>
            ))}
          </div>

          <div className="ds-foot">
            <div className="ds-legend">
              {Object.entries(PERIOD_KINDS).map(([k, v]) => (
                <span key={k}>
                  <i style={{ background: v.color }} /> {v.label}
                </span>
              ))}
            </div>
            {s.needLesson > 0 && onPlan && (
              <button className="btn sm primary" onClick={onPlan}>
                Plan the missing lessons
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}