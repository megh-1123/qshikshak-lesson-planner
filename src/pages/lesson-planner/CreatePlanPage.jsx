import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarCheck2, CalendarX2, CheckCircle2, Wand2 } from 'lucide-react';
import Card from '@/components/common/Card';
import { Segmented } from '@/components/common/Tabs';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { addDays, fmt, startOfWeek, todayISO, toISO, parseISO } from '@/utils/date';

const presets = () => {
  const ws = startOfWeek(todayISO());
  const d = parseISO(todayISO());
  return {
    this: [ws, addDays(ws, 5)],
    next: [addDays(ws, 7), addDays(ws, 12)],
    two: [addDays(ws, 7), addDays(ws, 19)],
    month: [todayISO(), toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))],
  };
};

export default function CreatePlanPage() {
  const { user, masters, myAssignments, sectionLabel, subjectName } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const assignments = useMemo(() => myAssignments(user.id), [myAssignments, user.id]);

  const [pick, setPick] = useState(null);
  const [range, setRange] = useState('next');
  const [dates, setDates] = useState(presets().next);
  const [templateId, setTemplateId] = useState(masters.templates.find((t) => t.isDefault)?.id);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const s = params.get('sectionId');
    const sub = params.get('subjectId');
    const found = assignments.find((a) => a.sectionId === s && a.subjectId === sub);
    if (found) {
      setPick(found);
      setRange('this');
      setDates(presets().this);
    }
  }, [params, assignments]);

  const choose = (v) => {
    setRange(v);
    if (v !== 'custom') setDates(presets()[v]);
  };

  const generate = async () => {
    setBusy(true);
    setResult(null);
    try {
      const { data } = await lessonPlannerApi.generatePlan({
        teacherId: user.id,
        classId: pick.classId,
        sectionId: pick.sectionId,
        subjectId: pick.subjectId,
        startDate: dates[0],
        endDate: dates[1],
        templateId,
      });
      setResult(data);
      toast(`Plan created with ${data.placedCount} lessons`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-3">
      <div className="span-2 stack" style={{ gap: 20 }}>
        <Card title="1. Choose class and subject">
          {assignments.length === 0 && (
            <p className="faint">
              You have no periods in the timetable yet. Ask the admin to add you to the timetable.
            </p>
          )}
          <div className="grid-3" style={{ gap: 12 }}>
            {assignments.map((a) => {
              const active = pick?.sectionId === a.sectionId && pick?.subjectId === a.subjectId;
              return (
                <button
                  key={`${a.sectionId}-${a.subjectId}`}
                  onClick={() => {
                    setPick(a);
                    setResult(null);
                  }}
                  className="card"
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: `2px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
                    background: active ? 'var(--primary-50)' : '#fff',
                    boxShadow: 'none',
                    padding: 16,
                  }}
                  aria-pressed={active}
                >
                  <div className="strong">{sectionLabel(a.sectionId)}</div>
                  <div className="muted small">{subjectName(a.subjectId)}</div>
                  <div className="faint" style={{ marginTop: 6 }}>
                    {a.periodsPerWeek} periods a week
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="2. Choose dates">
          <div className="stack" style={{ gap: 14 }}>
            <Segmented
              value={range}
              onChange={choose}
              options={[
                { value: 'this', label: 'This week' },
                { value: 'next', label: 'Next week' },
                { value: 'two', label: 'Next 2 weeks' },
                { value: 'month', label: 'Rest of month' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            <div className="form-grid">
              <div className="field">
                <label htmlFor="cp-from">From</label>
                <input
                  id="cp-from"
                  type="date"
                  className="input"
                  value={dates[0]}
                  onChange={(e) => {
                    setRange('custom');
                    setDates([e.target.value, dates[1]]);
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="cp-to">To</label>
                <input
                  id="cp-to"
                  type="date"
                  className="input"
                  min={dates[0]}
                  value={dates[1]}
                  onChange={(e) => {
                    setRange('custom');
                    setDates([dates[0], e.target.value]);
                  }}
                />
              </div>
              <div className="field full">
                <label htmlFor="cp-tpl">Lesson template</label>
                <select
                  id="cp-tpl"
                  className="select"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {masters.templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.board})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="stack" style={{ gap: 20 }}>
        <Card title="3. Generate">
          <div className="stack">
            <p className="small muted">
              The system places the next syllabus topics into your timetable periods. Holidays
              {masters.settings.skipExams ? ' and exam days' : ''} are skipped. Periods that already have a lesson stay
              as they are.
            </p>
            {pick && (
              <p className="small">
                <span className="strong">
                  {sectionLabel(pick.sectionId)} · {subjectName(pick.subjectId)}
                </span>
                <br />
                <span className="faint">
                  {fmt(dates[0])} – {fmt(dates[1])}
                </span>
              </p>
            )}
            <button className="btn primary" disabled={!pick || busy || dates[0] > dates[1]} onClick={generate}>
              <Wand2 size={16} /> {busy ? 'Generating…' : 'Generate plan'}
            </button>
          </div>
        </Card>

        {result && (
          <Card>
            <div className="stack">
              <div className="row" style={{ color: 'var(--st-completed)' }}>
                <CheckCircle2 size={20} />
                <span className="strong">{result.placedCount} lessons planned</span>
              </div>
              {result.skippedDays.length > 0 && (
                <div className="row small muted" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                  <CalendarX2 size={16} style={{ flexShrink: 0 }} />
                  Skipped: {result.skippedDays.map((d) => fmt(d)).join(', ')}
                </div>
              )}
              {result.unscheduled.length > 0 && (
                <div className="small muted">
                  {result.unscheduled.length} topic{result.unscheduled.length > 1 ? 's' : ''} did not fit and will go
                  into your next plan.
                </div>
              )}
              <button className="btn primary" onClick={() => navigate(`/lesson-planner/plans/${result.plan.id}`)}>
                <CalendarCheck2 size={16} /> Open plan and add details
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}