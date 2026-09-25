import { useState } from 'react';
import { Plus, Pencil, Trash2, CalendarClock } from 'lucide-react';
import Card from '@/components/common/Card';
import Modal from '@/components/common/Modal';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { useApp } from '@/context/AppContext';
import { todayISO, fmtLong } from '@/utils/date';
import { readFeatureStore, updateFeatureStore, uid } from '@/services/featureStore';
import { getHolidayImpact, rescheduleLessonsForUnexpectedHoliday } from '@/services/holidayScheduler';
import './HolidaysPage.css';

const empty = { name: '', date: '', description: '', unexpected: false };

export default function HolidaysPage() {
  const toast = useToast();
  const dialog = useDialog();
  const { loadMasters, loadNotifications } = useApp();

  const [data, setData] = useState(readFeatureStore);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { holiday, impact }

  const refresh = (fn) => setData(updateFeatureStore(fn));
  const resetForm = () => {
    setForm(empty);
    setEditing(null);
  };

  // Save the holiday itself (add or edit). Returns the saved holiday.
  const storeHoliday = (values) => {
    const id = editing || uid('hol');
    refresh((s) => {
      const existing = s.holidays.find((x) => x.id === id);
      if (existing) Object.assign(existing, values);
      else s.holidays.push({ id, ...values });
      return s;
    });
    return { id, ...values };
  };

  const save = () => {
    if (!form.name.trim() || !form.date) {
      toast('Enter a holiday name and date.', 'error');
      return;
    }
    const clash = data.holidays.find((h) => h.date === form.date && h.id !== editing);
    if (clash) {
      toast(`${form.date} is already a holiday (${clash.name}).`, 'error');
      return;
    }

    const before = editing ? data.holidays.find((h) => h.id === editing) : null;
    const dateChanged = !before || before.date !== form.date;
    const becameUnexpected = !before?.unexpected && form.unexpected;

    // Only shift lessons for a sudden holiday that is today or later,
    // and only when it is new / its date changed / it was just marked unexpected.
    const shouldExtend = form.unexpected && form.date >= todayISO() && (dateChanged || becameUnexpected);
    const impact = shouldExtend ? getHolidayImpact(form.date) : 0;

    if (shouldExtend && impact > 0) {
      setConfirm({ holiday: { ...form }, impact });
      return;
    }

    storeHoliday({ ...form });
    resetForm();
    loadMasters?.();
    toast(
      form.unexpected && shouldExtend
        ? 'Holiday added. No lessons were planned on that day.'
        : `Holiday ${editing ? 'updated' : 'added'}.`,
    );
  };

  // Confirmed: save holiday, then push the lessons forward
  const confirmExtend = () => {
    const saved = storeHoliday(confirm.holiday);
    const result = rescheduleLessonsForUnexpectedHoliday(saved);

    refresh((s) => {
      const h = s.holidays.find((x) => x.id === saved.id);
      if (h) {
        h.movedCount = result.movedCount;
        h.affectedCount = result.affectedCount;
      }
      return s;
    });

    setConfirm(null);
    resetForm();
    loadMasters?.();
    loadNotifications?.();

    if (result.movedCount < result.affectedCount) {
      toast(
        `${result.affectedCount} lessons affected, but only ${result.movedCount} lesson moves fit in the timetable. Check the plans.`,
        'error',
      );
    } else {
      toast(
        `${result.affectedCount} lesson${result.affectedCount === 1 ? '' : 's'} extended – ${result.movedCount} period${result.movedCount === 1 ? '' : 's'} shifted forward. Teachers and HODs were notified.`,
      );
    }
  };

  const edit = (h) => {
    setEditing(h.id);
    setForm({ name: h.name, date: h.date, description: h.description || '', unexpected: !!h.unexpected });
  };

  const remove = async (h) => {
    const ok = await dialog.confirm({
      title: 'Delete holiday?',
      message: `"${h.name}" will be deleted.${h.movedCount ? '\nLessons already moved for this holiday will stay on their new dates.' : ''}`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    refresh((s) => {
      s.holidays = s.holidays.filter((x) => x.id !== h.id);
      return s;
    });
    loadMasters?.();
  };

  const sorted = [...data.holidays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="holidays-page stack">
      <div className="page-heading">
        <div>
          <h2>Holiday Management</h2>
          <p className="muted">
            Holiday dates are available to planning and examination calculations. Mark a holiday as sudden to extend
            classes instead of cancelling them.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <Card title={editing ? 'Edit holiday' : 'Add holiday'}>
          <div className="form-grid holiday-form">
            <label className="field">
              <span>Name</span>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field">
              <span>Date</span>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label className="field span-2">
              <span>Description</span>
              <textarea
                className="textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <label className="check span-2 unexpected-check">
              <input
                type="checkbox"
                checked={form.unexpected}
                onChange={(e) => setForm({ ...form, unexpected: e.target.checked })}
              />
              <span>
                <span className="strong">Sudden / unexpected holiday</span>
                <span className="small muted block">
                  Lessons planned on this day move to the next available period. Nothing is cancelled.
                </span>
              </span>
            </label>

            {form.unexpected && form.date && form.date >= todayISO() && (
              <div className="span-2 holiday-impact small">
                <CalendarClock size={15} />
                {getHolidayImpact(form.date)} planned lesson(s) on this date will be extended.
              </div>
            )}

            <div className="span-2 actions">
              <button className="btn primary" onClick={save}>
                <Plus size={16} />
                {editing ? 'Update' : 'Add'} Holiday
              </button>
              {editing && (
                <button className="btn" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </Card>

        <Card title="Configured holidays">
          <div className="holiday-list">
            {sorted.map((h) => (
              <div className="holiday-row" key={h.id}>
                <div>
                  <div className="strong">
                    {h.name}
                    {h.unexpected && (
                      <span className="badge unexpected-badge" style={{ '--c': 'var(--st-rescheduled)' }}>
                        Unexpected
                      </span>
                    )}
                  </div>
                  <div className="small muted">
                    {h.date} · {h.description || 'No description'}
                  </div>
                  {h.movedCount > 0 && (
                    <div className="small muted">
                      {h.affectedCount} lesson(s) extended · {h.movedCount} period(s) shifted
                    </div>
                  )}
                </div>
                <div className="actions">
                  <button className="icon-btn" onClick={() => edit(h)} aria-label="Edit">
                    <Pencil size={15} />
                  </button>
                  <button className="icon-btn" onClick={() => remove(h)} aria-label="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Extend classes for this holiday?"
        subtitle={confirm ? `${confirm.holiday.name} · ${fmtLong(confirm.holiday.date)}` : ''}
        width={520}
        footer={
          <>
            <button className="btn" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button className="btn primary" onClick={confirmExtend}>
              Declare holiday &amp; extend
            </button>
          </>
        }
      >
        {confirm && (
          <div className="stack" style={{ gap: 10 }}>
            <p>
              <span className="strong">
                {confirm.impact} planned lesson{confirm.impact === 1 ? '' : 's'}
              </span>{' '}
              fall on this day.
            </p>
            <p className="muted small">
              Each lesson moves to the next timetable period of the same class and subject. Later lessons shift forward
              in order, and a plan’s end date is extended if needed. The original entries are kept in history, and
              teachers and HODs get a notification.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}