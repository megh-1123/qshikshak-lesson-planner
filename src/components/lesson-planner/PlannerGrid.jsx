import './PlannerGrid.css';
import { useState } from 'react';
import { Plus, RotateCcw, GripVertical } from 'lucide-react';
import { BELL_SCHEDULE, STATUS_META, WEEKDAYS } from '@/utils/constants';
import { fmt, todayISO, weekdayIndex } from '@/utils/date';
import { periodHasStarted } from '@/utils/freePeriods';

/**
 * Timetable-style grid (same rows as Timetables › Classes) with lessons in the cells.
 *  dates       – ISO dates to show as columns (Mon–Sat)
 *  items       – lessons { id, date, periodId, topicTitle, status, ... }
 *  otherSlots  – other subjects of the same section (shown faded, like the timetable)
 *  slotKeys    – Set of "weekday|periodId" where this plan has periods (for empty-slot hints)
 *  onSelect(item) / onEmpty({date, periodId})
 *
 * Drag & drop (when draggable):
 *  dropKind(item, date, periodId) – 'class' | 'free' | null  (see utils/freePeriods.js)
 *  onSwap(aId, bId)                    – planned lesson onto another planned lesson of the same plan
 *  onMove(itemId, {date, periodId})     – planned lesson into an empty class period or free period
 *  onContinue(itemId, {date, periodId}) – partly done / not done lesson into a later period
 * While dragging, every place the lesson can go is highlighted and labelled.
 *
 * Day summary (optional, Timetable page):
 *  dayNote(date)        – short text under each day name, e.g. "5 classes · 3 free"
 *  selectedDate         – the day that is highlighted
 *  onDayClick(date)     – click a day name to pick that day
 *  emptySlots           – [{ date, periodId, label }] class periods with no lesson yet
 */
const CONTINUABLE = ['partial', 'not_done'];

