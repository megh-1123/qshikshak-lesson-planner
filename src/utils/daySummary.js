// A teacher's day at a glance: how many periods, classes, lessons, free periods.
// Used by the Today page and the Timetable page.
import { PERIODS } from './constants';
import { weekdayIndex } from './date';

// What each period of the day is for this teacher
//   done       – a lesson that is already marked (done / partly done / not done)
//   lesson     – a class with a lesson planned
//   no-lesson  – a class in the timetable, but no lesson planned yet
//   cancelled  – a lesson that was cancelled
//   free       – no class: the teacher's free period
export function daySummary({ date, teacherId, timetable = [], items = [], holidays = [], exams = [] }) {
  if (weekdayIndex(date) === 6) return { closed: 'Sunday' };
  const holiday = holidays.find((h) => h.date === date);
  if (holiday) return { closed: holiday.title || holiday.name || 'Holiday' };
  const exam = exams.find((e) => e.date === date);
  if (exam) return { closed: exam.title || exam.examName || 'Exam day' };

  const wd = weekdayIndex(date);
  const mine = items.filter((i) => i.teacherId === teacherId && i.date === date && i.status !== 'rescheduled');
  const slots = timetable.filter((t) => t.teacherId === teacherId && t.weekday === wd);

  const periods = PERIODS.map((p, index) => {
    const item = mine.find((i) => i.periodId === p.id);
    const slot = slots.find((t) => t.periodId === p.id);
    let kind = 'free';
    if (item) kind = item.status === 'cancelled' ? 'cancelled' : item.status === 'planned' ? 'lesson' : 'done';
    else if (slot) kind = 'no-lesson';
    return { ...p, number: index + 1, kind, item, slot };
  });
  const count = (kind) => periods.filter((p) => p.kind === kind).length;

  return {
    total: periods.length,
    classes: periods.length - count('free'),
    withLesson: count('lesson') + count('done'),
    needLesson: count('no-lesson'),
    free: count('free'),
    done: count('done'),
    cancelled: count('cancelled'),
    periods,
  };
}