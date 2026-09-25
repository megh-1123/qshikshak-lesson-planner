import { useApi } from '@/hooks/useApi';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { useApp } from '@/context/AppContext';
import Card from '@/components/common/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { addDays, todayISO } from '@/utils/date';
import './LessonInfoPage.css';
export default function LessonInfoPage() {
  const { user } = useApp();
  const { data, loading } = useApi(
    () =>
      lessonPlannerApi.getCalendar({
        userId: user?.id,
        role: 'principal',
        from: todayISO(),
        to: addDays(todayISO(), 14),
      }),
    [user?.id],
  );
  if (loading || !data) return <p className="muted">Loading lesson information…</p>;
  return (
    <div className="lesson-info-page stack">
      <div className="page-heading">
        <div>
          <h2>Lesson Information</h2>
          <p className="muted">Upcoming classroom topics and lesson status.</p>
        </div>
      </div>
      <div className="lesson-info-grid">
        {data.items.slice(0, 16).map((i) => (
          <Card key={i.id}>
            <div className="row-between">
              <div className="strong">{i.topicTitle}</div>
              <StatusBadge status={i.status} />
            </div>
            <div className="small muted">
              {i.date} · {i.classLabel} · {i.subjectName}
            </div>
            <div className="small lesson-chapter">{i.chapterTitle}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
