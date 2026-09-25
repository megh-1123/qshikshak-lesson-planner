// Single lessons (plan items): edit, swap, mark, reschedule, cancel,
// drag & drop (continue / move) and extra periods.
import { addDays, todayISO, weekdayIndex } from '@/utils/date';
import { LESSON_STATUS, PERIODS, PLAN_STATUS, periodById } from '@/utils/constants';
import { periodHasStarted, periodKind } from '@/utils/freePeriods';
import { staff, timetable } from '../seed';
import { sortItems } from '../engine';
import { db, emptyDetails, save, uid } from '../mockDb';
import {
  ok,
  fail,
  byId,
  sectionLabel,
  enrich,
  notify,
  syllabusFor,
  pickContent,
  isLive,
  periodIndex,
  isBlockedDay,
} from './helpers';
import { nextClassPeriod, continueCore, removeContinuation } from './scheduling';

export const updateItem = (id, patch) => {
  const s = db();
  const it = byId(s.items, id);
  if (!it) return fail('Lesson not found.');
  it.details = { ...(it.details || emptyDetails()), ...patch.details };
  if (patch.topicId) {
    const syl = syllabusFor(it.classId, it.subjectId);
    const ch = syl.chapters.find((c) => c.topics.some((t) => t.id === patch.topicId));
    const tp = ch.topics.find((t) => t.id === patch.topicId);
    Object.assign(it, { topicId: tp.id, topicTitle: tp.title, chapterId: ch.id, chapterTitle: ch.title });
  }
  it.history.push({ at: new Date().toISOString(), action: 'edited' });
  const plan = byId(s.plans, it.planId);
  let planStatusChanged = false;
  if (
    plan.status === PLAN_STATUS.APPROVED &&
    s.settings.approvalRequired &&
    s.settings.editAfterApproval === 'reapprove'
  ) {
    plan.status = PLAN_STATUS.DRAFT;
    planStatusChanged = true;
  }
  save();
  return ok({ item: enrich(it), planStatusChanged }, 'Lesson saved');
};

// Drag & drop: swap the lesson content of two planned periods in the same plan
export const swapItems = (aId, bId) => {
  const s = db();
  const a = byId(s.items, aId);
  const b = byId(s.items, bId);
  if (!a || !b || a.planId !== b.planId) return fail('Lessons can only be moved inside the same plan.');
  if (a.status !== LESSON_STATUS.PLANNED || b.status !== LESSON_STATUS.PLANNED)
    return fail('Only planned lessons can be moved.');
  const keys = ['topicId', 'topicTitle', 'chapterId', 'chapterTitle', 'details', 'continued', 'continuationOf'];
  keys.forEach((k) => {
    const t = a[k];
    a[k] = b[k];
    b[k] = t;
  });
  save();
  return ok(true, 'Lessons swapped');
};

export const completeItem = (id, completion) => {
  const s = db();
  const it = byId(s.items, id);
  if (!it) return fail('Lesson not found.');
  const before = it.status;
  const isEdit = before !== LESSON_STATUS.PLANNED;
  const unfinished = (st) => st === LESSON_STATUS.PARTIAL || st === LESSON_STATUS.NOT_DONE;
  it.status = completion.status;
  it.completion = { ...completion, at: new Date().toISOString() };
  it.history.push({
    at: new Date().toISOString(),
    action: isEdit ? `marking changed from ${before} to ${completion.status}` : `marked ${completion.status}`,
  });
  let shifted = [];
  let overflow = null;
  let continuedTo = null;
  let pulledBack = 0;
  const hasCopy = s.items.some((x) => x.continuationOf === it.id && x.status === LESSON_STATUS.PLANNED);

  // Edited from partly done / not done to done -> the extra period is no longer needed
  if (isEdit && unfinished(before) && completion.status === LESSON_STATUS.COMPLETED) {
    pulledBack = removeContinuation(s, it);
  }
  // Partly done / not done -> the topic automatically continues in the next available period of this class
  if (s.settings.autoShift && unfinished(completion.status) && !hasCopy) {
    const next = nextClassPeriod(s, it);
    try {
      if (!next) throw new Error('No free period found');
      const res = continueCore(s, it, next);
      shifted = res.changed.map(enrich);
      continuedTo = { ...next, periodLabel: periodById(next.periodId)?.label };
    } catch {
      overflow = { topicTitle: it.topicTitle };
    }
  }
  if (!isEdit && completion.sendHomework && it.details?.homework) {
    notify(
      it.teacherId,
      'Homework sent',
      `Homework for ${sectionLabel(it.sectionId)} was sent to parents.`,
      '/lesson-planner/history',
    );
  }
  save();
  return ok(
    { item: enrich(it), shifted, overflow, continuedTo, pulledBack },
    isEdit ? 'Marking updated' : 'Lesson marked',
  );
};

