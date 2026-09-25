// Reports and notifications.
import { addDays, startOfWeek, todayISO } from '@/utils/date';
import { LESSON_STATUS, PLAN_STATUS } from '@/utils/constants';
import { departments, sections, staff, subjects, timetable } from '../seed';
import { coverage } from '../engine';
import { db, save } from '../mockDb';
import { ok, byId, sectionLabel, syllabusFor } from './helpers';

export const getCoverage = ({ sectionId, subjectId } = {}) => {
  const s = db();
  const assignments = [...new Map(timetable.map((t) => [`${t.sectionId}|${t.subjectId}`, t])).values()].filter(
    (a) => (!sectionId || a.sectionId === sectionId) && (!subjectId || a.subjectId === subjectId),
  );
  const rows = assignments.map((a) => {
    const sec = byId(sections, a.sectionId);
    const syl = syllabusFor(sec.classId, a.subjectId);
    const c = syl
      ? coverage(
          syl,
          s.items.filter((i) => i.sectionId === a.sectionId && i.subjectId === a.subjectId),
        )
      : null;
    return {
      sectionId: a.sectionId,
      subjectId: a.subjectId,
      classLabel: sectionLabel(a.sectionId),
      subjectName: byId(subjects, a.subjectId).name,
      teacherName: byId(staff, a.teacherId).name,
      hasSyllabus: !!syl,
      overall: c?.overall || 0,
      chapters: c?.chapters || [],
    };
  });
  return ok(rows);
};

export const getTeacherReport = () => {
  const s = db();
  const teachers = staff.filter((t) => t.role === 'teacher');
  const nextWs = addDays(startOfWeek(todayISO()), 7);
  return ok(
    teachers.map((t) => {
      const items = s.items.filter(
        (i) => i.teacherId === t.id && i.date <= todayISO() && i.status !== LESSON_STATUS.RESCHEDULED,
      );
      const c = (st) => items.filter((i) => i.status === st).length;
      const plans = s.plans.filter((p) => p.teacherId === t.id);
      const reviewed = plans.flatMap((p) => p.reviews);
      const assignments = [
        ...new Set(timetable.filter((x) => x.teacherId === t.id).map((x) => `${x.sectionId}|${x.subjectId}`)),
      ];
      const nextWeekDone = assignments.filter((k) =>
        plans.some(
          (p) =>
            `${p.sectionId}|${p.subjectId}` === k &&
            p.startDate <= nextWs &&
            p.endDate >= nextWs &&
            p.status !== PLAN_STATUS.DRAFT,
        ),
      ).length;
      return {
        id: t.id,
        name: t.name,
        department: byId(departments, t.departmentId)?.name,
        planned: items.length,
        completed: c(LESSON_STATUS.COMPLETED),
        partial: c(LESSON_STATUS.PARTIAL),
        notDone: c(LESSON_STATUS.NOT_DONE),
        cancelled: c(LESSON_STATUS.CANCELLED),
        completionRate: items.length ? Math.round((c(LESSON_STATUS.COMPLETED) / items.length) * 100) : 0,
        approvalRate: reviewed.length
          ? Math.round((reviewed.filter((r) => r.action === 'approved').length / reviewed.length) * 100)
          : 0,
        nextWeek: `${nextWeekDone}/${assignments.length}`,
        pendingMarking: items.filter((i) => i.status === LESSON_STATUS.PLANNED && i.date < todayISO()).length,
      };
    }),
  );
};

export const getNotifications = ({ userId }) => ok(db().notifications.filter((n) => n.to === userId));

export const markNotificationsRead = ({ userId }) => {
  db().notifications.forEach((n) => {
    if (n.to === userId) n.read = true;
  });
  save();
  return ok(true);
};
