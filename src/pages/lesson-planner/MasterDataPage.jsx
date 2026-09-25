import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import Card from '@/components/common/Card';
import { readFeatureStore, updateFeatureStore, uid } from '@/services/featureStore';
import { useDialog } from '@/context/DialogContext';
import './MasterDataPage.css';

export default function MasterDataPage() {
  const dialog = useDialog();
  const [data, setData] = useState(readFeatureStore);
  const [tab, setTab] = useState('classes');
  const [query, setQuery] = useState('');
  const [classId, setClassId] = useState('class-8');
  const refresh = (fn) => setData(updateFeatureStore(fn));
  const list = useMemo(
    () =>
      (data[tab] || []).filter(
        (x) =>
          (!query || (x.name || '').toLowerCase().includes(query.toLowerCase())) &&
          (tab === 'classes' || !classId || x.classId === classId),
      ),
    [data, tab, query, classId],
  );

  // 'class' | 'section' | 'subject' – used in button text and dialogs
  const kind = tab === 'classes' ? 'class' : tab === 'sections' ? 'section' : 'subject';

  const add = async () => {
    const name = await dialog.prompt({
      title: `Add ${kind}`,
      label: `${kind[0].toUpperCase() + kind.slice(1)} name`,
      confirmLabel: 'Add',
    });
    if (!name?.trim()) return;
    refresh((s) => {
      s[tab].push({ id: uid(tab.slice(0, -1)), name: name.trim(), ...(tab !== 'classes' ? { classId } : {}) });
      return s;
    });
  };

  const edit = async (item) => {
    const name = await dialog.prompt({
      title: `Edit ${kind}`,
      label: 'Name',
      defaultValue: item.name,
      confirmLabel: 'Save',
    });
    if (!name?.trim()) return;
    refresh((s) => {
      const row = s[tab].find((x) => x.id === item.id);
      if (row) row.name = name.trim();
      return s;
    });
  };

  const remove = async (item) => {
    const ok = await dialog.confirm({
      title: `Delete ${kind}?`,
      message:
        tab === 'classes'
          ? `"${item.name}" and all its sections and subjects will be deleted.`
          : `"${item.name}" will be deleted.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    refresh((s) => {
      s[tab] = s[tab].filter((x) => x.id !== item.id);
      if (tab === 'classes') {
        s.sections = s.sections.filter((x) => x.classId !== item.id);
        s.subjects = s.subjects.filter((x) => x.classId !== item.id);
      }
      return s;
    });
  };

  return (
    <div className="master-data-page stack">
      <div className="page-heading">
        <div>
          <h2>Classes, Sections & Subjects</h2>
          <p className="muted">Manage frontend master data used by Lesson Planner.</p>
        </div>
      </div>
      <div className="seg-tabs">
        {['classes', 'sections', 'subjects'].map((x) => (
          <button key={x} className={tab === x ? 'active' : ''} onClick={() => setTab(x)}>
            {x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>
      <Card>
        <div className="master-toolbar">
          <label className="search master-search">
            <Search size={16} />
            <input
              className="input"
              placeholder={`Search ${tab}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {tab !== 'classes' && (
            <select className="select" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {data.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button className="btn primary" onClick={add}>
            <Plus size={16} /> Add {kind}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                {tab !== 'classes' && <th>Class</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id}>
                  <td className="strong">{item.name}</td>
                  {tab !== 'classes' && <td>{data.classes.find((c) => c.id === item.classId)?.name}</td>}
                  <td>
                    <div className="actions">
                      <button className="icon-btn" onClick={() => edit(item)} aria-label={`Edit ${item.name}`}>
                        <Pencil size={16} />
                      </button>
                      <button className="icon-btn" onClick={() => remove(item)} aria-label={`Delete ${item.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && <p className="empty-inline">No matching {tab}.</p>}
      </Card>
    </div>
  );
}