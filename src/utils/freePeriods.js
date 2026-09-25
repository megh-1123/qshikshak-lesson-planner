// Which kind of period is a (date, period) for a lesson's class + teacher?
//   'class' – a timetable period of this class + subject (e.g. 8-A Science)
//   'free'  – the class has no subject in that period AND the teacher has no class then
//   null    – not usable (another subject's period, teacher busy, Sunday, not a teaching period)
import { weekdayIndex } from './date';
import { PERIODS } from './constants';

export function periodKind(timetable, { sectionId, subjectId, teacherId }, date, periodId) {
  const wd = weekdayIndex(date);
  if (wd === 6 || !PERIODS.some((p) => p.id === periodId)) return null;
  const at = timetable.filter((t) => t.weekday === wd && t.periodId === periodId);
  if (at.some((t) => t.sectionId === sectionId && t.subjectId === subjectId && t.teacherId === teacherId))
    return 'class';
  const classBusy = at.some((t) => t.sectionId === sectionId);
  const teacherBusy = at.some((t) => t.teacherId === teacherId);
  return !classBusy && !teacherBusy ? 'free' : null;
}
// Has this period already started (or finished)? Past days → true. Today → compare with the clock.
// Lessons can only be placed in periods that have not started yet.
export function periodHasStarted(date, periodId, now = new Date()) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (date < today) return true;
  if (date > today) return false;
  const p = PERIODS.find((x) => x.id === periodId);
  if (!p) return false;
  const [h, m] = p.start.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}