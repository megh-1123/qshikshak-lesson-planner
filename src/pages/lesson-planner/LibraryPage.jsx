import { useState } from 'react';
import { Library } from 'lucide-react';
import Card from '@/components/common/Card';
import EmptyState, { Loader } from '@/components/common/EmptyState';
import FilterBar from '@/components/lesson-planner/FilterBar';
import { useLessonModals } from '@/components/lesson-planner/useLessonModals';
import { useApi } from '@/hooks/useApi';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';

export default function LibraryPage() {
  const [filters, setFilters] = useState({});
  const { data, loading } = useApi(() => lessonPlannerApi.getLibrary(filters), [JSON.stringify(filters)]);
  const lm = useLessonModals();

  return (
    <>
      <Card>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Approved and taught lessons from all teachers. When you plan the same topic, use “Copy from library” in the
          lesson form.
        </p>
        <FilterBar value={filters} onChange={setFilters} show={['search', 'subject']} />
      </Card>
      {loading && !data ? (
        <Loader />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={Library}
            title="No saved lessons found"
            text="Lessons are added here automatically once they are approved or taught."
          />
        </Card>
      ) : (
        <div className="grid-3">
          {data.map((l) => (
            <Card key={l.id} style={{ cursor: 'pointer' }} onClick={() => lm.openDetail(l)}>
              <div className="stack" style={{ gap: 8 }}>
                <span className="faint">
                  {l.subjectName} · {l.chapterTitle}
                </span>
                <h3>{l.topicTitle}</h3>
                <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                  {l.details.objectives.slice(0, 2).map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                <div className="row-between">
                  <span className="small">
                    {l.teacherName} · {l.classLabel}
                  </span>
                  <span className="badge" style={{ '--c': 'var(--primary)' }}>
                    {l.details.method}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {lm.modals}
    </>
  );
}
