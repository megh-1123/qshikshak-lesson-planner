// Masters, Today page and Calendar.
import { addDays, startOfWeek, todayISO, weekdayIndex } from '@/utils/date';
import { LESSON_STATUS, PERIODS, periodById } from '@/utils/constants';
import { classes, departments, sections, staff, subjects, timetable, usersByRole } from '../seed';
import { coverage, sortItems } from '../engine';
import { db } from '../mockDb';
import { ok, byId, sectionLabel, enrich, canSeeAll, syllabusFor } from './helpers';

export const getMasters = () => {
  const s = db();
  return ok({
    classes,
    sections,
    subjects,
    departments,
    staff,
    timetable,
    holidays: s.holidays,
    exams: s.exams,
    templates: s.templates,
    settings: s.settings,
    usersByRole,
    periods: PERIODS,
  });
};

export const getToday = ({ userId, date = todayISO() }) => {
  const s = db();
  const mine = s.items.filter((i) => i.teacherId === userId);
  const lessons = mine
    .filter((i) => i.date === date && i.status !== LESSON_STATUS.RESCHEDULED)
    .map(enrich)
    .sort(sortItems);
  const wd = weekdayIndex(date);
  const holiday = s.holidays.find((h) => h.date === date);
  const unplanned = holiday
    ? []
    : timetable
        .filter((t) => t.teacherId === userId && t.weekday === wd && !lessons.some((l) => l.periodId === t.periodId))
        .map((t) => ({
          ...t,
          classLabel: sectionLabel(t.sectionId),
          classId: byId(sections, t.sectionId).classId,
          subjectName: byId(subjects, t.subjectId).name,
          ...periodById(t.periodId),
        }));
  const ws = startOfWeek(date);
  const week = mine.filter((i) => i.date >= ws && i.date <= addDays(ws, 5) && i.status !== LESSON_STATUS.RESCHEDULED);
  const yesterdayPending = mine.filter((i) => i.date < date && i.status === LESSON_STATUS.PLANNED).map(enrich);

  const assignments = [
    ...new Map(
      timetable.filter((t) => t.teacherId === userId).map((t) => [`${t.sectionId}|${t.subjectId}`, t]),
    ).values(),
  ];
  const cov = assignments.map((a) => {
    const sec = byId(sections, a.sectionId);
    const syl = syllabusFor(sec.classId, a.subjectId);
    const c = syl
      ? coverage(
          syl,
          s.items.filter((i) => i.sectionId === a.sectionId && i.subjectId === a.subjectId),
        )
      : { overall: 0 };
    return {
      sectionId: a.sectionId,
      subjectId: a.subjectId,
      classLabel: sectionLabel(a.sectionId),
      subjectName: byId(subjects, a.subjectId).name,
      overall: c.overall,
    };
  });
  const overall = cov.length ? Math.round(cov.reduce((a, c) => a + c.overall, 0) / cov.length) : 0;

  return ok({
    date,
    holiday,
    lessons,
    unplanned,
    pendingMarking: yesterdayPending,
    coverage: cov,
    stats: {
      today: lessons.length + unplanned.length,
      completed: lessons.filter((l) => l.status === LESSON_STATUS.COMPLETED).length,
      pending: lessons.filter((l) => l.status === LESSON_STATUS.PLANNED).length + unplanned.length,
      week: week.length,
      weekCompleted: week.filter((i) => i.status === LESSON_STATUS.COMPLETED).length,
      syllabus: overall,
    },
  });
};

export const getCalendar = ({ userId, role, from, to, sectionId, subjectId }) => {
  const s = db();
  let items = s.items.filter((i) => i.date >= from && i.date <= to && i.status !== LESSON_STATUS.RESCHEDULED);
  if (!canSeeAll(role)) items = items.filter((i) => i.teacherId === userId);
  if (sectionId) items = items.filter((i) => i.sectionId === sectionId);
  if (subjectId) items = items.filter((i) => i.subjectId === subjectId);
  return ok({
    items: items.map(enrich).sort(sortItems),
    holidays: s.holidays.filter((h) => h.date >= from && h.date <= to),
    exams: s.exams.filter((e) => e.date >= from && e.date <= to),
  });
};
