// 2. Create Lesson Plan – TC-03 … TC-07
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generatePlan, getPlan } from '@/services/mock/api';
import { generatePlanItems, flatTopics, sortItems } from '@/services/mock/engine';
import { buildSyllabus } from '@/services/mock/seed';
import { LESSON_STATUS, PLAN_STATUS } from '@/utils/constants';
import { weekdayIndex } from '@/utils/date';
import { freshDb, call, itemsOf, key } from '@/test/mockApi';

// Class 8-A Science, taught by Priya Sharma (t1) – Mon–Sat, one period a day
const VALID = {
  teacherId: 't1',
  classId: 'c8',
  sectionId: 's8a',
  subjectId: 'sci',
  startDate: '2026-09-28', // next week (Mon)
  endDate: '2026-10-03', // Sat
};

const syllabusOf = (s, classId, subjectId) => s.syllabus.find((x) => x.classId === classId && x.subjectId === subjectId);
const topicPosition = (syllabus) => new Map(flatTopics(syllabus).map((t, i) => [t.id, i]));

let s;
beforeEach(() => {
  s = freshDb();
});
afterEach(() => vi.useRealTimers());

describe('TC-03 Create a lesson plan with valid details', () => {
  it('creates a draft plan with the selected class, section, subject and dates', async () => {
    const before = s.plans.length;
    const res = await call(generatePlan(VALID));

    expect(res.success).toBe(true);
    expect(res.message).toBe('Plan created');
    expect(s.plans).toHaveLength(before + 1);
    expect(res.data.plan).toMatchObject({
      ...VALID,
      status: PLAN_STATUS.DRAFT,
      classLabel: 'Class 8-A',
      subjectName: 'Science',
      teacherName: 'Priya Sharma',
      templateId: 'tpl-ssc',
      submittedAt: null,
      reviews: [],
    });
  });

  it('assigns syllabus topics to the teacher’s available timetable periods', async () => {
    const { data } = await call(generatePlan(VALID));
    const items = itemsOf(data.plan.id);
    const slots = new Set(['0|p1', '1|p3', '2|p2', '3|p6', '4|p4', '5|p2']); // 8-A Science timetable

    expect(items.length).toBeGreaterThan(0);
    expect(items).toHaveLength(data.placedCount);
    items.forEach((i) => {
      expect(slots.has(`${weekdayIndex(i.date)}|${i.periodId}`)).toBe(true);
      expect(i.date >= VALID.startDate && i.date <= VALID.endDate).toBe(true);
      expect(i.topicId).toBeTruthy();
      expect(i.topicTitle).toBeTruthy();
      expect(i.chapterTitle).toBeTruthy();
      expect(i.status).toBe(LESSON_STATUS.PLANNED);
      expect(i).toMatchObject({ teacherId: 't1', classId: 'c8', sectionId: 's8a', subjectId: 'sci' });
    });
  });

  it('keeps the template the teacher picked', async () => {
    const { data } = await call(generatePlan({ ...VALID, templateId: 'tpl-cbse' }));
    expect(data.plan.templateId).toBe('tpl-cbse');
  });

  it('can be opened afterwards with its lessons', async () => {
    const { data } = await call(generatePlan(VALID));
    const detail = await call(getPlan(data.plan.id));
    expect(detail.data.plan.id).toBe(data.plan.id);
    expect(detail.data.items).toHaveLength(data.placedCount);
  });

  it('reports topics that did not fit into the dates', async () => {
    const { data } = await call(generatePlan({ ...VALID, endDate: VALID.startDate }));
    expect(data.placedCount).toBe(1);
    expect(data.unscheduled.length).toBeGreaterThan(0);
  });
});

