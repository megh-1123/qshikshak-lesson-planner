// Shared constants for the Lesson Planner module

export const ROLES = {
  TEACHER: 'teacher',
  HOD: 'hod',
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  PARENT: 'parent',
};

export const ROLE_LABELS = {
  teacher: 'Teacher',
  hod: 'HOD',
  admin: 'Admin',
  principal: 'Principal',
  parent: 'Parent',
};

// Status of a single lesson (one period)
export const LESSON_STATUS = {
  PLANNED: 'planned',
  COMPLETED: 'completed',
  PARTIAL: 'partial',
  NOT_DONE: 'not_done',
  RESCHEDULED: 'rescheduled',
  CANCELLED: 'cancelled',
};

export const STATUS_META = {
  empty: { label: 'Empty', color: 'var(--st-empty)' },
  planned: { label: 'Planned', color: 'var(--st-planned)' },
  completed: { label: 'Completed', color: 'var(--st-completed)' },
  partial: { label: 'Partly done', color: 'var(--st-partial)' },
  not_done: { label: 'Not done', color: 'var(--st-notdone)' },
  rescheduled: { label: 'Rescheduled', color: 'var(--st-rescheduled)' },
  cancelled: { label: 'Cancelled', color: 'var(--st-cancelled)' },
};

// Status of a whole plan (approval workflow)
export const PLAN_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  RETURNED: 'returned',
};

export const PLAN_STATUS_META = {
  draft: { label: 'Draft', color: 'var(--st-empty)' },
  submitted: { label: 'Waiting for HOD', color: 'var(--st-partial)' },
  approved: { label: 'Approved', color: 'var(--st-completed)' },
  returned: { label: 'Sent back', color: 'var(--st-notdone)' },
};

export const TEACHING_METHODS = [
  'Lecture',
  'Demonstration',
  'Discussion',
  'Group activity',
  'Project-based learning',
  'Practical / Lab',
  'Question & answer',
  'Digital / Multimedia',
  'Flipped classroom',
  'Other',
];

export const UNDERSTANDING = ['Good', 'Average', 'Needs improvement'];

// Bell schedule – same as Timetables › Classes
export const BELL_SCHEDULE = [
  { id: 'asm', type: 'assembly', label: 'Assembly (20 min)', start: '08:40', end: '09:00' },
  { id: 'p1', type: 'period', label: 'Period 1', start: '09:00', end: '09:40' },
  { id: 'p2', type: 'period', label: 'Period 2', start: '09:40', end: '10:20' },
  { id: 'p3', type: 'period', label: 'Period 3', start: '10:20', end: '11:00' },
  { id: 'b1', type: 'break', label: 'Morning Session Break (15 min)', start: '11:00', end: '11:15' },
  { id: 'p4', type: 'period', label: 'Period 4', start: '11:15', end: '11:55' },
  { id: 'p5', type: 'period', label: 'Period 5', start: '11:55', end: '12:35' },
  { id: 'lunch', type: 'break', label: 'Lunch Break (35 min)', start: '12:35', end: '13:10' },
  { id: 'p6', type: 'period', label: 'Period 6', start: '13:10', end: '14:00' },
  { id: 'p7', type: 'period', label: 'Period 7', start: '14:00', end: '14:40' },
  { id: 'p8', type: 'period', label: 'Period 8', start: '14:40', end: '15:20' },
  { id: 'b2', type: 'break', label: 'Afternoon Session Break (10 min)', start: '15:20', end: '15:30' },
  { id: 'study', type: 'study', label: 'Study Hour (90 min)', start: '15:30', end: '17:00' },
];

export const PERIODS = BELL_SCHEDULE.filter((b) => b.type === 'period');
export const periodById = (id) => BELL_SCHEDULE.find((b) => b.id === id);

export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const BOARDS = ['SSC', 'CBSE', 'ICSE'];