export const rescheduleItem = (id, { date, periodId, reason }) => {
  const s = db();
  const it = byId(s.items, id);
  if (!it) return fail('Lesson not found.');
  if (it.status !== LESSON_STATUS.PLANNED) return fail('Only planned lessons can be rescheduled.');
  if (!date || !periodId) return fail('Choose the new date and period.');
  if (!reason?.trim()) return fail('Add a reason. It stays in the lesson history.');
  if (periodHasStarted(date, periodId)) return fail('That period has already started or is over. Choose a later period.');
  if (isBlockedDay(s, date)) return fail('That date is a holiday or exam day.');
  if (!periodKind(timetable, it, date, periodId))
    return fail(`That period is not free for ${sectionLabel(it.sectionId)} and ${byId(staff, it.teacherId)?.name}.`);
  const clash = s.items.find(
    (i) =>
      i.id !== it.id &&
      i.date === date &&
      i.periodId === periodId &&
      isLive(i) &&
      (i.sectionId === it.sectionId || i.teacherId === it.teacherId),
  );
  if (clash) return fail(`That period already has “${clash.topicTitle}” (${sectionLabel(clash.sectionId)}).`);

  const now = new Date().toISOString();
  const why = reason.trim();
  const fromLabel = periodById(it.periodId)?.label;
  const toLabel = periodById(periodId)?.label;
  const copy = {
    ...JSON.parse(JSON.stringify(it)),
    id: uid('item'),
    date,
    periodId,
    status: LESSON_STATUS.PLANNED,
    completion: null,
    rescheduledFrom: it.id,
    // Saved on both lessons so History can show "moved from / moved to" and the reason
    movedFrom: { date: it.date, periodId: it.periodId, reason: why, at: now },
    history: [{ at: now, action: `rescheduled here from ${it.date} (${fromLabel})`, reason: why }],
  };
  delete copy.movedTo;
  delete copy.rescheduledTo;
  it.status = LESSON_STATUS.RESCHEDULED;
  it.rescheduledTo = copy.id;
  it.movedTo = { date, periodId, reason: why, at: now };
  it.history.push({ at: now, action: `rescheduled to ${date} (${toLabel})`, reason: why });
  s.items.push(copy);
  const plan = byId(s.plans, it.planId);
  if (plan && date > plan.endDate) plan.endDate = date;
  if (plan && date < plan.startDate) plan.startDate = date;
  save();
  return ok(enrich(copy), `Lesson moved to ${date}, ${toLabel}`);
};

export const cancelItem = (id, { reason }) => {
  const s = db();
  const it = byId(s.items, id);
  if (!it) return fail('Lesson not found.');
  if (!reason?.trim()) return fail('Add a reason. It stays in the lesson history.');
  it.status = LESSON_STATUS.CANCELLED;
  it.history.push({ at: new Date().toISOString(), action: 'cancelled', reason: reason.trim() });
  it.cancelReason = reason.trim();
  save();
  return ok(enrich(it), 'Lesson cancelled');
};

// Drag & drop a partly done / not done lesson to a later period
export const continueLesson = (id, { date, periodId }) => {
  const s = db();
  const it = byId(s.items, id);
  if (!it) return fail('Lesson not found.');
  try {
    continueCore(s, it, { date, periodId });
  } catch (e) {
    return fail(e.message);
  }
  save();
  return ok(true, `“${it.topicTitle}” continues on ${date}, ${periodById(periodId)?.label}`);
};

// Drag & drop a planned lesson into an empty period (its own class period or a free period).
// A move in the Timetable is a reschedule: the old spot is kept in History as "Rescheduled → moved to …"
export const moveItem = (id, { date, periodId }) =>
  rescheduleItem(id, { date, periodId, reason: 'Moved in the Timetable' });

