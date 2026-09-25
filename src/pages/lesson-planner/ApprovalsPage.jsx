import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Info } from 'lucide-react';
import Card from '@/components/common/Card';
import { PlanStatusBadge } from '@/components/common/StatusBadge';
import { Tabs } from '@/components/common/Tabs';
import EmptyState, { Loader } from '@/components/common/EmptyState';
import { useApp } from '@/context/AppContext';
import { useApi } from '@/hooks/useApi';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { fmt } from '@/utils/date';

export default function ApprovalsPage() {
  const { user, role } = useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState('submitted');
  const { data, loading } = useApi(() => lessonPlannerApi.getPlans({ userId: user.id, role, status }), [status]);
  const { data: waiting } = useApi(() => lessonPlannerApi.getPlans({ userId: user.id, role, status: 'submitted' }), []);

  // Days since the teacher submitted – plans waiting 2+ days are highlighted
  const daysWaiting = (iso) => (iso ? Math.floor((Date.now() - new Date(iso)) / 86400000) : 0);

  return (
    <>
      {role === 'principal' && (
        <div className="review-note">
          <Info size={16} />
          <span>
            Plans are normally approved by the HOD. When the HOD is busy, you can open a plan and approve or send it
            back. The HOD is informed every time.
          </span>
        </div>
      )}
      <div className="grid-3">
        <Card className="stat">
          <div className="stat-label">{role === 'principal' ? 'Waiting for approval' : 'Waiting for you'}</div>
          <div className="stat-value">{waiting?.length ?? '–'}</div>
          <span className="faint">plans to review</span>
        </Card>
      </div>
      <Tabs
        value={status}
        onChange={setStatus}
        tabs={[
          { value: 'submitted', label: 'Waiting' },
          { value: 'returned', label: 'Sent back' },
          { value: 'approved', label: 'Approved' },
        ]}
      />
      <Card className="flush">
        {loading && !data ? (
          <Loader />
        ) : data.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title={status === 'submitted' ? 'Nothing to review' : 'No plans here'}
            text={status === 'submitted' ? 'New plans appear here when teachers submit them.' : undefined}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Class</th>
                  <th>Dates</th>
                  <th>Lessons</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => navigate(`/lesson-planner/plans/${p.id}`)}>
                    <td className="strong">{p.teacherName}</td>
                    <td>
                      {p.classLabel}
                      <br />
                      <span className="faint">{p.subjectName}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {fmt(p.startDate)} – {fmt(p.endDate)}
                    </td>
                    <td>{p.total}</td>
                    <td>
                      {p.submittedAt
                        ? new Date(p.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '–'}
                      {p.status === 'submitted' && daysWaiting(p.submittedAt) >= 2 && (
                        <>
                          <br />
                          <span className="small waiting-long">Waiting {daysWaiting(p.submittedAt)} days</span>
                        </>
                      )}
                    </td>
                    <td>
                      <PlanStatusBadge status={p.status} />
                    </td>
                    <td>
                      <button className="btn sm">{p.status === 'submitted' ? 'Review' : 'Open'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}