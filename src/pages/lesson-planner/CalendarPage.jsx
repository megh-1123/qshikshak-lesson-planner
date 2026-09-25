import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/common/Card';
import { Segmented } from '@/components/common/Tabs';
import { StatusLegend } from '@/components/common/StatusBadge';
import { Loader } from '@/components/common/EmptyState';
import PlannerGrid from '@/components/lesson-planner/PlannerGrid';
import { DayView, MonthView } from '@/components/lesson-planner/CalendarViews';
import FilterBar from '@/components/lesson-planner/FilterBar';
import { useLessonModals } from '@/components/lesson-planner/useLessonModals';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { useAction, useApi } from '@/hooks/useApi';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import {
  addDays,
  addMonths,
  fmt,
  fmtLong,
  fmtMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  todayISO,
  toISO,
  weekDates,
} from '@/utils/date';
import { periodKind } from '@/utils/freePeriods';

export default function CalendarPage() {
  const { user, role, masters, loadNotifications } = useApp();
  const toast = useToast();
  const { run } = useAction(toast);
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(todayISO());
  const [filters, setFilters] = useState({});

  const range = useMemo(() => {
    if (view === 'day') return { from: anchor, to: anchor };
    if (view === 'week') {
      const ws = startOfWeek(anchor);
      return { from: ws, to: addDays(ws, 5) };
    }
    const m = startOfMonth(anchor);
    const last = toISO(new Date(parseISO(m).getFullYear(), parseISO(m).getMonth() + 1, 0));
    return { from: startOfWeek(m), to: addDays(last, 7) };
  }, [view, anchor]);

  const { data, loading, reload } = useApi(
    () =>
      lessonPlannerApi.getCalendar({
        userId: user.id,
        role,
        ...range,
        sectionId: filters.sectionId,
        subjectId: filters.subjectId,
      }),
    [user.id, role, range.from, range.to, filters.sectionId, filters.subjectId],
  );
  const lm = useLessonModals(reload);

  // Drag & drop – only teachers, only in week view (teachers only see their own lessons here)
  const canDrag = role === 'teacher' && view === 'week';
  const swap = (a, b) => run(() => lessonPlannerApi.swapItems(a, b), { success: 'Lessons swapped' }).then(reload);
  const move = (itemId, slot) => run(() => lessonPlannerApi.moveItem(itemId, slot)).then(reload);
  const continueLesson = (itemId, slot) =>
    run(() => lessonPlannerApi.continueLesson(itemId, slot)).then((r) => {
      if (r) {
        reload();
        loadNotifications();
      }
    });
  const dropKind = (it, date, periodId) => periodKind(masters.timetable, it, date, periodId);

  const step = (dir) => {
    if (view === 'day') setAnchor(addDays(anchor, dir));
    else if (view === 'week') setAnchor(addDays(anchor, 7 * dir));
    else setAnchor(addMonths(anchor, dir));
  };
  const title =
    view === 'day'
      ? fmtLong(anchor)
      : view === 'week'
        ? `${fmt(range.from)} – ${fmt(range.to, { day: 'numeric', month: 'short', year: 'numeric' })}`
        : fmtMonth(anchor);

  return (
    <>
      <Card>
        <div className="row-between" style={{ marginBottom: 16 }}>
          <div className="row">
            <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous">
              <ChevronLeft size={20} />
            </button>
            <button className="btn sm" onClick={() => setAnchor(todayISO())}>
              Today
            </button>
            <button className="icon-btn" onClick={() => step(1)} aria-label="Next">
              <ChevronRight size={20} />
            </button>
            <h3 style={{ marginLeft: 6 }}>{title}</h3>
          </div>
          <Segmented
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
        <FilterBar value={filters} onChange={setFilters} show={['class', 'section', 'subject']} />
      </Card>

      <Card className="flush">
        <div className="row-between" style={{ padding: '14px 20px' }}>
          {canDrag ? (
            <span className="faint">
              Drag any lesson – places it can go light up.{' '}
              <span style={{ color: 'var(--st-completed)', fontWeight: 600 }}>Green</span> = free period,{' '}
              <span style={{ color: 'var(--st-partial)', fontWeight: 600 }}>orange</span> = this class’s period.
            </span>
          ) : (
            <span />
          )}
          <StatusLegend />
        </div>
        {loading && !data ? (
          <Loader />
        ) : (
          <div style={{ padding: view === 'month' ? 0 : '0 0 4px' }}>
            {view === 'week' && (
              <PlannerGrid
                dates={weekDates(range.from)}
                items={data.items}
                holidays={data.holidays}
                exams={data.exams}
                onSelect={lm.openDetail}
                showClass
                draggable={canDrag}
                onSwap={swap}
                onMove={move}
                onContinue={continueLesson}
                dropKind={dropKind}
              />
            )}
            {view === 'month' && (
              <MonthView
                month={startOfMonth(anchor)}
                items={data.items}
                holidays={data.holidays}
                exams={data.exams}
                onSelect={lm.openDetail}
                onDay={(d) => {
                  setAnchor(d);
                  setView('day');
                }}
              />
            )}
            {view === 'day' && (
              <div style={{ padding: '0 20px 12px' }}>
                <DayView date={anchor} items={data.items} holidays={data.holidays} onSelect={lm.openDetail} />
              </div>
            )}
          </div>
        )}
      </Card>
      {lm.modals}
    </>
  );
}
