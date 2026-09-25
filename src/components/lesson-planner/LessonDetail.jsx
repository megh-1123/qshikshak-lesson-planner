import { CalendarClock, CheckSquare, Link2, Paperclip, Pencil, PlusCircle, XCircle } from 'lucide-react';
import Modal from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import TimePlanBar from './TimePlanBar';
import { useApp } from '@/context/AppContext';
import { fmtLong, todayISO } from '@/utils/date';

const RESULT = { yes: 'Achieved', partly: 'Partly', no: 'Not yet' };
const MARKED = ['completed', 'partial', 'not_done'];

export default function LessonDetail({ open, item, onClose, onEdit, onComplete, onReschedule, onAddPeriods }) {
  const { user } = useApp();
  if (!open || !item) return null;
  const d = item.details || {};
  const c = item.completion;
  const mine = item.teacherId === user.id;
  const planned = item.status === 'planned';

  const Section = ({ label, children }) => (
    <div className="stack" style={{ gap: 4 }}>
      <span className="field-label">{label}</span>
      <div className="small muted" style={{ lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="drawer"
      width={560}
      title={item.topicTitle}
      subtitle={`${item.classLabel} · ${item.subjectName} · ${fmtLong(item.date)} · ${item.periodLabel}`}
      footer={
        mine &&
        (planned ? (
          <>
            <button className="btn ghost" onClick={() => onReschedule(item, 'cancel')}>
              <XCircle size={15} /> Cancel
            </button>
            <button className="btn" onClick={() => onReschedule(item, 'reschedule')}>
              <CalendarClock size={15} /> Reschedule
            </button>
            <button className="btn" onClick={() => onEdit(item)}>
              <Pencil size={15} /> Edit
            </button>
            {onAddPeriods && (
              <button className="btn" onClick={() => onAddPeriods(item)}>
                <PlusCircle size={15} /> Add periods
              </button>
            )}
            {item.date <= todayISO() && (
              <button className="btn primary" onClick={() => onComplete(item)}>
                <CheckSquare size={15} /> Mark lesson
              </button>
            )}
          </>
        ) : MARKED.includes(item.status) ? (
          <>
            {onAddPeriods && (
              <button className="btn" onClick={() => onAddPeriods(item)}>
                <PlusCircle size={15} /> Add periods
              </button>
            )}
            <button className="btn primary" onClick={() => onComplete(item)}>
              <Pencil size={15} /> Edit marking
            </button>
          </>
        ) : null)
      }
    >
      <div className="stack" style={{ gap: 18 }}>
        <div className="row">
          <StatusBadge status={item.status} />
          <span className="faint">
            {item.chapterTitle} · {item.teacherName}
          </span>
        </div>
        {item.continued && <p className="faint">Continued from an earlier period that was not finished.</p>}
        {item.cancelReason && <Section label="Cancelled because">{item.cancelReason}</Section>}

        {d.objectives?.length > 0 && (
          <Section label="Learning objectives">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {d.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </Section>
        )}
        {d.prerequisites && <Section label="Prerequisites">{d.prerequisites}</Section>}
        {d.method && <Section label="Teaching method">{d.method}</Section>}
        {d.activities && <Section label="Activities">{d.activities}</Section>}
        {d.timePlan?.length > 0 && (
          <Section label="Time plan">
            <TimePlanBar plan={d.timePlan} />
          </Section>
        )}
        {d.resources?.length > 0 && (
          <Section label="Resources">
            {d.resources.map((r) => (
              <div key={r.name} className="row">
                {r.type === 'file' ? <Paperclip size={14} /> : <Link2 size={14} />}
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.name}
                  </a>
                ) : (
                  r.name
                )}
              </div>
            ))}
          </Section>
        )}
        {d.assessment && <Section label="Check for understanding">{d.assessment}</Section>}
        {d.homework && <Section label="Homework">{d.homework}</Section>}
        {!d.objectives?.length && planned && (
          <p className="faint">No lesson details yet.{mine && ' Use Edit to add objectives, method and homework.'}</p>
        )}

        {c && (
          <div className="card" style={{ background: '#fafaff', boxShadow: 'none', border: '1px solid var(--line)' }}>
            <h3 style={{ marginBottom: 10 }}>After class</h3>
            <div className="stack">
              {c.topicsCovered?.length > 0 && <Section label="Topics covered">{c.topicsCovered.join(', ')}</Section>}
              {c.objectives?.length > 0 && (
                <Section label="Objectives">
                  {c.objectives.map((o) => (
                    <div key={o.text}>
                      {RESULT[o.result]} – {o.text}
                    </div>
                  ))}
                </Section>
              )}
              {c.understanding && <Section label="Understanding">{c.understanding}</Section>}
              {c.remarks && <Section label="Remarks">{c.remarks}</Section>}
              {c.nextLesson && <Section label="Next lesson">{c.nextLesson}</Section>}
            </div>
          </div>
        )}

        {item.history?.length > 0 && (
          <Section label="History">
            {item.history.map((h, i) => (
              <div key={i}>
                {new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – {h.action}
                {h.reason ? ` (${h.reason})` : ''}
              </div>
            ))}
          </Section>
        )}
      </div>
    </Modal>
  );
}
