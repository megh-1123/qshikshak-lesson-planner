// Test Scenario TS-01: Lesson plan workflow – Create → Submit → HOD Approval
// One end-to-end story that uses the same plan through every step.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generatePlan, updateItem, submitPlan, getPlans, getPlan, reviewPlan } from '@/services/mock/api';
import { PLAN_STATUS, LESSON_STATUS } from '@/utils/constants';
import { freshDb, call, itemsOf, planById } from '@/test/mockApi';

const TEACHER = 't1'; // Priya Sharma
const HOD = 't3'; // Anitha Rao

const PLAN = {
  teacherId: TEACHER,
  classId: 'c8',
  sectionId: 's8a',
  subjectId: 'sci',
  startDate: '2026-09-28',
  endDate: '2026-10-03', // includes holidays on 30 Sep and 2 Oct
};

let s;
beforeEach(() => {
  s = freshDb();
});
afterEach(() => vi.useRealTimers());

const notesFor = (to) => s.notifications.filter((n) => n.to === to);
const fillDetails = async (planId) => {
  for (const i of itemsOf(planId))
    await call(updateItem(i.id, { details: { objectives: ['Explain pressure'], method: 'Demonstration' } }));
};

describe('TS-01 Lesson plan workflow: Create → Submit → HOD Approval', () => {
  it('happy path: teacher creates and submits, HOD approves', async () => {
    // Step 1 – Teacher creates the plan (TC-03, TC-06)
    const created = await call(generatePlan(PLAN));
    const planId = created.data.plan.id;
    expect(created.data.plan.status).toBe(PLAN_STATUS.DRAFT);
    expect(created.data.placedCount).toBeGreaterThan(0);
    expect(created.data.skippedDays).toEqual(['2026-09-30', '2026-10-02']);
    itemsOf(planId).forEach((i) => expect(i.status).toBe(LESSON_STATUS.PLANNED));

    // Step 2 – Submitting before filling details is blocked (TC-09)
    itemsOf(planId).forEach((i) => (i.details = { ...i.details, objectives: [], method: '' }));
    await expect(call(submitPlan(planId))).rejects.toThrow(/missing objectives or teaching method/);
    expect(planById(planId).status).toBe(PLAN_STATUS.DRAFT);

    // Step 3 – Teacher fills the lesson details and submits (TC-08, TC-10)
    await fillDetails(planId);
    const submitted = await call(submitPlan(planId));
    expect(submitted.message).toBe('Plan sent to HOD');
    expect(planById(planId).status).toBe(PLAN_STATUS.SUBMITTED);
    expect(notesFor(HOD)[0].title).toBe('New plan to review');

    // Step 4 – HOD sees it in the approval queue and opens it (TC-13)
    const queue = await call(getPlans({ userId: HOD, role: 'hod', status: PLAN_STATUS.SUBMITTED }));
    expect(queue.data.map((p) => p.id)).toContain(planId);
    const detail = await call(getPlan(planId));
    expect(detail.data.items).toHaveLength(itemsOf(planId).length);

    // Step 5 – HOD approves (TC-14)
    const approved = await call(reviewPlan(planId, { action: 'approved', comment: 'Looks good.', reviewerId: HOD }));
    expect(approved.message).toBe('Plan approved');
    expect(planById(planId).status).toBe(PLAN_STATUS.APPROVED);

    // Step 6 – Teacher is told, and the plan can't be reviewed again (TC-14, TC-17)
    expect(notesFor(TEACHER)[0].text).toBe('Your Class 8-A Science plan was approved by Anitha Rao (HOD).');
    await expect(
      call(reviewPlan(planId, { action: 'approved', comment: '', reviewerId: HOD })),
    ).rejects.toThrow(/already reviewed/);
  });

  it('sent-back path: HOD returns the plan, teacher fixes and resubmits, HOD approves', async () => {
    // Step 1 – Teacher creates, fills and submits
    const planId = (await call(generatePlan(PLAN))).data.plan.id;
    await fillDetails(planId);
    await call(submitPlan(planId));
    expect(planById(planId).status).toBe(PLAN_STATUS.SUBMITTED);

    // Step 2 – HOD tries to send back without a comment – blocked (TC-16)
    await expect(
      call(reviewPlan(planId, { action: 'returned', comment: '', reviewerId: HOD })),
    ).rejects.toThrow('Add a comment so the teacher knows what to change.');

    // Step 3 – HOD sends it back with a comment (TC-15)
    const comment = 'Add a hands-on activity for pressure.';
    await call(reviewPlan(planId, { action: 'returned', comment, reviewerId: HOD }));
    expect(planById(planId).status).toBe(PLAN_STATUS.RETURNED);
    expect(notesFor(TEACHER)[0].title).toBe('Plan sent back');
    expect(notesFor(TEACHER)[0].text).toContain(comment);

    // Step 4 – Teacher updates a lesson and resubmits (TC-12)
    await call(updateItem(itemsOf(planId)[0].id, { details: { activities: 'Pressure demo with a syringe' } }));
    await call(submitPlan(planId));
    expect(planById(planId).status).toBe(PLAN_STATUS.SUBMITTED);

    // Step 5 – HOD approves the corrected plan
    await call(reviewPlan(planId, { action: 'approved', comment: 'Better now.', reviewerId: HOD }));
    expect(planById(planId).status).toBe(PLAN_STATUS.APPROVED);

    // Step 6 – Full review history is kept
    expect(planById(planId).reviews.map((r) => r.action)).toEqual(['returned', 'approved']);
  });
});