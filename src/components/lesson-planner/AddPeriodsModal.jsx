import './AddPeriodsModal.css';
import { useEffect, useState } from 'react';
import Modal from '@/components/common/Modal';
import { Segmented } from '@/components/common/Tabs';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';

const COUNTS = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: `+${n}` }));
const MODES = [
  {
    value: 'shift',
    title: 'Next class periods',
    text: 'Extra periods come right after this lesson. Later topics move forward.',
  },
  {
    value: 'free',
    title: 'Free periods',
    text: 'Extra periods go into free periods (class and teacher both free). Nothing else moves.',
  },
];

/** Extend a class: give this topic more periods */
export default function AddPeriodsModal({ open, item, onClose, onDone }) {
  const toast = useToast();
  const { loadNotifications } = useApp();
  const [count, setCount] = useState(1);
  const [mode, setMode] = useState('shift');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCount(1);
      setMode('shift');
    }
  }, [open]);
  if (!open || !item) return null;

  const save = async () => {
    setBusy(true);
    try {
      const res = await lessonPlannerApi.addPeriods(item.id, { count, mode });
      toast(res.message);
      loadNotifications?.();
      onDone?.(res.data);
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
      width={500}
      title="Add periods"
      subtitle={`${item.topicTitle} · ${item.classLabel || ''}`}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={busy}>
            {busy ? 'Adding…' : `Add ${count} period${count > 1 ? 's' : ''}`}
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 18 }}>
        <div className="field">
          <span className="field-label">How many extra periods?</span>
          <Segmented options={COUNTS} value={count} onChange={setCount} />
        </div>
        <div className="field">
          <span className="field-label">Where should they go?</span>
          <div className="stack" style={{ gap: 8 }}>
            {MODES.map((m) => (
              <label key={m.value} className={`period-mode ${mode === m.value ? 'active' : ''}`}>
                <input type="radio" name="period-mode" checked={mode === m.value} onChange={() => setMode(m.value)} />
                <span>
                  <span className="strong">{m.title}</span>
                  <span className="small muted" style={{ display: 'block' }}>
                    {m.text}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
