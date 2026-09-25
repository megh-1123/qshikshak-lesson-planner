import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import Card from '@/components/common/Card';
import Switch from '@/components/common/Switch';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { useDialog } from '@/context/DialogContext';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsPage() {
  const { masters, loadMasters, loadNotifications, staffName } = useApp();
  const toast = useToast();
  const dialog = useDialog();
  const [s, setS] = useState(masters.settings);
  const [tplId, setTplId] = useState(masters.templates[0].id);
  const [tpl, setTpl] = useState(masters.templates[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTpl(structuredClone(masters.templates.find((t) => t.id === tplId)));
  }, [tplId, masters.templates]);
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));

  const saveAll = async () => {
    setBusy(true);
    try {
      await lessonPlannerApi.saveSettings(s);
      await lessonPlannerApi.saveTemplate(tpl);
      await loadMasters();
      toast('Settings saved');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = async () => {
    const ok = await dialog.confirm({
      title: 'Reset demo data?',
      message: 'All demo data goes back to the start. Plans you created will be removed.',
      confirmLabel: 'Reset',
      danger: true,
    });
    if (!ok) return;
    await lessonPlannerApi.resetDemo();
    await loadMasters();
    await loadNotifications();
    toast('Demo data reset');
  };

  return (
    <>
      <div className="row-between">
        <p className="muted">These rules apply to every teacher in this school and academic year.</p>
        <button className="btn primary" onClick={saveAll} disabled={busy}>
          <Save size={16} /> {busy ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      <div className="grid-2">
        <Card title="Approval">
          <Switch
            label="HOD approval needed"
            hint="Plans must be approved before the week starts"
            checked={s.approvalRequired}
            onChange={(v) => set('approvalRequired', v)}
          />
          <div className="form-grid" style={{ marginTop: 8 }}>
            <div className="field">
              <label htmlFor="st-day">Submit plans by</label>
              <select
                id="st-day"
                className="select"
                value={s.submissionDay}
                onChange={(e) => set('submissionDay', e.target.value)}
              >
                {DAYS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="st-edit">Editing an approved plan</label>
              <select
                id="st-edit"
                className="select"
                value={s.editAfterApproval}
                onChange={(e) => set('editAfterApproval', e.target.value)}
              >
                <option value="reapprove">Needs approval again</option>
                <option value="allow">Allowed without approval</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="Automation">
          <Switch
            label="Auto-shift missed lessons"
            hint="Move later topics forward when a class is missed or partly done"
            checked={s.autoShift}
            onChange={(v) => set('autoShift', v)}
          />
          <Switch
            label="Skip holidays"
            hint="From the Events module"
            checked={s.skipHolidays}
            onChange={(v) => set('skipHolidays', v)}
          />
          <Switch
            label="Skip exam days"
            hint="From the Assessments module"
            checked={s.skipExams}
            onChange={(v) => set('skipExams', v)}
          />
          <div className="field" style={{ marginTop: 8, maxWidth: 220 }}>
            <label htmlFor="st-rem">Daily reminder for unmarked lessons</label>
            <input
              id="st-rem"
              type="time"
              className="input"
              value={s.dailyReminderTime}
              onChange={(e) => set('dailyReminderTime', e.target.value)}
            />
          </div>
        </Card>

        <Card title="Parents">
          <Switch
            label="Send homework on WhatsApp"
            hint={
              masters.settings.whatsappHomework
                ? 'Uses the WhatsApp integration in Profile settings'
                : 'Connect WhatsApp in Profile settings first'
            }
            checked={s.whatsappHomework}
            onChange={(v) => set('whatsappHomework', v)}
          />
        </Card>

        <Card title="Departments and HODs">
          <div className="stack">
            {masters.departments.map((d) => (
              <div key={d.id} className="row-between small">
                <span className="strong">{d.name}</span>
                <span className="muted">{staffName(d.hodId)}</span>
              </div>
            ))}
            <p className="faint">Managed in Master › Departments.</p>
          </div>
        </Card>

        <Card title="Lesson templates" className="span-2">
          <div className="row" style={{ marginBottom: 14, alignItems: 'flex-end' }}>
            <div className="field" style={{ width: 260 }}>
              <label htmlFor="st-tpl">Template</label>
              <select id="st-tpl" className="select" value={tplId} onChange={(e) => setTplId(e.target.value)}>
                {masters.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.board}){t.isDefault ? ' – default' : ''}
                  </option>
                ))}
              </select>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={!!tpl?.isDefault}
                onChange={(e) => setTpl({ ...tpl, isDefault: e.target.checked })}
              />
              Use as default
            </label>
          </div>
          {tpl && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Show</th>
                    <th>Required</th>
                  </tr>
                </thead>
                <tbody>
                  {tpl.fields.map((f, i) => (
                    <tr key={f.key}>
                      <td>{f.label}</td>
                      <td>
                        <input
                          type="checkbox"
                          style={{ accentColor: 'var(--primary)' }}
                          checked={f.enabled}
                          aria-label={`Show ${f.label}`}
                          onChange={(e) =>
                            setTpl({
                              ...tpl,
                              fields: tpl.fields.map((x, k) => (k === i ? { ...x, enabled: e.target.checked } : x)),
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          style={{ accentColor: 'var(--primary)' }}
                          checked={f.required}
                          disabled={!f.enabled}
                          aria-label={`Require ${f.label}`}
                          onChange={(e) =>
                            setTpl({
                              ...tpl,
                              fields: tpl.fields.map((x, k) => (k === i ? { ...x, required: e.target.checked } : x)),
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Demo data" className="span-2">
          <div className="row-between">
            <p className="small muted">
              The frontend is running on mock data (VITE_USE_MOCK=true). Reset it to the starting state.
            </p>
            <button className="btn danger" onClick={resetDemo}>
              <RotateCcw size={16} /> Reset demo data
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}