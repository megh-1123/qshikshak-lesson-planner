import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarPlus, ClipboardList } from 'lucide-react';
import Card from '@/components/common/Card';
import ProgressBar from '@/components/common/ProgressBar';
import { PlanStatusBadge } from '@/components/common/StatusBadge';
import { Tabs } from '@/components/common/Tabs';
import EmptyState, { Loader } from '@/components/common/EmptyState';
import { useApp } from '@/context/AppContext';
import { useApi } from '@/hooks/useApi';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { fmt } from '@/utils/date';

const TABS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'submitted', label: 'Waiting for HOD' },
  { value: 'returned', label: 'Sent back' },
  { value: 'approved', label: 'Approved' },
];

export default function PlansPage() {
  const { user, role } = useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const { data, loading } = useApi(
    () => lessonPlannerApi.getPlans({ userId: user.id, role, status }),
    [user.id, role, status],
  );

  return (
    <>
      <div className="row-between">
        <p className="muted">
          {role === 'teacher' ? 'Your weekly plans for each class and subject.' : 'Plans from all teachers.'}
        </p>
        {role === 'teacher' && (
          <button className="btn primary" onClick={() => navigate('/lesson-planner/plans/new')}>
            <CalendarPlus size={16} /> Create plan
          </button>
        )}
      </div>
      <Tabs tabs={TABS} value={status} onChange={setStatus} />
      {loading && !data ? (
        <Loader />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No plans here"
            text={
              role === 'teacher'
                ? 'Create a plan and the system fills your timetable periods with syllabus topics.'
                : 'Plans appear here once teachers create them.'
            }
            action={
              role === 'teacher' && (
                <button className="btn primary" onClick={() => navigate('/lesson-planner/plans/new')}>
                  Create plan
                </button>
              )
            }
          />
        </Card>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {data.map((p) => (
            <Card
              key={p.id}
              className="plan-card"
              onClick={() => navigate(`/lesson-planner/plans/${p.id}`)}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/lesson-planner/plans/${p.id}`)}
            >
              <div className="icon">
                <ClipboardList size={22} />
              </div>
              <div className="stack" style={{ gap: 6, minWidth: 0 }}>
                <div className="row">
                  <span className="strong">
                    {p.classLabel} · {p.subjectName}
                  </span>
                  <span className="faint">
                    {fmt(p.startDate)} – {fmt(p.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {role !== 'teacher' && <span className="faint">{p.teacherName}</span>}
                </div>
                <div style={{ maxWidth: 360 }}>
                  <ProgressBar value={p.total ? (p.completed / p.total) * 100 : 0} />
                </div>
                {p.missingDetails > 0 && ['draft', 'returned'].includes(p.status) && (
                  <span className="small row" style={{ gap: 6, color: 'var(--st-partial)' }}>
                    <AlertCircle size={14} /> {p.missingDetails} lesson{p.missingDetails > 1 ? 's need' : ' needs'}{' '}
                    details
                  </span>
                )}
              </div>
              <PlanStatusBadge status={p.status} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
