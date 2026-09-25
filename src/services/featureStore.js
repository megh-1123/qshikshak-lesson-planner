// Extra data for the admin/parent pages (classes, holidays, exams, homework), kept in localStorage.
// Holidays and exams are also copied into the planner store so planning skips them.
import { db, save as savePlannerDb } from '@/services/mock/mockDb';

const KEY = 'qshikshak-lesson-planner-extra-v1';
const now = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const plusDays = (n) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const defaults = {
  classes: Array.from({ length: 10 }, (_, i) => ({ id: `class-${i + 1}`, name: `Class ${i + 1}` })),
  sections: ['A', 'B', 'C', 'D'].flatMap((name) =>
    ['class-8', 'class-9', 'class-10'].map((classId) => ({ id: `${classId}-${name}`, classId, name })),
  ),
  subjects: ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi'].flatMap((name, i) =>
    ['class-8', 'class-9', 'class-10'].map((classId) => ({ id: `${classId}-subject-${i}`, classId, name })),
  ),
  holidays: [
    { id: 'hol-1', name: 'Gandhi Jayanti', date: `${now.getFullYear()}-10-02`, description: 'School holiday' },
    { id: 'hol-2', name: 'School Foundation Day', date: plusDays(18), description: 'No regular classes' },
  ],
  exams: [
    {
      id: 'exam-1',
      examName: 'Quarterly Examination',
      academicYear: '2026-2027',
      classId: 'class-8',
      section: 'A',
      subject: 'Mathematics',
      examDate: plusDays(30),
      startDate: plusDays(27),
      endDate: plusDays(34),
      classesPerWeek: 6,
      requiredPeriods: 30,
      revisionPeriods: 6,
      syllabusIncluded: 'Chapters 1-3',
      remarks: 'Complete revision before exam week',
    },
    {
      id: 'exam-2',
      examName: 'Half-Yearly Examination',
      academicYear: '2026-2027',
      classId: 'class-9',
      section: 'A',
      subject: 'Science',
      examDate: plusDays(65),
      startDate: plusDays(62),
      endDate: plusDays(70),
      classesPerWeek: 5,
      requiredPeriods: 42,
      revisionPeriods: 8,
      syllabusIncluded: 'Chapters 1-6',
      remarks: '',
    },
  ],
  homework: [
    {
      id: 'hw-1',
      title: 'Linear Equations Practice',
      description: 'Complete exercise 4.2, questions 1-10.',
      dueDate: plusDays(3),
      classId: 'class-8',
      subject: 'Mathematics',
      lesson: 'Linear Equations',
      complete: false,
    },
    {
      id: 'hw-2',
      title: 'Photosynthesis Diagram',
      description: 'Draw and label the photosynthesis process.',
      dueDate: plusDays(5),
      classId: 'class-8',
      subject: 'Science',
      lesson: 'Photosynthesis',
      complete: false,
    },
  ],
};
export function readFeatureStore() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return { ...defaults, ...JSON.parse(saved) };
  } catch {
    /* no-op */
  }
  writeFeatureStore(defaults);
  return JSON.parse(JSON.stringify(defaults));
}
export function writeFeatureStore(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* no-op */
  }
  try {
    const planner = db();
    planner.holidays = (data.holidays || []).map((h) => ({
      id: h.id,
      date: h.date,
      title: h.name,
      description: h.description || '',
    }));
    planner.exams = (data.exams || [])
      .filter((e) => e.examDate)
      .map((e) => ({ ...e, date: e.examDate, title: e.examName }));
    savePlannerDb();
  } catch {
    /* planner store may not be initialized yet */
  }
  return data;
}
export function updateFeatureStore(mutator) {
  const data = readFeatureStore();
  const next = mutator(JSON.parse(JSON.stringify(data))) || data;
  return writeFeatureStore(next);
}
export { uid };

export function calculateAvailableClasses({
  fromDate = iso(now),
  examDate,
  classesPerWeek = 5,
  holidays = [],
  examDates = [],
}) {
  if (!examDate) return 0;
  let cursor = new Date(`${fromDate}T12:00:00`);
  const end = new Date(`${examDate}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime()) || cursor >= end) return 0;
  const weekly = Math.max(1, Number(classesPerWeek) || 1);
  const teachingDays = weekly >= 6 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5].slice(0, weekly);
  const blocked = new Set([...holidays, ...examDates]);
  let count = 0;
  while (cursor < end) {
    const day = cursor.getDay();
    const dayIso = iso(cursor);
    if (teachingDays.includes(day) && !blocked.has(dayIso)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}
