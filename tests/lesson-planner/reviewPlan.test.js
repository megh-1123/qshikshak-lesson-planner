// 4. Review Lesson Plan (HOD side, principal as backup)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generatePlan, submitPlan, reviewPlan, updateItem, getPlan, getPlans } from '@/services/mock/api';
import { PLAN_STATUS } from '@/utils/constants';
import { freshDb, call, itemsOf, planById } from '@/test/mockApi';

const HOD = 't3'; // Anitha Rao
const PRINCIPAL = 'p1'; // Dr. Meena Iyer
const TEACHER = 't1'; // Priya Sharma

let s;
let planId;

const notesFor = (to) => s.notifications.filter((n) => n.to === to);
const approve = (id, reviewerId = HOD, comment = 'Looks good.') =>
  call(reviewPlan(id, { action: 'approved', comment, reviewerId }));
const sendBack = (id, comment, reviewerId = HOD) => call(reviewPlan(id, { action: 'returned', comment, reviewerId }));

// Teacher creates a plan, fills every lesson and submits it
beforeEach(async () => {
  s = freshDb();
  const { data } = await call(
    generatePlan({
      teacherId: TEACHER,
      classId: 'c8',
      sectionId: 's8a',
      subjectId: 'sci',
      startDate: '2026-09-28',
      endDate: '2026-10-03',
    }),
  );
  planId = data.plan.id;
  for (const i of itemsOf(planId))
    await call(updateItem(i.id, { details: { objectives: ['Explain pressure'], method: 'Demonstration' } }));
  await call(submitPlan(planId));
});
afterEach(() => vi.useRealTimers());

describe('TC-13 HOD sees submitted plans waiting for review', () => {
  it('lists plans from every teacher with status "submitted"', async () => {
    const { data } = await call(getPlans({ userId: HOD, role: 'hod', status: PLAN_STATUS.SUBMITTED }));
    expect(data.map((p) => p.id)).toContain(planId);
    expect(new Set(data.map((p) => p.teacherId))).toEqual(new Set(['t1', 't2']));
    data.forEach((p) => expect(p.status).toBe(PLAN_STATUS.SUBMITTED));
  });

  it('shows teacher, class, subject, lesson count and submitted date', async () => {
    const { data } = await call(getPlans({ userId: HOD, role: 'hod', status: PLAN_STATUS.SUBMITTED }));
    expect(data.find((p) => p.id === planId)).toMatchObject({
      teacherName: 'Priya Sharma',
      classLabel: 'Class 8-A',
      subjectName: 'Science',
      total: itemsOf(planId).length,
      submittedAt: expect.any(String),
    });
  });

  it('opens the plan with all lessons for review', async () => {
    const { data } = await call(getPlan(planId));
    expect(data.plan.status).toBe(PLAN_STATUS.SUBMITTED);
    expect(data.items).toHaveLength(itemsOf(planId).length);
    data.items.forEach((i) => expect(i.details.objectives.length).toBeGreaterThan(0));
  });
});

describe('TC-14 HOD approves a plan', () => {
  it('changes the plan status to "approved"', async () => {
    const res = await approve(planId);
    expect(res.message).toBe('Plan approved');
    expect(res.data.status).toBe(PLAN_STATUS.APPROVED);
    expect(planById(planId).status).toBe(PLAN_STATUS.APPROVED);
  });

  it('records who approved it, when, and the comment', async () => {
    await approve(planId, HOD, 'Nice activities.');
    expect(planById(planId).reviews).toEqual([
      { id: expect.any(String), by: HOD, action: 'approved', comment: 'Nice activities.', at: expect.any(String) },
    ]);
  });

  it('allows approving without a comment', async () => {
    await expect(approve(planId, HOD, '')).resolves.toMatchObject({ success: true });
  });

  it('notifies the teacher', async () => {
    await approve(planId);
    expect(notesFor(TEACHER)[0]).toMatchObject({
      title: 'Plan approved',
      text: 'Your Class 8-A Science plan was approved by Anitha Rao (HOD).',
      link: `/lesson-planner/plans/${planId}`,
      read: false,
    });
  });

  it('removes the plan from the waiting list and shows it under Approved', async () => {
    await approve(planId);
    const waiting = await call(getPlans({ userId: HOD, role: 'hod', status: PLAN_STATUS.SUBMITTED }));
    const approved = await call(getPlans({ userId: HOD, role: 'hod', status: PLAN_STATUS.APPROVED }));
    expect(waiting.data.map((p) => p.id)).not.toContain(planId);
    expect(approved.data.map((p) => p.id)).toContain(planId);
  });

  it('shows reviewer name and role on the plan page', async () => {
    await approve(planId);
    const { data } = await call(getPlan(planId));
    expect(data.plan.reviews[0]).toMatchObject({ byName: 'Anitha Rao', byRole: 'hod', action: 'approved' });
  });
});