export default function PlannerGrid({
  dates,
  items = [],
  otherSlots = [],
  holidays = [],
  exams = [],
  slotKeys,
  onSelect,
  onEmpty,
  onSwap,
  onMove,
  onContinue,
  dropKind,
  dayNote,
  selectedDate,
  onDayClick,
  emptySlots = [],
  showClass = false,
  draggable = false,
}) {
  const today = todayISO();
  const [dragItem, setDragItem] = useState(null);
  const [overKey, setOverKey] = useState(null);
  const holidayOf = (d) => holidays.find((h) => h.date === d) || exams.find((e) => e.date === d);
  const cellItems = (date, periodId) =>
    items.filter((i) => i.date === date && i.periodId === periodId && i.status !== 'rescheduled');

  const canDrag = (it) =>
    Boolean(
      draggable && ((it.status === 'planned' && (onSwap || onMove)) || (CONTINUABLE.includes(it.status) && onContinue)),
    );
  const periodIdx = (id) => BELL_SCHEDULE.findIndex((b) => b.id === id);
  const isLater = (d, periodId, it) => d > it.date || (d === it.date && periodIdx(periodId) > periodIdx(it.periodId));

  // What happens if the dragged lesson is dropped here? 'swap' | 'move' | 'continue' | null
  const dropAction = (d, periodId, list) => {
    // Periods that have already started or finished (earlier today, or past days) can't take a lesson
    if (!dragItem || periodHasStarted(d, periodId)) return null;
    const kind = dropKind?.(dragItem, d, periodId);
    const t = list.length === 1 ? list[0] : null;
    if (dragItem.status === 'planned') {
      if (!list.length) return onMove && kind ? 'move' : null;
      return onSwap && t && t.status === 'planned' && t.id !== dragItem.id && t.planId === dragItem.planId
        ? 'swap'
        : null;
    }
    if (!isLater(d, periodId, dragItem)) return null;
    if (!list.length) return kind ? 'continue' : null;
    return t && t.status === 'planned' && t.sectionId === dragItem.sectionId && t.subjectId === dragItem.subjectId
      ? 'continue'
      : null;
  };

  const endDrag = () => {
    setDragItem(null);
    setOverKey(null);
  };
  const drop = (action, d, periodId, list) => {
    const dragged = dragItem;
    endDrag();
    if (!dragged || !action) return;
    if (action === 'swap') onSwap?.(dragged.id, list[0].id);
    if (action === 'move') onMove?.(dragged.id, { date: d, periodId });
    if (action === 'continue') onContinue?.(dragged.id, { date: d, periodId });
  };

  const hintFor = (action, kind) => {
    if (action === 'swap') return 'Swap';
    if (action === 'continue' && kind === 'free') return 'Free period · continue here';
    if (action === 'continue') return 'Continue here';
    if (kind === 'free') return 'Free period · move here';
    return 'Class period · move here';
  };

  return (
    <div className="planner-scroll">
      <div
        className={`planner ${dragItem ? 'is-dragging' : ''}`}
        style={{ '--days': dates.length }}
        role="grid"
        aria-label="Weekly lesson plan"
      >
        <div className="ph">Time</div>
        {dates.map((d) => (
          <div
            key={d}
            className={`ph ${d === today ? 'today' : ''} ${d === selectedDate ? 'selected' : ''} ${onDayClick ? 'clickable' : ''}`}
            onClick={onDayClick ? () => onDayClick(d) : undefined}
            role={onDayClick ? 'button' : undefined}
            tabIndex={onDayClick ? 0 : undefined}
            onKeyDown={onDayClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onDayClick(d) : undefined}
            title={onDayClick ? 'Show the summary for this day' : undefined}
          >
            {WEEKDAYS[weekdayIndex(d)]}
            <span className="d">
              {fmt(d)}
              {d === today ? ' · Today' : ''}
            </span>
            {dayNote && <span className="ph-note">{dayNote(d)}</span>}
          </div>
        ))}

        {BELL_SCHEDULE.map((b) => {
          const time = `${b.start} - ${b.end}`;
          if (b.type !== 'period') {
            return [
              <div key={`${b.id}-t`} className="pt">
                {time}
              </div>,
              <div key={b.id} className={`band ${b.type}`}>
                {b.label}
              </div>,
            ];
          }
          return [
            <div key={`${b.id}-t`} className="pt">
              {time}
            </div>,
            ...dates.map((d) => {
              const key = `${d}|${b.id}`;
              const hol = holidayOf(d);
              if (hol) {
                return (
                  <div key={key} className="pc holiday">
                    {b.id === 'p1' && <div className="hlabel">{hol.title}</div>}
                  </div>
                );
              }
              const list = cellItems(d, b.id);
              const other = otherSlots.find((o) => o.weekday === weekdayIndex(d) && o.periodId === b.id);
              const isMySlot = slotKeys?.has(`${weekdayIndex(d)}|${b.id}`);
              const emptySlot = !list.length && emptySlots.find((x) => x.date === d && x.periodId === b.id);
              const action = dragItem ? dropAction(d, b.id, list) : null;
              const kind = action ? dropKind?.(dragItem, d, b.id) : null;
              const dropCls = dragItem
                ? action
                  ? `can-drop ${kind === 'free' && !list.length ? 'free' : ''} ${overKey === key ? 'over' : ''}`
                  : 'no-drop'
                : '';
              return (
                <div
                  key={key}
                  className={`pc ${!list.length && other ? 'other' : ''} ${dropCls}`}
                  onDragOver={
                    action
                      ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (overKey !== key) setOverKey(key);
                        }
                      : undefined
                  }
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setOverKey(null);
                  }}
                  onDrop={
                    action
                      ? (e) => {
                          e.preventDefault();
                          drop(action, d, b.id, list);
                        }
                      : undefined
                  }
                >
                  {list.map((it) => (
                    <button
                      key={it.id}
                      className={`lesson ${it.status === 'cancelled' ? 'cancelled' : ''} ${dragItem?.id === it.id ? 'dragging' : ''} ${canDrag(it) ? 'can-drag' : ''}`}
                      style={{ '--c': STATUS_META[it.status]?.color }}
                      onClick={() => onSelect?.(it)}
                      draggable={canDrag(it)}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', it.id);
                        setDragItem(it);
                      }}
                      onDragEnd={endDrag}
                      title={
                        canDrag(it)
                          ? `${it.topicTitle} – drag to move`
                          : `${it.topicTitle} – ${STATUS_META[it.status]?.label}`
                      }
                      aria-label={`${it.topicTitle}, ${STATUS_META[it.status]?.label}`}
                    >
                      <span className="lt">
                        {canDrag(it) && <GripVertical size={12} className="grip" aria-hidden="true" />}
                        {it.topicTitle}
                      </span>
                      <span className="lm">
                        {showClass ? `${it.classLabel} · ${it.subjectName}` : STATUS_META[it.status]?.label}
                        {it.continued && <RotateCcw size={11} aria-label="Continued" />}
                      </span>
                    </button>
                  ))}
                  {action && (
                    <div className={`drop-hint ${list.length ? 'on-lesson' : ''}`}>{hintFor(action, kind)}</div>
                  )}
                  {!action && emptySlot && (
                    <div className="no-lesson-tag" title="This class has no lesson planned yet">
                      {emptySlot.label}
                      <br />
                      <b>No lesson yet</b>
                    </div>
                  )}
                  {!action && !list.length && !emptySlot && other && (
                    <div className="otag">
                      {other.subjectName}
                      <br />
                      {other.teacherName}
                    </div>
                  )}
                  {!dragItem && !list.length && !other && isMySlot && onEmpty && (
                    <button className="lesson empty-slot" onClick={() => onEmpty({ date: d, periodId: b.id })}>
                      <Plus size={14} /> Plan
                    </button>
                  )}
                </div>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}