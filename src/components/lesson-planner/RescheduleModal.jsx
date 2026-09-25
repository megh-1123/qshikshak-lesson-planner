import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2 } from 'lucide-react';
import Modal from '@/components/common/Modal';
import { Segmented } from '@/components/common/Tabs';
import { Loader } from '@/components/common/EmptyState';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { PERIODS } from '@/utils/constants';
import { addDays, fmt, todayISO } from '@/utils/date';
import { periodHasStarted, periodKind } from '@/utils/freePeriods';

const DAYS_AHEAD = 30;

export default function RescheduleModal({ open, item, initialMode = 'reschedule', onClose, onDone }) {
  const toast = useToast();
  const { masters } = useApp();
  const [mode, setMode] = useState(initialMode);
  const [date, setDate] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [cal, setCal] = useState(null); // lessons, holidays, exams for the next 30 days

  // Load the next 30 days so we only offer periods that will really work
  useEffect(() => {
    if (!open || !item) return;
    setMode(initialMode);
    setReason('');
    setCal(null);
    const from = todayISO();
    lessonPlannerApi
      .getCalendar({ userId: item.teacherId, role: 'admin', from, to: addDays(from, DAYS_AHEAD) })
      .then((r) => setCal(r.data))
      .catch(() => setCal({ items: [], holidays: [], exams: [] }));
  }, [open, initialMode, item]);

  // Every usable (date, period) for this lesson: its own class period or a free period,
  // not started yet, not a holiday / exam day, and the class and teacher are both free.
  const options = useMemo(() => {
    if (!cal || !item) return [];
    const blocked = new Set([...cal.holidays.map((h) => h.date), ...cal.exams.map((e) => e.date)]);
    const busyKey = new Set(
      cal.items
        .filter(
          (i) =>
            i.id !== item.id &&
            !['rescheduled', 'cancelled'].includes(i.status) &&
            (i.sectionId === item.sectionId || i.teacherId === item.teacherId),
        )
        .map((i) => `${i.date}|${i.periodId}`),
    );
    const list = [];
    for (let d = todayISO(), n = 0; n <= DAYS_AHEAD; d = addDays(d, 1), n++) {
      if (blocked.has(d)) continue;
      PERIODS.forEach((p) => {
        if (d === item.date && p.id === item.periodId) return;
        const kind = periodKind(masters.timetable, item, d, p.id);
        if (kind && !periodHasStarted(d, p.id) && !busyKey.has(`${d}|${p.id}`))
          list.push({ date: d, periodId: p.id, kind, label: p.label, start: p.start, end: p.end });
      });
    }
    return list;
  }, [cal, item, masters.timetable]);

  const dayOptions = options.filter((o) => o.date === date);
  const suggestions = options.slice(0, 4);

  // Start on the first day that has a usable period
  useEffect(() => {
    if (!options.length) return;
    if (!date || !options.some((o) => o.date === date)) {
      setDate(options[0].date);
      setPeriodId(options[0].periodId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);
  useEffect(() => {
    if (dayOptions.length && !dayOptions.some((o) => o.periodId === periodId)) setPeriodId(dayOptions[0].periodId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  if (!open || !item) return null;

  const submit = async () => {
    if (!reason.trim()) {
      toast('Add a reason. It stays in the lesson history.', 'error');
      return;
    }
    if (mode === 'reschedule' && !dayOptions.some((o) => o.periodId === periodId)) {
      toast('Pick a day and period from the list.', 'error');
      return;
    }
    setBusy(true);
    try {
      const res =
        mode === 'reschedule'
          ? await lessonPlannerApi.rescheduleItem(item.id, { date, periodId, reason })
          : await lessonPlannerApi.cancelItem(item.id, { reason });
      toast(res?.message || (mode === 'reschedule' ? 'Lesson rescheduled' : 'Lesson cancelled'));
      onDone?.();
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={520}
      title={mode === 'reschedule' ? 'Reschedule lesson' : 'Cancel lesson'}
      subtitle={`${item.topicTitle} · ${item.classLabel} · now ${fmt(item.date, { day: 'numeric', month: 'short' })}, ${item.periodLabel}`}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
          <button
            className={`btn ${mode === 'cancel' ? 'danger' : 'primary'}`}
            onClick={submit}
            disabled={busy || (mode === 'reschedule' && !options.length)}
          >
            {mode === 'reschedule' ? 'Reschedule' : 'Cancel lesson'}
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <Segmented
          options={[
            { value: 'reschedule', label: 'Reschedule' },
            { value: 'cancel', label: 'Cancel' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === 'reschedule' &&
          (!cal ? (
            <Loader />
          ) : !options.length ? (
            <p className="faint">No free periods in the next {DAYS_AHEAD} days for this class and teacher.</p>
          ) : (
            <>
              <div className="field">
                <span className="field-label">Quick pick – next free periods</span>
                <div className="row" style={{ gap: 8 }}>
                  {suggestions.map((o) => {
                    const active = o.date === date && o.periodId === periodId;
                    return (
                      <button
                        key={`${o.date}|${o.periodId}`}
                        type="button"
                        className={`btn sm ${active ? 'primary' : ''}`}
                        onClick={() => {
                          setDate(o.date);
                          setPeriodId(o.periodId);
                        }}
                      >
                        <CalendarCheck2 size={14} />
                        {fmt(o.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {o.label.replace('Period ', 'P')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="rs-date">New date</label>
                  <input
                    id="rs-date"
                    type="date"
                    className="input"
                    min={todayISO()}
                    max={addDays(todayISO(), DAYS_AHEAD)}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="rs-period">Period</label>
                  {dayOptions.length ? (
                    <select
                      id="rs-period"
                      className="select"
                      value={periodId}
                      onChange={(e) => setPeriodId(e.target.value)}
                    >
                      {dayOptions.map((o) => (
                        <option key={o.periodId} value={o.periodId}>
                          {o.label} ({o.start}–{o.end}) · {o.kind === 'free' ? 'free period' : 'class period'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="small" style={{ color: 'var(--st-partial)', paddingTop: 8 }}>
                      No free periods on this day. Pick another day.
                    </p>
                  )}
                </div>
              </div>
            </>
          ))}

        <div className="field">
          <label htmlFor="rs-reason">Reason</label>
          <textarea
            id="rs-reason"
            className="textarea"
            style={{ minHeight: 64 }}
            placeholder={mode === 'reschedule' ? 'e.g. Sports day practice' : 'e.g. Topic removed from this term'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <p className="faint">
          The original lesson is kept in History{mode === 'reschedule' ? ' and shows where it was moved to.' : '.'}
        </p>
      </div>
    </Modal>
  );
}