import { useEffect, useState } from 'react';
import { BookCopy, Link2, Paperclip, Plus, PlusCircle, Sparkles, Trash2 } from 'lucide-react';
import Modal from '@/components/common/Modal';
import { Loader } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import TimePlanBar from './TimePlanBar';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { useToast } from '@/context/ToastContext';
import { TEACHING_METHODS, periodById } from '@/utils/constants';
import { fmtLong, groupBy } from '@/utils/date';

const periodMinutes = (periodId) => {
  const p = periodById(periodId);
  const [h1, m1] = p.start.split(':').map(Number);
  const [h2, m2] = p.end.split(':').map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
};

export default function LessonForm({ open, item, onClose, onSaved, onAddPeriods }) {
  const toast = useToast();
  const [meta, setMeta] = useState(null); // { template, topics }
  const [details, setDetails] = useState(null);
  const [topicId, setTopicId] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [library, setLibrary] = useState(null);
  const [linkDraft, setLinkDraft] = useState({ name: '', url: '' });

  useEffect(() => {
    if (!open || !item) return;
    setDetails({ objectives: [], resources: [], timePlan: [], ...item.details });
    setTopicId(item.topicId);
    setLibrary(null);
    lessonPlannerApi.getPlan(item.planId).then((r) => setMeta({ template: r.data.template, topics: r.data.topics }));
  }, [open, item]);

  if (!open || !item) return null;
  const set = (k, v) => setDetails((d) => ({ ...d, [k]: v }));
  const fields = meta?.template.fields.filter((f) => f.enabled) || [];
  const topicTitle = meta?.topics.find((t) => t.id === topicId)?.title || item.topicTitle;

  const suggest = async () => {
    setAiBusy(true);
    try {
      const { data } = await lessonPlannerApi.aiSuggest({ topicTitle, minutes: periodMinutes(item.periodId) });
      setDetails((d) => ({
        ...d,
        objectives: d.objectives?.length ? d.objectives : data.objectives,
        method: d.method || data.method,
        activities: d.activities || data.activities,
        assessment: d.assessment || data.assessment,
        homework: d.homework || data.homework,
        timePlan: data.timePlan,
      }));
      toast('Suggestions added. Review and edit before saving.', 'info');
    } finally {
      setAiBusy(false);
    }
  };

  const openLibrary = async () => {
    const r = await lessonPlannerApi.getLibrary({ topicId });
    setLibrary(r.data.filter((l) => l.id !== item.id));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await lessonPlannerApi.updateItem(item.id, {
        details,
        topicId: topicId !== item.topicId ? topicId : undefined,
      });
      toast('Lesson saved');
      if (res.data.planStatusChanged) toast('Plan moved back to draft. Submit it again for approval.', 'info');
      onSaved?.(res.data.item);
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (f) => {
    const req = f.required && <span style={{ color: 'var(--st-notdone)' }}> *</span>;
    switch (f.type) {
      case 'list': {
        const list = details.objectives || [];
        return (
          <div key={f.key} className="field full">
            <span className="field-label">
              {f.label}
              {req}
            </span>
            {list.map((o, i) => (
              <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
                <input
                  className="input"
                  value={o}
                  onChange={(e) =>
                    set(
                      'objectives',
                      list.map((x, k) => (k === i ? e.target.value : x)),
                    )
                  }
                  aria-label={`Objective ${i + 1}`}
                />
                <button
                  className="icon-btn"
                  onClick={() =>
                    set(
                      'objectives',
                      list.filter((_, k) => k !== i),
                    )
                  }
                  aria-label="Remove objective"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              className="btn ghost sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => set('objectives', [...list, ''])}
            >
              <Plus size={14} /> Add objective
            </button>
          </div>
        );
      }
      case 'method':
        return (
          <div key={f.key} className="field">
            <label htmlFor="lf-method">
              {f.label}
              {req}
            </label>
            <select
              id="lf-method"
              className="select"
              value={details.method || ''}
              onChange={(e) => set('method', e.target.value)}
            >
              <option value="">Choose a method</option>
              {TEACHING_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        );
      case 'resources': {
        const list = details.resources || [];
        return (
          <div key={f.key} className="field full">
            <span className="field-label">{f.label}</span>
            {list.map((r, i) => (
              <div key={i} className="row small" style={{ flexWrap: 'nowrap' }}>
                {r.type === 'file' ? <Paperclip size={15} /> : <Link2 size={15} />}
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                    {r.name}
                  </a>
                ) : (
                  <span style={{ flex: 1 }}>{r.name}</span>
                )}
                <button
                  className="icon-btn"
                  onClick={() =>
                    set(
                      'resources',
                      list.filter((_, k) => k !== i),
                    )
                  }
                  aria-label="Remove resource"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                className="input"
                placeholder="Name, e.g. Force chapter PPT"
                value={linkDraft.name}
                onChange={(e) => setLinkDraft({ ...linkDraft, name: e.target.value })}
              />
              <input
                className="input"
                placeholder="https://…"
                value={linkDraft.url}
                onChange={(e) => setLinkDraft({ ...linkDraft, url: e.target.value })}
              />
              <button
                className="btn sm"
                disabled={!linkDraft.name}
                onClick={() => {
                  set('resources', [...list, { type: 'link', ...linkDraft }]);
                  setLinkDraft({ name: '', url: '' });
                }}
              >
                Add link
              </button>
            </div>
            <label className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
              <Paperclip size={14} /> Attach file
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) set('resources', [...list, { type: 'file', name: file.name }]);
                }}
              />
            </label>
          </div>
        );
      }
      case 'textarea':
        return (
          <div key={f.key} className="field full">
            <label htmlFor={`lf-${f.key}`}>
              {f.label}
              {req}
            </label>
            <textarea
              id={`lf-${f.key}`}
              className="textarea"
              value={details[f.key] || ''}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        );
      default:
        return (
          <div key={f.key} className="field">
            <label htmlFor={`lf-${f.key}`}>
              {f.label}
              {req}
            </label>
            <input
              id={`lf-${f.key}`}
              className="input"
              value={details[f.key] || ''}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        );
    }
  };

  const editable = item.status === 'planned';

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="drawer"
      width={620}
      title={topicTitle}
      subtitle={`${item.classLabel} · ${item.subjectName} · ${fmtLong(item.date)} · ${item.periodLabel} (${item.start}–${item.end})`}
      footer={
        editable && (
          <>
            <button className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save lesson'}
            </button>
            {onAddPeriods && (
              <button className="btn" style={{ marginRight: 'auto' }} onClick={() => onAddPeriods(item)}>
                <PlusCircle size={15} /> Add periods
              </button>
            )}
          </>
        )
      }
    >
      {!meta || !details ? (
        <Loader />
      ) : (
        <div className="stack" style={{ gap: 18 }}>
          <div className="row-between">
            <StatusBadge status={item.status} />
            {editable && (
              <div className="row">
                <button className="btn sm" onClick={openLibrary}>
                  <BookCopy size={14} /> Copy from library
                </button>
                <button className="btn primary sm" onClick={suggest} disabled={aiBusy}>
                  <Sparkles size={14} /> {aiBusy ? 'Thinking…' : 'Suggest with AI'}
                </button>
              </div>
            )}
          </div>
          {details.prefilledFrom && (
            <p className="faint">Pre-filled from an earlier lesson on this topic. Edit anything you like.</p>
          )}

          {library && (
            <div className="card" style={{ background: 'var(--primary-50)', boxShadow: 'none' }}>
              <div className="row-between" style={{ marginBottom: 8 }}>
                <span className="strong small">Earlier lessons on “{topicTitle}”</span>
                <button className="btn ghost sm" onClick={() => setLibrary(null)}>
                  Close
                </button>
              </div>
              {library.length === 0 && <p className="faint">No saved lessons for this topic yet.</p>}
              {library.map((l) => (
                <div key={l.id} className="row-between" style={{ padding: '6px 0' }}>
                  <span className="small">
                    {l.teacherName} · {l.classLabel} · {l.details.method}
                  </span>
                  <button
                    className="btn sm"
                    onClick={() => {
                      setDetails({ ...l.details });
                      setLibrary(null);
                      toast('Lesson copied. Edit and save.', 'info');
                    }}
                  >
                    Use this
                  </button>
                </div>
              ))}
            </div>
          )}

          <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: 0 }}>
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="lf-topic">Chapter and topic</label>
                <select id="lf-topic" className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                  {Object.entries(groupBy(meta.topics, (t) => t.chapterTitle)).map(([ch, list]) => (
                    <optgroup key={ch} label={ch}>
                      {list.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {fields.map(renderField)}
            </div>
          </fieldset>

          {details.timePlan?.length > 0 && (
            <div className="field">
              <span className="field-label">Time plan</span>
              <TimePlanBar plan={details.timePlan} />
            </div>
          )}
          {!editable && (
            <p className="faint">This lesson is {item.status.replace('_', ' ')}, so it can no longer be edited.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
