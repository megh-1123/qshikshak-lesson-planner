// Master data used by the mock API. In production all of this comes from
// existing Qshikshak modules (Master, Staff, Timetables, Events, Assessments).
import { addDays, startOfWeek, todayISO } from '@/utils/date';

export const classes = [
  { id: 'c7', name: 'Class 7' },
  { id: 'c8', name: 'Class 8' },
];

export const sections = [
  { id: 's7a', classId: 'c7', name: 'A' },
  { id: 's8a', classId: 'c8', name: 'A' },
  { id: 's8b', classId: 'c8', name: 'B' },
];

export const departments = [
  { id: 'd-sci', name: 'Science', hodId: 't3' },
  { id: 'd-math', name: 'Mathematics', hodId: 't3' },
  { id: 'd-lang', name: 'Languages', hodId: 't3' },
];

export const subjects = [
  { id: 'sci', name: 'Science', departmentId: 'd-sci' },
  { id: 'math', name: 'Mathematics', departmentId: 'd-math' },
  { id: 'eng', name: 'English', departmentId: 'd-lang' },
];

export const staff = [
  { id: 't1', name: 'Priya Sharma', role: 'teacher', departmentId: 'd-sci' },
  { id: 't2', name: 'Ravi Kumar', role: 'teacher', departmentId: 'd-math' },
  { id: 't5', name: 'Kavya Reddy', role: 'teacher', departmentId: 'd-lang' },
  { id: 't3', name: 'Anitha Rao', role: 'hod', departmentId: 'd-sci' },
  { id: 'a1', name: 'Suresh Varma', role: 'admin' },
  { id: 'p1', name: 'Dr. Meena Iyer', role: 'principal' },
  { id: 'pa1', name: 'Demo Parent', role: 'parent' },
];

// Which user is logged in for each role (demo only – comes from auth in production)
export const usersByRole = { teacher: 't1', hod: 't3', admin: 'a1', principal: 'p1', parent: 'pa1' };

// Timetable slots: weekday 0 = Monday … 5 = Saturday
const slot = (sectionId, subjectId, teacherId, list) =>
  list.map(([weekday, periodId]) => ({ sectionId, subjectId, teacherId, weekday, periodId }));

export const timetable = [
  ...slot('s8a', 'sci', 't1', [
    [0, 'p1'],
    [1, 'p3'],
    [2, 'p2'],
    [3, 'p6'],
    [4, 'p4'],
    [5, 'p2'],
  ]),
  ...slot('s8b', 'sci', 't1', [
    [0, 'p4'],
    [1, 'p6'],
    [2, 'p5'],
    [4, 'p1'],
    [5, 'p4'],
  ]),
  ...slot('s7a', 'sci', 't1', [
    [0, 'p6'],
    [2, 'p7'],
    [3, 'p2'],
    [4, 'p7'],
  ]),
  ...slot('s8a', 'math', 't2', [
    [0, 'p2'],
    [1, 'p1'],
    [2, 'p3'],
    [3, 'p1'],
    [4, 'p2'],
    [5, 'p1'],
  ]),
  ...slot('s8b', 'math', 't2', [
    [0, 'p3'],
    [1, 'p4'],
    [2, 'p1'],
    [3, 'p5'],
    [4, 'p6'],
  ]),
  ...slot('s8a', 'eng', 't5', [
    [0, 'p5'],
    [1, 'p2'],
    [2, 'p4'],
    [3, 'p3'],
    [4, 'p5'],
  ]),
];

