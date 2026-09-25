import { useState } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import Card from '@/components/common/Card';
import { Ring } from '@/components/common/ProgressBar';
import { Tabs } from '@/components/common/Tabs';
import EmptyState, { Loader } from '@/components/common/EmptyState';
import ProgressBars from '@/components/lesson-planner/ProgressBars';
import FilterBar from '@/components/lesson-planner/FilterBar';
import { useApp } from '@/context/AppContext';
import { useApi } from '@/hooks/useApi';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { exportToExcel, exportToPdf } from '@/utils/exportFile';
import { BarChart3 } from 'lucide-react';

function Coverage() {
  const { user, role } = useApp();
  const [filters, setFilters] = useState({});
  const { data, loading } = useApi(
    () => lessonPlannerApi.getCoverage({ sectionId: filters.sectionId, subjectId: filters.subjectId }),
    [filters.sectionId, filters.subjectId],
  );
  if (loading && !data) return <Loader />;
  const rows = role === 'teacher' ? data.filter((r) => r.teacherName === user.name) : data;

  const exportRows = () =>
    exportToExcel(
      rows.flatMap((r) =>
        r.chapters.map((c, i) => ({
          Class: r.classLabel,
          Subject: r.subjectName,
          Teacher: r.teacherName,
          Chapter: `${i + 1}. ${c.title}`,
          Term: c.term,
          'Completed %': c.percent,
          'Overall %': r.overall,
        })),
      ),
      'syllabus-coverage.xlsx',
      'Coverage',
    );

  return (
    <>
      <Card className="no-print">
        <div className="row-between" style={{ alignItems: 'flex-end' }}>
          <FilterBar value={filters} onChange={setFilters} show={['class', 'section', 'subject']} />
          <div className="row">
            <button className="btn sm" onClick={exportRows}>
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button className="btn sm" onClick={exportToPdf}>
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>
      </Card>
      {rows.length === 0 && (
        <Card>
          <EmptyState icon={BarChart3} title="No data for these filters" />
        </Card>
      )}
      <div className="grid-2">
        {rows.map((r) => (
          <Card
            key={`${r.sectionId}-${r.subjectId}`}
            title={`${r.subjectName} – ${r.classLabel}`}
            actions={<span className="faint">{r.teacherName}</span>}
          >
            {!r.hasSyllabus ? (
              <p className="faint">No syllabus added yet.</p>
            ) : (
              <div className="row" style={{ alignItems: 'flex-start', gap: 24, flexWrap: 'nowrap' }}>
                <Ring value={r.overall} label="Overall" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ProgressBars chapters={r.chapters} />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

function Teachers() {
  const { data, loading } = useApi(() => lessonPlannerApi.getTeacherReport(), []);
  if (loading && !data) return <Loader />;
  const exportRows = () =>
    exportToExcel(
      data.map((t) => ({
        Teacher: t.name,
        Department: t.department,
        Lessons: t.planned,
        Completed: t.completed,
        'Partly done': t.partial,
        'Not done': t.notDone,
        Cancelled: t.cancelled,
        'Completion %': t.completionRate,
        'Approval %': t.approvalRate,
        'Next week plans': t.nextWeek,
        'Not marked': t.pendingMarking,
      })),
      'teacher-report.xlsx',
      'Teachers',
    );
  const tone = (v) => (v >= 80 ? 'var(--st-completed)' : v >= 60 ? 'var(--st-partial)' : 'var(--st-notdone)');
  return (
    <Card
      className="flush"
      title="Teacher performance"
      actions={
        <>
          <button className="btn sm" onClick={exportRows}>
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button className="btn sm" onClick={exportToPdf}>
            <Printer size={14} /> PDF
          </button>
        </>
      }
    >
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Lessons so far</th>
              <th>Completed</th>
              <th>Partly</th>
              <th>Not done</th>
              <th>Completion</th>
              <th>Approval rate</th>
              <th>Next week planned</th>
              <th>Not marked</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id}>
                <td>
                  <span className="strong">{t.name}</span>
                  <br />
                  <span className="faint">{t.department}</span>
                </td>
                <td>{t.planned}</td>
                <td>{t.completed}</td>
                <td>{t.partial}</td>
                <td>{t.notDone}</td>
                <td>
                  <span className="strong" style={{ color: tone(t.completionRate) }}>
                    {t.completionRate}%
                  </span>
                </td>
                <td>{t.approvalRate}%</td>
                <td>{t.nextWeek}</td>
                <td style={{ color: t.pendingMarking ? 'var(--st-notdone)' : undefined }}>{t.pendingMarking}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const { role } = useApp();
  const [tab, setTab] = useState('coverage');
  const tabs = [
    { value: 'coverage', label: 'Syllabus coverage' },
    ...(role !== 'teacher' ? [{ value: 'teachers', label: 'Teachers' }] : []),
  ];
  return (
    <>
      <div className="no-print">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>
      {tab === 'coverage' ? <Coverage /> : <Teachers />}
    </>
  );
}