// mode 'shift' – extra periods go into this class's next periods; later lessons move forward
//                (the last ones go into the next free class periods).
// mode 'free'  – extra periods go into the next free periods (class and teacher both free);
//                no other lesson moves. At most one extra period per day.
export const addPeriods = (id, { count = 1, mode = 'shift' }) => {
  const s = db();
  const it = byId(s.items, id);
  if (!it) return fail('Lesson not found.');
  if (!isLive(it)) return fail('This lesson was cancelled or rescheduled.');
  const n = Math.max(1, Math.min(10, Number(count) || 1));
  const today = todayISO();
  const now = new Date().toISOString();
  const extra = {
    ...pickContent(it),
    continued: true,
    continuationOf: null,
    details: JSON.parse(JSON.stringify(it.details || emptyDetails())),
  };
  const busyAt = (d, p) =>
    s.items.some(
      (x) =>
        x.date === d && x.periodId === p && isLive(x) && (x.sectionId === it.sectionId || x.teacherId === it.teacherId),
    );
  const planFor = (d) =>
    s.plans.find(
      (p) => p.sectionId === it.sectionId && p.subjectId === it.subjectId && p.startDate <= d && p.endDate >= d,
    ) || byId(s.plans, it.planId);
  const addItem = (slot, content, action) => {
    const plan = planFor(slot.date);
    if (slot.date > plan.endDate) plan.endDate = slot.date;
    const created = {
      id: uid('item'),
      planId: plan.id,
      teacherId: it.teacherId,
      classId: it.classId,
      sectionId: it.sectionId,
      subjectId: it.subjectId,
      date: slot.date,
      periodId: slot.periodId,
      status: LESSON_STATUS.PLANNED,
      completion: null,
      ...content,
      history: [{ at: now, action }],
    };
    s.items.push(created);
    return created;
  };
  const sortedDay = (list) => list.sort((a, b) => periodIndex(a.periodId) - periodIndex(b.periodId));

  // ---- free periods: nothing else moves ----
  if (mode === 'free') {
    const found = [];
    for (let d = it.date, k = 0; found.length < n && k < 90; d = addDays(d, 1), k++) {
      if (d < today || isBlockedDay(s, d)) continue;
      const cands = sortedDay(PERIODS.map((p) => ({ date: d, periodId: p.id }))).filter(
        (c) =>
          sortItems(c, it) > 0 &&
          !periodHasStarted(c.date, c.periodId) &&
          periodKind(timetable, it, c.date, c.periodId) === 'free' &&
          !busyAt(c.date, c.periodId),
      );
      if (cands.length) found.push(cands[0]); // one per day
    }
    if (found.length < n)
      return fail(`Only ${found.length} free period${found.length === 1 ? '' : 's'} found in the next 3 months.`);
    found.forEach((slot) => addItem(slot, extra, `extra period for “${it.topicTitle}”`));
    it.history.push({ at: now, action: `${n} extra period${n === 1 ? '' : 's'} added in free periods` });
    notify(
      it.teacherId,
      'Extra periods added',
      `“${it.topicTitle}” (${sectionLabel(it.sectionId)}) got ${n} extra period${n === 1 ? '' : 's'} in free periods: ${found.map((f) => `${f.date} ${periodById(f.periodId)?.label}`).join(', ')}.`,
      `/lesson-planner/plans/${it.planId}`,
    );
    save();
    return ok({ added: n, slots: found }, `${n} extra period${n === 1 ? '' : 's'} added in free periods`);
  }

  // ---- shift: extra periods right after this lesson, later lessons move forward ----
  const group = s.items
    .filter(
      (x) =>
        x.sectionId === it.sectionId &&
        x.subjectId === it.subjectId &&
        x.status === LESSON_STATUS.PLANNED &&
        sortItems(x, it) > 0,
    )
    .sort(sortItems);
  const slots = [...group];
  const mySlots = timetable.filter(
    (t) => t.sectionId === it.sectionId && t.subjectId === it.subjectId && t.teacherId === it.teacherId,
  );
  let last = slots.length ? slots[slots.length - 1] : it;
  for (let d = last.date, k = 0; slots.length < group.length + n && k < 180; d = addDays(d, 1), k++) {
    if (d < today || isBlockedDay(s, d)) continue;
    for (const t of sortedDay(mySlots.filter((x) => x.weekday === weekdayIndex(d)))) {
      const cand = { date: d, periodId: t.periodId };
      if (sortItems(cand, last) <= 0 || busyAt(d, t.periodId) || periodHasStarted(d, t.periodId)) continue;
      slots.push({ __new: true, ...cand });
      last = cand;
      if (slots.length === group.length + n) break;
    }
  }
  if (slots.length < group.length + n) return fail('Not enough class periods found in the next few months.');

  const contents = [...Array.from({ length: n }, () => ({ ...extra })), ...group.map(pickContent)];
  let moved = 0;
  slots.forEach((slot, i) => {
    const content = contents[i];
    if (slot.__new) {
      addItem(slot, content, i < n ? `extra period for “${it.topicTitle}”` : 'shifted after extra periods were added');
      return;
    }
    if (slot.topicId !== content.topicId || slot.continued !== content.continued) moved++;
    Object.assign(slot, content);
    slot.history.push({
      at: now,
      action: i < n ? `extra period for “${it.topicTitle}”` : 'shifted after extra periods were added',
    });
  });
  it.history.push({ at: now, action: `${n} extra period${n === 1 ? '' : 's'} added` });
  notify(
    it.teacherId,
    'Extra periods added',
    `“${it.topicTitle}” (${sectionLabel(it.sectionId)}) got ${n} extra period${n === 1 ? '' : 's'}. Later lessons moved forward.`,
    `/lesson-planner/plans/${it.planId}`,
  );
  save();
  return ok({ added: n, moved }, `${n} extra period${n === 1 ? '' : 's'} added – later lessons moved forward`);
};