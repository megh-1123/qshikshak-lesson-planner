// History, lesson library and syllabus.
import { todayISO } from '@/utils/date';
import { LESSON_STATUS, PLAN_STATUS, periodById } from '@/utils/constants';
import { sortItems } from '../engine';
import { db, save, uid } from '../mockDb';
import { ok, fail, byId, enrich, canSeeAll, syllabusFor } from './helpers';

export const getHistory = ({ userId, role, q, classId, sectionId, subjectId, teacherId, status, from, to }) => {
  const all = db().items;
  // Past lessons, anything marked / rescheduled / cancelled, and the new copy of a rescheduled lesson
  let items = all.filter((i) => i.date <= todayISO() || i.status !== LESSON_STATUS.PLANNED || i.rescheduledFrom);
  if (!canSeeAll(role)) items = items.filter((i) => i.teacherId === userId);
  if (classId) items = items.filter((i) => i.classId === classId);
  if (sectionId) items = items.filter((i) => i.sectionId === sectionId);
  if (subjectId) items = items.filter((i) => i.subjectId === subjectId);
  if (teacherId) items = items.filter((i) => i.teacherId === teacherId);
  if (status) items = items.filter((i) => i.status === status);
  if (from) items = items.filter((i) => i.date >= from);
  if (to) items = items.filter((i) => i.date <= to);
  if (q) {
    const k = q.toLowerCase();
    items = items.filter((i) => `${i.topicTitle} ${i.chapterTitle}`.toLowerCase().includes(k));
  }

  // "Moved to / moved from" details (also works for lessons rescheduled before these fields existed)
  const lastReason = (i) => [...(i.history || [])].reverse().find((h) => h.reason)?.reason || '';
  const withLabel = (m) => m && { ...m, periodLabel: periodById(m.periodId)?.label };
  const moveInfo = (i) => {
    let movedTo = i.movedTo;
    if (!movedTo && i.rescheduledTo) {
      const c = byId(all, i.rescheduledTo);
      if (c) movedTo = { date: c.date, periodId: c.periodId, reason: lastReason(i) };
    }
    let movedFrom = i.movedFrom;
    if (!movedFrom && i.rescheduledFrom) {
      const o = byId(all, i.rescheduledFrom);
      if (o) movedFrom = { date: o.date, periodId: o.periodId, reason: lastReason(o) };
    }
    return { movedTo: withLabel(movedTo), movedFrom: withLabel(movedFrom) };
  };

  return ok(items.map((i) => ({ ...enrich(i), ...moveInfo(i) })).sort((a, b) => -sortItems(a, b)));
};

export const getLibrary = ({ q, subjectId, topicId }) => {
  let items = db().items.filter(
    (i) =>
      i.details?.objectives?.length &&
      (i.status === LESSON_STATUS.COMPLETED || byId(db().plans, i.planId)?.status === PLAN_STATUS.APPROVED),
  );
  if (subjectId) items = items.filter((i) => i.subjectId === subjectId);
  if (topicId) items = items.filter((i) => i.topicId === topicId);
  if (q) {
    const k = q.toLowerCase();
    items = items.filter((i) => `${i.topicTitle} ${i.chapterTitle}`.toLowerCase().includes(k));
  }
  const unique = [...new Map(items.map((i) => [`${i.topicId}|${i.teacherId}`, i])).values()];
  return ok(unique.map(enrich));
};

export const getSyllabus = ({ classId, subjectId }) => ok(syllabusFor(classId, subjectId) || null);

export const saveSyllabus = (syl) => {
  const s = db();
  const clean = {
    ...syl,
    id: syl.id || uid('syl'),
    chapters: syl.chapters.map((c, ci) => ({
      ...c,
      id: c.id || uid('ch'),
      order: ci + 1,
      topics: c.topics.map((t, ti) => ({
        ...t,
        id: t.id || uid('tp'),
        chapterId: c.id,
        order: ti + 1,
        estPeriods: Number(t.estPeriods) || 1,
        subtopics: t.subtopics?.length ? t.subtopics : [t.title],
      })),
    })),
  };
  clean.chapters.forEach((c) =>
    c.topics.forEach((t) => {
      t.chapterId = c.id;
    }),
  );
  s.syllabus = s.syllabus
    .filter((x) => !(x.classId === clean.classId && x.subjectId === clean.subjectId))
    .concat(clean);
  save();
  return ok(clean, 'Syllabus saved');
};

// rows: [{ Chapter, Topic, Periods, Subtopics }]
export const importSyllabus = ({ classId, subjectId, board, rows }) => {
  const chapters = [];
  rows.forEach((r) => {
    const chName = String(r.Chapter || r.chapter || '').trim();
    const tpName = String(r.Topic || r.topic || '').trim();
    if (!chName || !tpName) return;
    let ch = chapters.find((c) => c.title === chName);
    if (!ch) {
      ch = { title: chName, term: r.Term || 'Term 1', topics: [] };
      chapters.push(ch);
    }
    ch.topics.push({
      title: tpName,
      estPeriods: Number(r.Periods || r.periods) || 1,
      subtopics: String(r.Subtopics || '')
        .split(';')
        .map((x) => x.trim())
        .filter(Boolean),
    });
  });
  if (!chapters.length) return fail('No rows found. The sheet needs columns: Chapter, Topic, Periods, Subtopics.');
  return saveSyllabus({ classId, subjectId, board, chapters });
};