describe('TC-15 HOD sends a plan back with a comment', () => {
  const COMMENT = 'Add a hands-on activity for pressure.';

  it('changes the plan status to "returned"', async () => {
    const res = await sendBack(planId, COMMENT);
    expect(res.message).toBe('Plan sent back');
    expect(planById(planId).status).toBe(PLAN_STATUS.RETURNED);
    expect(planById(planId).reviews.at(-1)).toMatchObject({ by: HOD, action: 'returned', comment: COMMENT });
  });

  it('notifies the teacher with the HOD’s comment', async () => {
    await sendBack(planId, COMMENT);
    expect(notesFor(TEACHER)[0]).toMatchObject({
      title: 'Plan sent back',
      text: `Your Class 8-A Science plan was sent back by Anitha Rao (HOD): “${COMMENT}”`,
    });
  });

  it('lets the teacher fix and resubmit – the plan returns to the queue with full history', async () => {
    await sendBack(planId, COMMENT);
    await call(submitPlan(planId));
    expect(planById(planId).status).toBe(PLAN_STATUS.SUBMITTED);

    await approve(planId);
    expect(planById(planId).reviews.map((r) => r.action)).toEqual(['returned', 'approved']);
  });
});

describe('TC-16 A comment is required when sending a plan back', () => {
  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['only spaces', '   '],
  ])('rejects when the comment is %s', async (_label, comment) => {
    const notesBefore = s.notifications.length;
    await expect(sendBack(planId, comment)).rejects.toThrow('Add a comment so the teacher knows what to change.');

    expect(planById(planId).status).toBe(PLAN_STATUS.SUBMITTED);
    expect(planById(planId).reviews).toEqual([]);
    expect(s.notifications).toHaveLength(notesBefore);
  });
});

describe('TC-17 A plan can only be reviewed once per submission', () => {
  it('rejects approving an already approved plan and names the reviewer', async () => {
    await approve(planId);
    await expect(approve(planId)).rejects.toThrow('This plan was already reviewed by Anitha Rao.');
    expect(planById(planId).reviews).toHaveLength(1);
  });

  it('rejects sending back an already approved plan', async () => {
    await approve(planId);
    await expect(sendBack(planId, 'Change it')).rejects.toThrow(/already reviewed/);
    expect(planById(planId).status).toBe(PLAN_STATUS.APPROVED);
  });

  it('rejects reviewing a draft that was never submitted', async () => {
    planById(planId).status = PLAN_STATUS.DRAFT;
    await expect(approve(planId)).rejects.toThrow(/already reviewed/);
  });

  it('rejects reviewing a plan that does not exist', async () => {
    await expect(approve('plan-missing')).rejects.toThrow('Plan not found.');
  });
});

describe('TC-18 Principal reviews when the HOD is busy', () => {
  it('lets the principal approve and tells both the teacher and the HOD', async () => {
    await approve(planId, PRINCIPAL);
    expect(planById(planId).status).toBe(PLAN_STATUS.APPROVED);
    expect(notesFor(TEACHER)[0].text).toBe('Your Class 8-A Science plan was approved by Dr. Meena Iyer (Principal).');
    expect(notesFor(HOD)[0]).toMatchObject({
      title: 'Principal approved a plan',
      text: "Dr. Meena Iyer approved Priya Sharma's Class 8-A Science plan on your behalf.",
    });
  });

  it('tells the HOD when the principal sends a plan back', async () => {
    await sendBack(planId, 'Needs a lab activity', PRINCIPAL);
    expect(notesFor(HOD)[0].title).toBe('Principal sent back a plan');
  });

  it('does not send the "on your behalf" note when the HOD reviews', async () => {
    const before = notesFor(HOD).length;
    await approve(planId, HOD);
    expect(notesFor(HOD)).toHaveLength(before);
  });

  it('first reviewer wins – the HOD cannot review after the principal', async () => {
    await approve(planId, PRINCIPAL);
    await expect(sendBack(planId, 'Too late', HOD)).rejects.toThrow('This plan was already reviewed by Dr. Meena Iyer.');
  });
});

describe('TC-19 Editing an approved plan needs approval again', () => {
  it('moves the plan back to draft when a lesson is edited (setting: reapprove)', async () => {
    await approve(planId);
    const res = await call(updateItem(itemsOf(planId)[0].id, { details: { homework: 'Read page 12' } }));
    expect(res.data.planStatusChanged).toBe(true);
    expect(planById(planId).status).toBe(PLAN_STATUS.DRAFT);
  });

  it('keeps it approved when the school allows edits after approval', async () => {
    s.settings.editAfterApproval = 'allow';
    await approve(planId);
    await call(updateItem(itemsOf(planId)[0].id, { details: { homework: 'Read page 12' } }));
    expect(planById(planId).status).toBe(PLAN_STATUS.APPROVED);
  });
});

// `it.fails` = passes today, turns red once the gap is fixed – then change to `it`.
describe('Known gaps – review', () => {
  it.fails('only the HOD or principal can review – a teacher cannot approve', async () => {
    await expect(approve(planId, TEACHER)).rejects.toThrow();
    expect(planById(planId).status).toBe(PLAN_STATUS.SUBMITTED);
  });

  it.fails('rejects an unknown review action instead of treating it as "sent back"', async () => {
    await expect(call(reviewPlan(planId, { action: 'maybe', comment: 'x', reviewerId: HOD }))).rejects.toThrow();
    expect(planById(planId).status).toBe(PLAN_STATUS.SUBMITTED);
  });
});