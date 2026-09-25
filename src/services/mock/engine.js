// Core planning logic. The backend's scheduler.service.js should implement
// exactly the same rules – this copy lets the frontend run without a server.
import { addDays, weekdayIndex } from '@/utils/date';
import { LESSON_STATUS, PERIODS } from '@/utils/constants';

const periodOrder = (id) => PERIODS.findIndex((p) => p.id === id);
export const sortItems = (a, b) =>
  a.date === b.date ? periodOrder(a.periodId) - periodOrder(b.periodId) : a.date < b.date ? -1 : 1;

// Flatten syllabus into ordered topics with chapter info
export function flatTopics(syllabus) {
  return syllabus.chapters.flatMap((ch) => ch.topics.map((tp) => ({ ...tp, chapterTitle: ch.title })));
}

// How many periods of each topic are already taught for this section + subject
export function taughtPeriods(items) {
  const map = {};
  items.forEach((it) => {
    if (it.status === LESSON_STATUS.COMPLETED) map[it.topicId] = (map[it.topicId] || 0) + 1;
    if (it.status === LESSON_STATUS.PARTIAL) map[it.topicId] = (map[it.topicId] || 0) + 0.5;
  });
  return map;
}

/**
 * Auto-fill: place remaining topics into the teacher's timetable periods.
 * Skips Sundays, holidays and exam days. Periods already planned are left alone.
 */
export function generatePlanItems({
  syllabus,
  slots,
  startDate,
  endDate,
  holidays,
  exams,
  existingItems,
  alreadyPlannedKeys,
}) {
  const taught = taughtPeriods(existingItems);
  const queue = [];
  flatTopics(syllabus).forEach((tp) => {
    const remaining = Math.max(0, Math.ceil(tp.estPeriods - (taught[tp.id] || 0)));
    for (let i = 0; i < remaining; i++) queue.push(tp);
  });
  // remove periods already planned in future (other plans) so we continue after them
  const futurePlanned = existingItems.filter((it) => it.status === LESSON_STATUS.PLANNED);
  futurePlanned.forEach((it) => {
    const idx = queue.findIndex((q) => q.id === it.topicId);
    if (idx > -1) queue.splice(idx, 1);
  });

  const skip = new Set([...holidays.map((h) => h.date), ...exams.map((e) => e.date)]);
  const placed = [];
  const skippedDays = [];
  for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
    const wd = weekdayIndex(d);
    if (wd === 6) continue;
    const daySlots = slots
      .filter((s) => s.weekday === wd)
      .sort((a, b) => periodOrder(a.periodId) - periodOrder(b.periodId));
    if (!daySlots.length) continue;
    if (skip.has(d)) {
      skippedDays.push(d);
      continue;
    }
    for (const s of daySlots) {
      if (alreadyPlannedKeys?.has(`${d}|${s.periodId}`)) continue;
      const tp = queue.shift();
      if (!tp) break;
      placed.push({ date: d, periodId: s.periodId, topic: tp });
    }
  }
  const unscheduled = [...new Map(queue.map((q) => [q.id, q])).values()];
  return { placed, unscheduled, skippedDays };
}

/** Chapter-wise coverage for one section + subject */
export function coverage(syllabus, items) {
  const taught = taughtPeriods(items);
  let doneAll = 0;
  let totalAll = 0;
  const chapters = syllabus.chapters.map((ch) => {
    let done = 0;
    let total = 0;
    ch.topics.forEach((tp) => {
      total += tp.estPeriods;
      done += Math.min(tp.estPeriods, taught[tp.id] || 0);
    });
    doneAll += done;
    totalAll += total;
    return {
      id: ch.id,
      title: ch.title,
      term: ch.term,
      percent: total ? Math.round((done / total) * 100) : 0,
      topics: ch.topics.length,
    };
  });
  return { chapters, overall: totalAll ? Math.round((doneAll / totalAll) * 100) : 0 };
}

/** Mock "AI" suggestion – the backend will call an LLM here */
export function suggestLesson(topicTitle, minutes = 40) {
  const blocks = [
    ['Introduction', 0.125, '#6a60cc'],
    ['Explanation', 0.375, '#4b44b5'],
    ['Demonstration', 0.2, '#3b82f6'],
    ['Activity', 0.2, '#16a34a'],
    ['Assessment', 0.1, '#f59e0b'],
  ];
  return {
    objectives: [
      `Explain what ${topicTitle.toLowerCase()} means in their own words`,
      `Identify examples of ${topicTitle.toLowerCase()} in daily life`,
      `Solve simple questions on ${topicTitle.toLowerCase()}`,
    ],
    method: 'Demonstration',
    activities: `Start with a real-life question to connect to ${topicTitle.toLowerCase()}. Explain the key idea on the board, show a short demonstration, then students work in pairs on a quick activity and share answers.`,
    assessment: 'Three quick oral questions and a one-line exit ticket.',
    homework: `Write 5 examples of ${topicTitle.toLowerCase()} from your home or school.`,
    timePlan: blocks.map(([label, share, color]) => ({ label, min: Math.round(minutes * share), color })),
  };
}
