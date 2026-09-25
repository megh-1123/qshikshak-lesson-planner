import { useState } from 'react';
import { CheckCircle2, Plus, Pencil, Trash2 } from 'lucide-react';
import Card from '@/components/common/Card';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { readFeatureStore, updateFeatureStore, uid } from '@/services/featureStore';
import './HomeworkPage.css';

const blank = {
  title: '',
  description: '',
  dueDate: '',
  classId: 'class-8',
  subject: 'Science',
  lesson: '',
  complete: false,
};

export default function HomeworkPage() {
  const dialog = useDialog();
  const { role } = useApp();
  const [data, setData] = useState(readFeatureStore);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const refresh = (fn) => setData(updateFeatureStore(fn));
  const save = () => {
    if (!form.title || !form.dueDate) return;
    refresh((s) => {
      if (editing)
        Object.assign(
          s.homework.find((x) => x.id === editing),
          form,
        );
      else s.homework.push({ id: uid('hw'), ...form });
      return s;
    });
    setEditing(null);
    setForm(blank);
  };
  return (
    <div className="homework-page stack">
      <div className="page-heading">
        <div>
          <h2>{role === 'parent' ? 'Homework' : 'Homework Management'}</h2>
          <p className="muted">
            {role === 'parent'
              ? 'View assigned homework and due dates.'
              : 'Attach homework to lessons and manage completion.'}
          </p>
        </div>
      </div>
      {role !== 'parent' && (
        <Card title={editing ? 'Edit homework' : 'Add homework'}>
          <div className="form-grid hw-form">
            <label className="field">
              <span>Homework Title</span>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Due Date</span>
              <input
                className="input"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Class</span>
              <select
                className="select"
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
              >
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Subject</span>
              <input
                className="input"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Lesson</span>
              <input
                className="input"
                value={form.lesson}
                onChange={(e) => setForm({ ...form, lesson: e.target.value })}
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
          </div>
          <div className="actions">
            <button className="btn primary" onClick={save}>
              <Plus size={16} />
              {editing ? 'Update' : 'Add'} Homework
            </button>
            {editing && (
              <button
                className="btn"
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </Card>
      )}
      <div className="homework-grid">
        {data.homework.map((h) => (
          <Card key={h.id} className={h.complete ? 'hw-done' : ''}>
            <div className="row-between">
              <div>
                <div className="strong">{h.title}</div>
                <div className="small muted">
                  {data.classes.find((c) => c.id === h.classId)?.name} · {h.subject} · Due {h.dueDate}
                </div>
              </div>
              {h.complete && <CheckCircle2 size={20} />}
            </div>
            <p>{h.description}</p>
            <div className="small muted">Lesson: {h.lesson || '—'}</div>
            {role !== 'parent' && (
              <div className="actions hw-actions">
                <button
                  className="btn sm"
                  onClick={() =>
                    refresh((s) => {
                      const x = s.homework.find((x) => x.id === h.id);
                      x.complete = !x.complete;
                      return s;
                    })
                  }
                >
                  {h.complete ? 'Mark Pending' : 'Mark Complete'}
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Edit ${h.title}`}
                  onClick={() => {
                    setEditing(h.id);
                    setForm({ ...h });
                  }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Delete ${h.title}`}
                  onClick={async () =>
                    (await dialog.confirm({
                      title: 'Delete homework?',
                      message: `"${h.title}" will be deleted.`,
                      confirmLabel: 'Delete',
                      danger: true,
                    })) &&
                    refresh((s) => {
                      s.homework = s.homework.filter((x) => x.id !== h.id);
                      return s;
                    })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}