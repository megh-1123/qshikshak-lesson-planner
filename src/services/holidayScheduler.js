// Sudden / unexpected holidays: lessons planned on that day are pushed forward
// (same class + subject) instead of being cancelled. Used by the Holidays page.
import { db, save as savePlannerDb, uid as plannerUid } from '@/services/mock/mockDb';
import { timetable, subjects, departments } from '@/services/mock/seed';
import { LESSON_STATUS, PERIODS } from '@/utils/constants';
import { addDays, todayISO, weekdayIndex } from '@/utils/date';

const plannerPeriodOrder = (periodId) => PERIODS.findIndex((p) => p.id === periodId);

const sortPlannerItems = (a, b) => {
  if (a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }

  return plannerPeriodOrder(a.periodId) - plannerPeriodOrder(b.periodId);
};

// Check how many already-created lessons will be affected
export function getHolidayImpact(date) {
  if (!date) return 0;

  const planner = db();

  return planner.items.filter((item) => item.date === date && item.status === LESSON_STATUS.PLANNED).length;
}

// Unexpected holiday logic
export function rescheduleLessonsForUnexpectedHoliday(holiday) {
  if (!holiday?.date) {
    return {
      affectedCount: 0,
      movedCount: 0,
    };
  }

  // Do not modify historical/past lessons
  if (holiday.date < todayISO()) {
    return {
      affectedCount: 0,
      movedCount: 0,
    };
  }

  const planner = db();

  // Find lessons already planned on the newly declared holiday
  const affectedLessons = planner.items.filter(
    (item) => item.date === holiday.date && item.status === LESSON_STATUS.PLANNED,
  );

  if (!affectedLessons.length) {
    return {
      affectedCount: 0,
      movedCount: 0,
    };
  }

  /*
    Group by teacher + section + subject.

    Example:
    Priya + Class 8A + Science

    is treated as one lesson sequence.
  */
  const groups = new Map();

  affectedLessons.forEach((item) => {
    const key = `${item.teacherId}|${item.sectionId}|${item.subjectId}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);
  });

  const movedLessons = [];

  const blockedDates = new Set([
    ...planner.holidays.map((h) => h.date),
    ...planner.exams.map((e) => e.date || e.examDate),
  ]);

  groups.forEach((_, key) => {
    const [teacherId, sectionId, subjectId] = key.split('|');

    /*
      Get ALL future planned lessons for this
      teacher/class/subject starting from holiday date.

      This is important because later lessons also
      need to move forward.
    */
    const queue = planner.items
      .filter(
        (item) =>
          item.teacherId === teacherId &&
          item.sectionId === sectionId &&
          item.subjectId === subjectId &&
          item.status === LESSON_STATUS.PLANNED &&
          item.date >= holiday.date,
      )
      .sort(sortPlannerItems);

    if (!queue.length) return;

    const movableIds = new Set(queue.map((item) => item.id));

    /*
      Find new valid timetable slots.

      Start AFTER the unexpected holiday.
    */
    const availableSlots = [];

    let cursor = addDays(holiday.date, 1);

    // Safety limit: search up to one year ahead
    let safety = 0;

    while (availableSlots.length < queue.length && safety < 365) {
      safety += 1;

      // Skip holidays + exam days
      if (!blockedDates.has(cursor)) {
        const weekday = weekdayIndex(cursor);

        const daySlots = timetable
          .filter(
            (slot) =>
              slot.teacherId === teacherId &&
              slot.sectionId === sectionId &&
              slot.subjectId === subjectId &&
              slot.weekday === weekday,
          )
          .sort((a, b) => plannerPeriodOrder(a.periodId) - plannerPeriodOrder(b.periodId));

        daySlots.forEach((slot) => {
          if (availableSlots.length >= queue.length) {
            return;
          }

          /*
            Check if another NON-MOVABLE lesson already
            occupies the destination.

            We ignore lessons already in our queue because
            they themselves are going to move forward.
          */
          const occupied = planner.items.some(
            (item) =>
              !movableIds.has(item.id) &&
              item.date === cursor &&
              item.periodId === slot.periodId &&
              (item.sectionId === sectionId || item.teacherId === teacherId) &&
              ![LESSON_STATUS.CANCELLED, LESSON_STATUS.RESCHEDULED].includes(item.status),
          );

          if (!occupied) {
            availableSlots.push({
              date: cursor,
              periodId: slot.periodId,
            });
          }
        });
      }

      cursor = addDays(cursor, 1);
    }

    const numberToMove = Math.min(queue.length, availableSlots.length);

    for (let i = 0; i < numberToMove; i += 1) {
      const original = queue[i];
      const destination = availableSlots[i];

      /*
        Make a copy BEFORE modifying the original.
      */
      const newLesson = JSON.parse(JSON.stringify(original));

      const newId = plannerUid('item');

      /*
        Preserve original record as history.
      */
      original.status = LESSON_STATUS.RESCHEDULED;

      original.rescheduledTo = newId;

      original.history = [
        ...(original.history || []),
        {
          at: new Date().toISOString(),
          action: `rescheduled because of holiday: ${holiday.name}`,
          reason: holiday.description || 'Unexpected holiday',
          oldDate: original.date,
          newDate: destination.date,
        },
      ];

      /*
        Create new planned lesson.
      */
      newLesson.id = newId;

      newLesson.date = destination.date;

      newLesson.periodId = destination.periodId;

      newLesson.status = LESSON_STATUS.PLANNED;

      newLesson.completion = null;

      newLesson.rescheduledFrom = original.id;

      delete newLesson.rescheduledTo;

      newLesson.history = [
        {
          at: new Date().toISOString(),
          action: 'rescheduled here because of holiday',
          reason: holiday.description || `Unexpected holiday: ${holiday.name}`,
          previousDate: original.date,
        },
      ];

      planner.items.push(newLesson);

      movedLessons.push({
        oldItem: original,
        newItem: newLesson,
      });

      /*
        If the lesson moves beyond the original plan's
        end date, extend the plan.
      */
      const plan = planner.plans.find((p) => p.id === newLesson.planId);

      if (plan && destination.date > plan.endDate) {
        plan.endDate = destination.date;
      }
    }
  });

  /*
    Notify each affected teacher.
  */
  const teacherSummary = {};

  movedLessons.forEach(({ newItem }) => {
    if (!teacherSummary[newItem.teacherId]) {
      teacherSummary[newItem.teacherId] = {
        count: 0,
        planId: newItem.planId,
      };
    }

    teacherSummary[newItem.teacherId].count += 1;
  });

  Object.entries(teacherSummary).forEach(([teacherId, info]) => {
    planner.notifications.unshift({
      id: plannerUid('n'),
      to: teacherId,
      title: 'Lessons rescheduled',
      text:
        `${info.count} lesson${info.count === 1 ? '' : 's'} ` +
        `were rescheduled because ${holiday.name} ` +
        `(${holiday.date}) was declared a holiday.`,
      link: `/lesson-planner/plans/${info.planId}`,
      at: new Date().toISOString(),
      read: false,
    });
  });

  /*
    Notify relevant HODs too.
  */
  const hodIds = new Set();

  movedLessons.forEach(({ newItem }) => {
    const subject = subjects.find((s) => s.id === newItem.subjectId);

    const department = departments.find((d) => d.id === subject?.departmentId);

    if (department?.hodId) {
      hodIds.add(department.hodId);
    }
  });

  hodIds.forEach((hodId) => {
    planner.notifications.unshift({
      id: plannerUid('n'),
      to: hodId,
      title: 'Holiday schedule update',
      text:
        `${movedLessons.length} planned lesson` +
        `${movedLessons.length === 1 ? '' : 's'} ` +
        `were automatically shifted because ` +
        `${holiday.name} was declared a holiday.`,
      link: '/lesson-planner/calendar',
      at: new Date().toISOString(),
      read: false,
    });
  });

  savePlannerDb();

  return {
    affectedCount: affectedLessons.length,
    movedCount: movedLessons.length,
    movedLessons,
  };
}