describe('TC-04 Check required fields while creating a plan', () => {
  const REQUIRED = ['teacherId', 'classId', 'sectionId', 'subjectId', 'startDate', 'endDate'];

  it.each(REQUIRED)('does not create a plan when "%s" is missing', async (field) => {
    const plansBefore = s.plans.length;
    const itemsBefore = s.items.length;

    await expect(call(generatePlan({ ...VALID, [field]: '' }))).rejects.toThrow();

    expect(s.plans).toHaveLength(plansBefore);
    expect(s.items).toHaveLength(itemsBefore);
  });

  it('does not create a plan when every field is empty', async () => {
    const plansBefore = s.plans.length;
    await expect(call(generatePlan({}))).rejects.toThrow();
    expect(s.plans).toHaveLength(plansBefore);
  });

  it('does not create a plan when the end date is before the start date', async () => {
    const plansBefore = s.plans.length;
    await expect(
      call(generatePlan({ ...VALID, startDate: '2026-10-03', endDate: '2026-09-28' })),
    ).rejects.toThrow(/Nothing to plan/);
    expect(s.plans).toHaveLength(plansBefore);
  });

  it('returns the error in the backend shape { success:false, message }', async () => {
    const err = await call(generatePlan({ ...VALID, classId: '' })).catch((e) => e);
    expect(err.response.data).toEqual({ success: false, message: err.message });
  });

  // The API does not validate fields itself. Flip to `it` once it does.
  it.fails('KNOWN GAP: tells the user which required field is missing', async () => {
    await expect(call(generatePlan({ ...VALID, startDate: '' }))).rejects.toThrow(/required|missing|fill/i);
  });
});

describe('TC-05 Verify syllabus order in generated plan', () => {
  it('schedules a fresh syllabus from the first topic, in syllabus order', () => {
    const syllabus = buildSyllabus().find((x) => x.classId === 'c8' && x.subjectId === 'sci');
    const expected = flatTopics(syllabus).flatMap((t) => Array(t.estPeriods).fill(t.id));
    const slots = [0, 1, 2, 3, 4, 5].map((weekday) => ({ weekday, periodId: 'p1' }));

    const { placed } = generatePlanItems({
      syllabus,
      slots,
      startDate: '2026-10-19',
      endDate: '2026-11-28',
      holidays: [],
      exams: [],
      existingItems: [],
      alreadyPlannedKeys: new Set(),
    });

    expect(placed.map((p) => p.topic.id)).toEqual(expected.slice(0, placed.length));
  });

  it('gives each topic as many periods as it needs, back to back', () => {
    const syllabus = buildSyllabus().find((x) => x.classId === 'c8' && x.subjectId === 'math');
    const slots = [0, 1, 2, 3, 4, 5].map((weekday) => ({ weekday, periodId: 'p1' }));
    const { placed, unscheduled } = generatePlanItems({
      syllabus,
      slots,
      startDate: '2026-10-19',
      endDate: '2026-12-31',
      holidays: [],
      exams: [],
      existingItems: [],
      alreadyPlannedKeys: new Set(),
    });

    expect(unscheduled).toEqual([]);
    flatTopics(syllabus).forEach((t) => {
      const idx = placed.map((p, i) => (p.topic.id === t.id ? i : -1)).filter((i) => i > -1);
      expect(idx).toHaveLength(t.estPeriods);
      expect(idx[idx.length - 1] - idx[0]).toBe(t.estPeriods - 1);
    });
  });

  it('keeps syllabus order in a real plan and continues after already planned topics', async () => {
    const syllabus = syllabusOf(s, 'c8', 'sci');
    const pos = topicPosition(syllabus);
    const earlier = s.items.filter((i) => i.sectionId === 's8a' && i.subjectId === 'sci');
    const lastEarlier = Math.max(...earlier.map((i) => pos.get(i.topicId)));

    const { data } = await call(generatePlan({ ...VALID, endDate: '2026-10-17' }));
    const order = itemsOf(data.plan.id)
      .sort(sortItems)
      .map((i) => pos.get(i.topicId));

    order.forEach((p, i) => i > 0 && expect(p).toBeGreaterThanOrEqual(order[i - 1]));
    expect(order[0]).toBeGreaterThanOrEqual(lastEarlier);
  });
});

