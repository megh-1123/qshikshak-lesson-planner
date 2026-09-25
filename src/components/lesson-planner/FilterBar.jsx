import { Search, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { STATUS_META } from '@/utils/constants';

/**
 * Reusable filters. `show` picks which ones to render:
 *   ['search','class','section','subject','teacher','status','from','to']
 */
export default function FilterBar({
  value,
  onChange,
  show = ['search', 'class', 'section', 'subject', 'status', 'from', 'to'],
}) {
  const { masters, sectionsOf } = useApp();
  const set = (k, v) => onChange({ ...value, [k]: v, ...(k === 'classId' ? { sectionId: '' } : {}) });
  const has = (k) => show.includes(k);
  const active = Object.values(value).some(Boolean);

  return (
    <div className="filter-bar">
      {has('search') && (
        <div className="field search">
          <label htmlFor="fb-q">Search</label>
          <Search size={16} />
          <input
            id="fb-q"
            className="input"
            placeholder="Topic or chapter"
            value={value.q || ''}
            onChange={(e) => set('q', e.target.value)}
          />
        </div>
      )}
      {has('class') && (
        <div className="field">
          <label htmlFor="fb-class">Class</label>
          <select
            id="fb-class"
            className="select"
            value={value.classId || ''}
            onChange={(e) => set('classId', e.target.value)}
          >
            <option value="">All classes</option>
            {masters.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {has('section') && (
        <div className="field">
          <label htmlFor="fb-section">Section</label>
          <select
            id="fb-section"
            className="select"
            value={value.sectionId || ''}
            onChange={(e) => set('sectionId', e.target.value)}
            disabled={!value.classId}
          >
            <option value="">All sections</option>
            {value.classId &&
              sectionsOf(value.classId).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
      )}
      {has('subject') && (
        <div className="field">
          <label htmlFor="fb-subject">Subject</label>
          <select
            id="fb-subject"
            className="select"
            value={value.subjectId || ''}
            onChange={(e) => set('subjectId', e.target.value)}
          >
            <option value="">All subjects</option>
            {masters.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {has('teacher') && (
        <div className="field">
          <label htmlFor="fb-teacher">Teacher</label>
          <select
            id="fb-teacher"
            className="select"
            value={value.teacherId || ''}
            onChange={(e) => set('teacherId', e.target.value)}
          >
            <option value="">All teachers</option>
            {masters.staff
              .filter((s) => s.role === 'teacher')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
      )}
      {has('status') && (
        <div className="field">
          <label htmlFor="fb-status">Status</label>
          <select
            id="fb-status"
            className="select"
            value={value.status || ''}
            onChange={(e) => set('status', e.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_META)
              .filter(([k]) => k !== 'empty')
              .map(([k, m]) => (
                <option key={k} value={k}>
                  {m.label}
                </option>
              ))}
          </select>
        </div>
      )}
      {has('from') && (
        <div className="field">
          <label htmlFor="fb-from">From</label>
          <input
            id="fb-from"
            type="date"
            className="input"
            value={value.from || ''}
            onChange={(e) => set('from', e.target.value)}
          />
        </div>
      )}
      {has('to') && (
        <div className="field">
          <label htmlFor="fb-to">To</label>
          <input
            id="fb-to"
            type="date"
            className="input"
            value={value.to || ''}
            onChange={(e) => set('to', e.target.value)}
          />
        </div>
      )}
      {active && (
        <button className="btn ghost sm" onClick={() => onChange({})} style={{ marginBottom: 4 }}>
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}
