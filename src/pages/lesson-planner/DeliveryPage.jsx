import { useState } from 'react';
import { CheckCircle2, CircleSlash, CircleDashed, CalendarCheck2 } from 'lucide-react';
import Card from '@/components/common/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import EmptyState, { Loader } from '@/components/common/EmptyState';
import { useLessonModals } from '@/components/lesson-planner/useLessonModals';
import { useApp } from '@/context/AppContext';
import { useApi } from '@/hooks/useApi';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { fmt, fmtTime, todayISO } from '@/utils/date';

function LessonRow({ l, lm, showDate }) {
  return (
    <div className="row-between" style={{ padding: '14px 0', borderBottom: '1px dashed var(--line)' }}>
      <div
        className="stack"
        style={{ gap: 2, cursor: 'pointer', minWidth: 0, flex: 1 }}
        onClick={() => lm.openDetail(l)}
      >
        <span className="strong">{l.topicTitle}</span>
        <span className="small muted">
          {showDate && `${fmt(l.date)} · `}
          {fmtTime(l.start)} · {l.periodLabel} · {l.classLabel} · {l.subjectName}
        </span>
      </div>
      {l.status === 'planned' ? (
        <div className="row">
          <button className="btn sm success" onClick={() => lm.openComplete(l, 'completed')}>
            <CheckCircle2 size={14} /> Done
          </button>
          <button
            className="btn sm"
            style={{ borderColor: 'var(--st-partial)', color: '#b45309' }}
            onClick={() => lm.openComplete(l, 'partial')}
          >
            <CircleDashed size={14} /> Partly
          </button>
          <button className="btn sm danger" onClick={() => lm.openComplete(l, 'not_done')}>
            <CircleSlash size={14} /> Not done
          </button>
        </div>
      ) : (
        <StatusBadge status={l.status} />
      )}
    </div>
  );
}

export default function DeliveryPage() {
  const { user, loadNotifications } = useApp();
  const [date, setDate] = useState(todayISO());
  const { data, loading, reload } = useApi(() => lessonPlannerApi.getToday({ userId: user.id, date }), [user.id, date]);
  const lm = useLessonModals(() => {
    reload();
    loadNotifications();
  });

  return (
    <>
      <Card>
        <div className="row-between">
          <p className="muted">Mark each period after class. Unfinished topics move forward automatically.</p>
          <div className="field" style={{ width: 190 }}>
            <label htmlFor="dl-date">Date</label>
            <input
              id="dl-date"
              type="date"
              className="input"
              max={todayISO()}
              value={date}
              onChange={(e) => setDate(e.target.value || todayISO())}
            />
          </div>
        </div>
      </Card>
      {loading && !data ? (
        <Loader />
      ) : (
        <div className="grid-3">
          <Card
            title={`Lessons on ${fmt(date, { weekday: 'long', day: 'numeric', month: 'short' })}`}
            className="span-2"
          >
            {data.holiday ? (
              <EmptyState icon={CalendarCheck2} title={data.holiday.title} text="School holiday – nothing to mark." />
            ) : data.lessons.length === 0 ? (
              <EmptyState
                icon={CalendarCheck2}
                title="No planned lessons on this day"
                text="Only lessons from your plans appear here."
              />
            ) : (
              data.lessons.map((l) => <LessonRow key={l.id} l={l} lm={lm} />)
            )}
          </Card>
          <Card title="Still to mark">
            {data.pendingMarking.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="All caught up" text="Every earlier lesson is marked." />
            ) : (
              data.pendingMarking.map((l) => <LessonRow key={l.id} l={l} lm={lm} showDate />)
            )}
          </Card>
        </div>
      )}
      {lm.modals}
    </>
  );
}