describe('TC-06 Verify holiday and exam dates are skipped', () => {
  // Includes Annual Day (30 Sep), Gandhi Jayanti (2 Oct), Unit Test 2 (12 & 13 Oct)
  const RANGE = { ...VALID, startDate: '2026-09-28', endDate: '2026-10-17' };
  const BLOCKED = ['2026-09-30', '2026-10-02', '2026-10-12', '2026-10-13'];

  it('does not schedule any lesson on a holiday or exam date', async () => {
    const { data } = await call(generatePlan(RANGE));
    const dates = itemsOf(data.plan.id).map((i) => i.date);
    BLOCKED.forEach((d) => expect(dates).not.toContain(d));
  });

  it('lists the skipped days in the result shown to the teacher', async () => {
    const { data } = await call(generatePlan(RANGE));
    expect(data.skippedDays).toEqual(BLOCKED);
  });

  it('moves the topic to the next working day instead of dropping it', async () => {
    const { data } = await call(generatePlan(RANGE));
    const items = itemsOf(data.plan.id).sort(sortItems);
    const before = items.filter((i) => i.date < '2026-10-12').at(-1);
    const after = items.find((i) => i.date > '2026-10-13');
    expect(after.date).toBe('2026-10-14');
    const pos = topicPosition(syllabusOf(s, 'c8', 'sci'));
    expect(pos.get(after.topicId) - pos.get(before.topicId)).toBeLessThanOrEqual(1);
  });

  it('never schedules on Sundays', async () => {
    const { data } = await call(generatePlan(RANGE));
    itemsOf(data.plan.id).forEach((i) => expect(weekdayIndex(i.date)).not.toBe(6));
  });

  it('uses holiday / exam dates when the school turns skipping off in settings', async () => {
    s.settings.skipHolidays = false;
    s.settings.skipExams = false;
    const { data } = await call(generatePlan(RANGE));
    const dates = itemsOf(data.plan.id).map((i) => i.date);
    expect(data.skippedDays).toEqual([]);
    BLOCKED.forEach((d) => expect(dates).toContain(d));
  });

  it('fails when every day in the range is a holiday', async () => {
    const plansBefore = s.plans.length;
    await expect(
      call(generatePlan({ ...VALID, startDate: '2026-09-30', endDate: '2026-09-30' })),
    ).rejects.toThrow(/Nothing to plan/);
    expect(s.plans).toHaveLength(plansBefore);
  });
});

describe('TC-07 Verify existing lesson is not overwritten', () => {
  // The seed already has an approved 8-A Science plan for this week (21–26 Sep).
  const OVERLAP = { ...VALID, startDate: '2026-09-21', endDate: '2026-10-03' };
  const existingLessons = () => s.items.filter((i) => i.sectionId === 's8a' && i.subjectId === 'sci');

  it('leaves the existing lessons exactly as they were', async () => {
    const snapshot = structuredClone(existingLessons());
    expect(snapshot.length).toBeGreaterThan(0);

    await call(generatePlan(OVERLAP));

    snapshot.forEach((old) => expect(s.items.find((i) => i.id === old.id)).toEqual(old));
  });

  it('puts the new lessons only in periods that were still free', async () => {
    const taken = new Set(existingLessons().map(key));
    const { data } = await call(generatePlan(OVERLAP));
    const items = itemsOf(data.plan.id);

    expect(items.length).toBeGreaterThan(0);
    items.forEach((i) => expect(taken.has(key(i))).toBe(false));
  });

  it('never creates two live lessons in the same period', async () => {
    await call(generatePlan(OVERLAP));
    const live = existingLessons().filter(
      (i) => ![LESSON_STATUS.CANCELLED, LESSON_STATUS.RESCHEDULED].includes(i.status),
    );
    expect(new Set(live.map(key)).size).toBe(live.length);
  });

  it('fails without touching anything when every period is already planned', async () => {
    const snapshot = structuredClone(s.items);
    await expect(
      call(generatePlan({ ...VALID, startDate: '2026-09-21', endDate: '2026-09-26' })),
    ).rejects.toThrow(/already planned/);
    expect(s.items).toEqual(snapshot);
  });

  it('engine: a taken slot is skipped and the topic goes to the next valid slot', () => {
    const syllabus = buildSyllabus().find((x) => x.classId === 'c8' && x.subjectId === 'sci');
    const first = flatTopics(syllabus)[0];
    const slots = [
      { weekday: 0, periodId: 'p1' },
      { weekday: 0, periodId: 'p3' },
    ];
    const { placed } = generatePlanItems({
      syllabus,
      slots,
      startDate: '2026-10-19',
      endDate: '2026-10-19',
      holidays: [],
      exams: [],
      existingItems: [],
      alreadyPlannedKeys: new Set(['2026-10-19|p1']),
    });
    expect(placed).toEqual([{ date: '2026-10-19', periodId: 'p3', topic: first }]);
  });

  it('does not overwrite a lesson that was cancelled (its period is free again)', async () => {
    const victim = existingLessons().find((i) => i.date === '2026-09-26');
    victim.status = LESSON_STATUS.CANCELLED;
    const { data } = await call(generatePlan(OVERLAP));
    expect(itemsOf(data.plan.id).some((i) => key(i) === key(victim))).toBe(true);
    expect(s.items.find((i) => i.id === victim.id).status).toBe(LESSON_STATUS.CANCELLED);
  });
});