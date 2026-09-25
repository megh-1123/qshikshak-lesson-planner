import {
  BadgeCheck,
  BarChart3,
  BookCopy,
  CalendarCheck2,
  CalendarRange,
  CheckSquare,
  ClipboardList,
  History,
  ListTree,
  Settings,
  GraduationCap,
  Palmtree,
  School,
  NotebookTabs,
} from 'lucide-react';

export const LP_BASE = '/lesson-planner';

export const lpPages = [
  { path: 'today', label: 'Today', icon: CalendarCheck2, roles: ['teacher'] },
  { path: 'calendar', label: 'Timetable', icon: CalendarRange, roles: ['teacher', 'hod', 'admin', 'principal'] },
  {
    path: 'plans',
    label: 'Plans',
    teacherLabel: 'My plans',
    icon: ClipboardList,
    roles: ['teacher', 'hod', 'admin', 'principal'],
  },
  { path: 'syllabus', label: 'Syllabus', icon: ListTree, roles: ['teacher', 'admin', 'hod', 'principal'] },
  { path: 'delivery', label: 'Delivery', icon: CheckSquare, roles: ['teacher'] },
  { path: 'history', label: 'History', icon: History, roles: ['teacher', 'hod', 'admin', 'principal'] },
  { path: 'examinations', label: 'Examinations', icon: GraduationCap, roles: ['admin', 'principal', 'hod'] },
  { path: 'approvals', label: 'Approvals', icon: BadgeCheck, roles: ['hod', 'principal'] },
  { path: 'reports', label: 'Reports', icon: BarChart3, roles: ['teacher', 'hod', 'admin', 'principal'] },
  { path: 'homework', label: 'Homework', icon: BookCopy, roles: ['teacher', 'parent'] },
  { path: 'lesson-information', label: 'Lesson Information', icon: NotebookTabs, roles: ['parent'] },
  { path: 'master-data', label: 'Classes & Subjects', icon: School, roles: ['admin'] },
  { path: 'holidays', label: 'Holidays', icon: Palmtree, roles: ['admin'] },
  { path: 'library', label: 'Lesson library', icon: BookCopy, roles: ['teacher', 'hod'] },
  { path: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

export const landingFor = (role) =>
  ({ teacher: 'today', hod: 'approvals', admin: 'syllabus', principal: 'reports', parent: 'homework' })[role] ||
  'calendar';
export const extraTitles = [
  { match: /\/plans\/new$/, title: 'Create plan' },
  { match: /\/plans\/[^/]+$/, title: 'Plan' },
];
