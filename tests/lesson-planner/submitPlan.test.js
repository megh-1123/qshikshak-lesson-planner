// 3. Submit Lesson Plan (teacher side)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generatePlan, submitPlan, updateItem, getPlans } from '@/services/mock/api';
import { PLAN_STATUS } from '@/utils/constants';
import { freshDb, call, itemsOf, planById } from '@/test/mockApi';

const NEW_PLAN = {
  teacherId: 't1',
  classId: 'c8',
  sectionId: 's8a',
  subjectId: 'sci',
  startDate: '2026-09-28',
  endDate: '2026-10-03',
};
const DETAILS = { objectives: ['Explain pressure'], method: 'Demonstration' };

let s;
let planId;

const fillAll = async (id, details = DETAILS) => {
  for (const i of itemsOf(id)) await call(updateItem(i.id, { details }));
};
const notesFor = (to) => s.notifications.filter((n) => n.to === to);

beforeEach(async () => {
  s = freshDb();
  // Clear any pre-filled details so every test starts from a known state
  planId = (await call(generatePlan(NEW_PLAN))).data.plan.id;
  itemsOf(planId).forEach((i) => (i.details = { ...i.details, objectives: [], method: '' }));
});
afterEach(() => vi.useRealTimers());

describe('TC-08 Submit a plan with all lesson details filled', () => {
  it('moves the plan to "submitted" (Waiting for HOD)', async () => {
    await fillAll(planId);
    const res = await call(submitPlan(planId));

    expect(res.success).toBe(true);
    expect(res.message).toBe('Plan sent to HOD');
    expect(res.data.status).toBe(PLAN_STATUS.SUBMITTED);
    expect(planById(planId).status).toBe(PLAN_STATUS.SUBMITTED);
  });

  it('records when it was submitted', async () => {
    await fillAll(planId);
    const now = new Date().toISOString(); // fake clock
    await call(submitPlan(planId));
    expect(planById(planId).submittedAt).toBe(now);
  });

  it('returns the updated summary with no missing details', async () => {
    await fillAll(planId);
    const { data } = await call(submitPlan(planId));
    expect(data.missingDetails).toBe(0);
    expect(data.total).toBe(itemsOf(planId).length);
  });
});

describe('TC-09 Block submission when lesson details are missing', () => {
  it('rejects a plan whose lessons have no objectives or method', async () => {
    const n = itemsOf(planId).length;
    await expect(call(submitPlan(planId))).rejects.toThrow(
      `${n} lessons are missing objectives or teaching method. Fill them before submitting.`,
    );
    expect(planById(planId).status).toBe(PLAN_STATUS.DRAFT);
    expect(planById(planId).submittedAt).toBeNull();
  });

  it('uses the singular message when only one lesson is incomplete', async () => {
    await fillAll(planId);
    const [first] = itemsOf(planId);
    first.details.method = '';
    await expect(call(submitPlan(planId))).rejects.toThrow(
      '1 lesson is missing objectives or teaching method. Fill them before submitting.',
    );
  });

  it.each([
    ['objectives are empty', { objectives: [], method: 'Lecture' }],
    ['teaching method is empty', { objectives: ['Explain'], method: '' }],
  ])('rejects when %s', async (_label, details) => {
    await fillAll(planId);
    await call(updateItem(itemsOf(planId)[0].id, { details }));
    await expect(call(submitPlan(planId))).rejects.toThrow(/missing objectives or teaching method/);
    expect(planById(planId).status).toBe(PLAN_STATUS.DRAFT);
  });

  it('does not notify anyone when submission fails', async () => {
    const before = s.notifications.length;
    await call(submitPlan(planId)).catch(() => {});
    expect(s.notifications).toHaveLength(before);
  });

  it('ignores lessons that are already taught (only planned lessons are checked)', async () => {
    await fillAll(planId);
    const [first] = itemsOf(planId);
    first.details = { objectives: [], method: '' };
    first.status = 'completed';
    await expect(call(submitPlan(planId))).resolves.toMatchObject({ success: true });
  });
});

describe('TC-10 HOD and principal are informed on submission', () => {
  beforeEach(() => fillAll(planId));

  it('sends a "New plan to review" notification to the HOD', async () => {
    const before = notesFor('t3').length;
    await call(submitPlan(planId));
    const [note] = notesFor('t3');
    expect(notesFor('t3')).toHaveLength(before + 1);
    expect(note).toMatchObject({
      title: 'New plan to review',
      text: 'Priya Sharma submitted Class 8-A Science.',
      link: '/lesson-planner/approvals',
      read: false,
    });
  });

  it('lets the principal know as the backup reviewer', async () => {
    await call(submitPlan(planId));
    expect(notesFor('p1')[0]).toMatchObject({
      title: 'Plan waiting for HOD',
      link: `/lesson-planner/plans/${planId}`,
    });
  });

  it('shows the plan in the HOD approval queue', async () => {
    await call(submitPlan(planId));
    const { data } = await call(getPlans({ userId: 't3', role: 'hod', status: PLAN_STATUS.SUBMITTED }));
    expect(data.map((p) => p.id)).toContain(planId);
  });

  it('keeps the plan out of other teachers’ lists', async () => {
    await call(submitPlan(planId));
    const { data } = await call(getPlans({ userId: 't2', role: 'teacher' }));
    expect(data.map((p) => p.id)).not.toContain(planId);
  });
});

describe('TC-11 Submit when HOD approval is turned off', () => {
  beforeEach(async () => {
    s.settings.approvalRequired = false;
    await fillAll(planId);
  });

  it('approves the plan directly', async () => {
    const res = await call(submitPlan(planId));
    expect(res.message).toBe('Plan approved');
    expect(planById(planId).status).toBe(PLAN_STATUS.APPROVED);
  });

  it('does not notify the HOD or principal', async () => {
    const before = s.notifications.length;
    await call(submitPlan(planId));
    expect(s.notifications).toHaveLength(before);
  });
});

describe('TC-12 Resubmit a plan that was sent back', () => {
  it('goes back to "submitted" and keeps the earlier HOD comment', async () => {
    const returned = s.plans.find((p) => p.status === PLAN_STATUS.RETURNED);
    const res = await call(submitPlan(returned.id));
    expect(res.data.status).toBe(PLAN_STATUS.SUBMITTED);
    expect(returned.reviews.at(-1)).toMatchObject({ action: 'returned', by: 't3' });
  });
});

// `it.fails` = passes today, turns red once the gap is fixed – then change to `it`.
describe('Known gaps – submission', () => {
  it.fails('rejects submitting a plan that does not exist', async () => {
    await expect(call(submitPlan('plan-missing'))).rejects.toThrow('Plan not found.');
  });

  it.fails('rejects resubmitting a plan that is already approved', async () => {
    const approved = s.plans.find((p) => p.status === PLAN_STATUS.APPROVED && p.teacherId === 't1');
    await expect(call(submitPlan(approved.id))).rejects.toThrow();
    expect(approved.status).toBe(PLAN_STATUS.APPROVED);
  });

  it.fails('rejects submitting a plan that is already waiting for the HOD', async () => {
    await fillAll(planId);
    await call(submitPlan(planId));
    await expect(call(submitPlan(planId))).rejects.toThrow();
  });
});