// Syllabus: chapters -> topics (estPeriods = periods needed)
const t = (title, estPeriods, subtopics) => ({ title, estPeriods, subtopics });
const rawSyllabus = [
  {
    classId: 'c8',
    subjectId: 'sci',
    board: 'SSC',
    chapters: [
      [
        'Crop Production and Management',
        [
          t('Agricultural practices', 1, ['Kharif and rabi crops', 'Basic practices of crop production']),
          t('Preparation of soil', 1, ['Ploughing and tilling', 'Levelling']),
          t('Sowing and adding manure', 2, ['Seed selection', 'Manure vs fertilisers']),
          t('Irrigation and harvesting', 2, ['Sources of irrigation', 'Modern methods', 'Harvesting and storage']),
        ],
      ],
      [
        'Microorganisms: Friend and Foe',
        [
          t('Types of microorganisms', 2, ['Bacteria and fungi', 'Protozoa and algae', 'Viruses']),
          t('Useful microorganisms', 1, ['Making curd and bread', 'Medicines and vaccines']),
          t('Harmful microorganisms and diseases', 2, ['Diseases in humans', 'Diseases in plants and animals']),
          t('Food preservation', 1, ['Chemical methods', 'Heating, cooling and storage']),
        ],
      ],
      [
        'Force and Pressure',
        [
          t('Force – a push or a pull', 1, ['Definition of force', 'Interaction of forces']),
          t('Types of forces', 2, ['Contact forces', 'Non-contact forces', 'Examples from daily life']),
          t('Pressure', 2, ['Pressure = force / area', 'Pressure in liquids and gases']),
          t('Atmospheric pressure', 1, ['Evidence of atmospheric pressure']),
        ],
      ],
      [
        'Friction',
        [
          t('Factors affecting friction', 1, ['Nature of surfaces', 'Static and sliding friction']),
          t('Friction: a necessary evil', 1, ['Advantages', 'Disadvantages']),
          t('Increasing and reducing friction', 2, ['Lubricants', 'Ball bearings', 'Fluid friction']),
        ],
      ],
      [
        'Sound',
        [
          t('Sound is produced by vibration', 1, ['Vibrating objects', 'Human voice']),
          t('How sound travels', 1, ['Medium for sound', 'Hearing']),
          t('Amplitude, frequency and pitch', 2, ['Amplitude and loudness', 'Frequency and pitch']),
          t('Noise pollution', 1, ['Harmful effects', 'Ways to reduce noise']),
        ],
      ],
      [
        'Light',
        [
          t('Laws of reflection', 2, ['Angle of incidence and reflection', 'Regular and diffused reflection']),
          t('Multiple reflection', 1, ['Kaleidoscope', 'Periscope']),
          t('The human eye', 2, ['Parts of the eye', 'Care of eyes']),
        ],
      ],
    ],
  },
  {
    classId: 'c8',
    subjectId: 'math',
    board: 'SSC',
    chapters: [
      [
        'Rational Numbers',
        [
          t('Properties of rational numbers', 2),
          t('Representation on number line', 1),
          t('Rational numbers between two numbers', 1),
        ],
      ],
      [
        'Linear Equations in One Variable',
        [t('Solving equations', 2), t('Word problems', 2), t('Reducing equations to simpler form', 1)],
      ],
      [
        'Understanding Quadrilaterals',
        [t('Polygons and angle sum', 2), t('Kinds of quadrilaterals', 2), t('Special parallelograms', 1)],
      ],
      [
        'Squares and Square Roots',
        [t('Properties of square numbers', 1), t('Finding square roots', 2), t('Square roots of decimals', 1)],
      ],
      ['Comparing Quantities', [t('Percentages and discounts', 2), t('Simple and compound interest', 2)]],
    ],
  },
  {
    classId: 'c7',
    subjectId: 'sci',
    board: 'SSC',
    chapters: [
      ['Nutrition in Plants', [t('Modes of nutrition', 1), t('Photosynthesis', 2), t('Other modes of nutrition', 1)]],
      ['Nutrition in Animals', [t('Digestion in humans', 2), t('Digestion in ruminants', 1)]],
      ['Heat', [t('Hot and cold', 1), t('Measuring temperature', 1), t('Transfer of heat', 2)]],
      ['Acids, Bases and Salts', [t('Acids and bases', 1), t('Natural indicators', 1), t('Neutralisation', 1)]],
    ],
  },
];

export function buildSyllabus() {
  return rawSyllabus.map((s, si) => ({
    id: `syl-${s.classId}-${s.subjectId}`,
    classId: s.classId,
    subjectId: s.subjectId,
    board: s.board,
    chapters: s.chapters.map(([title, topics], ci) => {
      const chapterId = `ch-${si}-${ci}`;
      return {
        id: chapterId,
        title,
        order: ci + 1,
        term: ci < Math.ceil(s.chapters.length / 2) ? 'Term 1' : 'Term 2',
        topics: topics.map((tp, ti) => ({
          id: `tp-${si}-${ci}-${ti}`,
          chapterId,
          title: tp.title,
          order: ti + 1,
          estPeriods: tp.estPeriods,
          subtopics: tp.subtopics || [`Introduction to ${tp.title.toLowerCase()}`, 'Worked examples', 'Practice'],
        })),
      };
    }),
  }));
}

// Holidays (Events module) and exam days (Assessments module), relative to today
export function buildCalendar() {
  const ws = startOfWeek(todayISO());
  const year = new Date().getFullYear();
  return {
    holidays: [
      { date: addDays(ws, 9), title: 'Annual Day' },
      { date: `${year}-10-02`, title: 'Gandhi Jayanti' },
      { date: `${year}-08-15`, title: 'Independence Day' },
      { date: `${year}-01-26`, title: 'Republic Day' },
    ],
    exams: [
      { date: addDays(ws, 21), title: 'Unit Test 2' },
      { date: addDays(ws, 22), title: 'Unit Test 2' },
    ],
  };
}

// Lesson templates per board – fields render dynamically in the lesson form
const baseFields = [
  { key: 'objectives', label: 'Learning objectives', type: 'list', enabled: true, required: true },
  { key: 'prerequisites', label: 'Prerequisites', type: 'text', enabled: true, required: false },
  { key: 'method', label: 'Teaching method', type: 'method', enabled: true, required: true },
  { key: 'activities', label: 'Activities / procedure', type: 'textarea', enabled: true, required: false },
  { key: 'resources', label: 'Resources', type: 'resources', enabled: true, required: false },
  { key: 'assessment', label: 'Check for understanding', type: 'textarea', enabled: true, required: false },
  { key: 'homework', label: 'Homework', type: 'textarea', enabled: true, required: false },
];

export const templates = [
  { id: 'tpl-ssc', name: 'SSC standard', board: 'SSC', isDefault: true, fields: baseFields },
  {
    id: 'tpl-cbse',
    name: 'CBSE competency-based',
    board: 'CBSE',
    isDefault: false,
    fields: [
      ...baseFields,
      { key: 'competency', label: 'Learning outcome code', type: 'text', enabled: true, required: false },
    ],
  },
  {
    id: 'tpl-icse',
    name: 'ICSE standard',
    board: 'ICSE',
    isDefault: false,
    fields: [
      ...baseFields,
      { key: 'boardWork', label: 'Board work', type: 'textarea', enabled: true, required: false },
    ],
  },
];

export const defaultSettings = {
  approvalRequired: true,
  approver: 'hod',
  submissionDay: 'Saturday',
  dailyReminderTime: '18:00',
  autoShift: true,
  skipHolidays: true,
  skipExams: true,
  whatsappHomework: false,
  editAfterApproval: 'reapprove', // 'reapprove' | 'allow'
};
