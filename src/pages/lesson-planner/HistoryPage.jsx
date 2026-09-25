import { useState } from 'react';
import { ArrowLeft, ArrowRight, FileSpreadsheet, History as HistoryIcon, XCircle } from 'lucide-react';
import Card from '@/components/common/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import EmptyState, { Loader } from '@/components/common/EmptyState';
import FilterBar from '@/components/lesson-planner/FilterBar';
import { useLessonModals } from '@/components/lesson-planner/useLessonModals';
import { useApp } from '@/context/AppContext';
import { useApi } from '@/hooks/useApi';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { STATUS_META } from '@/utils/constants';
import { fmt } from '@/utils/date';
import { exportToExcel } from '@/utils/exportFile';

const short = (d) => fmt(d, { day: 'numeric', month: 'short' });

/** What happened to this lesson: moved to / moved from / cancelled / teacher's remark */
function LessonNote({ i }) {
  if (i.status === 'rescheduled' && i.movedTo)
    return (
      <div className="hist-note">
        <span className="hist-move to">
          <ArrowRight size={14} /> Moved to {short(i.movedTo.date)}, {i.movedTo.periodLabel}
        </span>
        {i.movedTo.reason && <span className="faint">{i.movedTo.reason}</span>}
      </div>
    );
  if (i.movedFrom)
    return (
      <div className="hist-note">
        <span className="hist-move from">
          <ArrowLeft size={14} /> Moved from {short(i.movedFrom.date)}, {i.movedFrom.periodLabel}
        </span>
        {i.movedFrom.reason && <span className="faint">{i.movedFrom.reason}</span>}
      </div>
    );
  if (i.status === 'cancelled')
    return (
      <div className="hist-note">
        <span className="hist-move cancel">
          <XCircle size={14} /> Cancelled
        </span>
        {i.cancelReason && <span className="faint">{i.cancelReason}</span>}
      </div>
    );
  if (i.completion?.remarks) return <span className="small">{i.completion.remarks}</span>;
  return <span className="faint">–</span>;
}

export default function HistoryPage() {
  const { user, role } = useApp();
  const [filters, setFilters] = useState({});
  const { data, loading, reload } = useApi(
    () => lessonPlannerApi.getHistory({ userId: user.id, role, ...filters }),
    [user.id, role, JSON.stringify(filters)],
  );
  const lm = useLessonModals(reload);
  const show = [
    'search',
    'class',
    'section',
    'subject',
    ...(role !== 'teacher' ? ['teacher'] : []),
    'status',
    'from',
    'to',
  ];

  const exportRows = () =>
    exportToExcel(
      data.map((i) => ({
        Date: i.date,
        Period: i.periodLabel,
        Class: i.classLabel,
        Subject: i.subjectName,
        Chapter: i.chapterTitle,
        Topic: i.topicTitle,
        Teacher: i.teacherName,
        Status: STATUS_META[i.status].label,
        Understanding: i.completion?.understanding || '',
        'Moved to': i.movedTo ? `${i.movedTo.date} ${i.movedTo.periodLabel}` : '',
        'Moved from': i.movedFrom ? `${i.movedFrom.date} ${i.movedFrom.periodLabel}` : '',
        'Reason / Remarks': i.movedTo?.reason || i.movedFrom?.reason || i.cancelReason || i.completion?.remarks || '',
      })),
      'lesson-history.xlsx',
      'History',
    );

  return (
    <>
      <Card>
        <FilterBar value={filters} onChange={setFilters} show={show} />
      </Card>
      <Card
        className="flush"
        title={data ? `${data.length} lessons` : 'Lessons'}
        actions={
          data?.length > 0 && (
            <button className="btn sm" onClick={exportRows}>
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          )
        }
      >
        {loading && !data ? (
          <Loader />
        ) : data.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title="No lessons match these filters"
            text="Try clearing a filter or widening the dates."
          />
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Class</th>
                  <th>Topic</th>
                  {role !== 'teacher' && <th>Teacher</th>}
                  <th>Understanding</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.map((i) => (
                  <tr key={i.id} className="clickable" onClick={() => lm.openDetail(i)}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {fmt(i.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                      <br />
                      <span className="faint">{i.periodLabel}</span>
                    </td>
                    <td>
                      {i.classLabel}
                      <br />
                      <span className="faint">{i.subjectName}</span>
                    </td>
                    <td>
                      <span className="strong">{i.topicTitle}</span>
                      <br />
                      <span className="faint">{i.chapterTitle}</span>
                    </td>
                    {role !== 'teacher' && <td>{i.teacherName}</td>}
                    <td>{i.completion?.understanding || <span className="faint">–</span>}</td>
                    <td>
                      <StatusBadge status={i.status} />
                    </td>
                    <td style={{ minWidth: 200 }}>
                      <LessonNote i={i} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {lm.modals}
    </>
  );
}