# Qshikshak – Lesson Planner (Frontend)

React + Vite frontend for the Lesson Planner module. It runs fully on **mock data** stored in the
browser (localStorage), so every screen works before the backend exists.

## Run it

```bash
npm install
cp .env.example .env      # VITE_USE_MOCK=true by default
npm run dev               # http://localhost:3002/lesson-planner
```

Use the **profile button (top right) → View as** to switch between Teacher, HOD, Admin, Principal and Parent.
To start again with fresh demo data: DevTools → Application → Local Storage → clear `localhost:3002`.

## Folder structure

```
src/
├── main.jsx                 entry – loads global styles and <App />
├── App.jsx                  router + providers
├── routes/                  routeConfig.js (menu, pages, who can see them) · AppRoutes.jsx
├── layout/                  DashboardLayout · Sidebar · Topbar
├── context/                 AppContext (role, user, masters, notifications) · ToastContext
├── hooks/                   useApi (load data) · useAction (save + toast)
├── styles/                  theme.css (colours) · global.css (buttons, cards, forms…) · planner.css (grid, calendar)
├── utils/
│   ├── constants.js         statuses, bell schedule, periods, roles
│   ├── date.js              date helpers
│   ├── freePeriods.js       is a period this class's own period, a free period, or busy?
│   └── exportFile.js        Excel / PDF export
├── components/
│   ├── common/              Card, Modal, Tabs, Switch, StatusBadge, ProgressBar, EmptyState, ThemeToggle
│   └── lesson-planner/
│       PlannerGrid          timetable grid + drag & drop (swap / move / continue)
│       CalendarViews        month and day views
│       LessonDetail         read view + actions (Edit, Reschedule, Add periods, Edit marking…)
│       LessonForm           edit lesson details
│       CompletionForm       mark a lesson (done / partly done / not done) and edit the marking
│       AddPeriodsModal      extend a class: give a topic extra periods
│       RescheduleModal      reschedule / cancel
│       FilterBar · ProgressBars · ReviewPanel · TimePlanBar
│       useLessonModals      one hook that opens all the lesson dialogs above
├── pages/lesson-planner/    one file per screen (Today, Calendar, Plans, PlanDetail, Holidays, …)
└── services/
    ├── apiClient.js         axios + school / year / board headers
    ├── lessonPlannerApi.js  ALL API calls – switches between mock and real backend
    ├── featureStore.js      data for Classes & Subjects, Holidays, Exams, Homework pages
    ├── holidayScheduler.js  sudden holiday → push that day's lessons forward
    └── mock/                in-browser backend (delete when the real API is ready)
        ├── seed.js          demo classes, staff, timetable, syllabus
        ├── mockDb.js        localStorage database + plan creation
        ├── engine.js        auto-fill a plan, coverage, AI suggestion
        └── api/             the mock API, split by topic
            ├── index.js       exports everything below
            ├── helpers.js     ok / fail, lookups, shared lesson helpers
            ├── scheduling.js  continue a partly done topic / undo it
            ├── dashboard.js   masters, today, calendar
            ├── plans.js       plans + extend plan
            ├── lessons.js     edit, mark, reschedule, drag & drop, add periods
            ├── syllabus.js    history, library, syllabus
            ├── reports.js     reports, notifications
            └── settings.js    settings, templates, reset, AI
```

**CSS rule:** shared styles live in `src/styles/`. A component or page has its own `.css` file
**only if it has styles of its own** (e.g. `PlannerGrid.css`, `HolidaysPage.css`) – no empty CSS files.

## Features added on top of the base planner

| Feature | Where |
|---|---|
| Sudden holiday – lessons that day move forward instead of being cancelled | Admin → Holidays (tick *Sudden / unexpected holiday*) |
| Partly done / Not done – topic continues automatically in the next period of that class | Mark lesson |
| Drag & drop – green = free period, orange = this class's period; swap, move or continue | Calendar (week) and plan page |
| Edit marking – change Done / Partly done / Not done later | Click a marked lesson → *Edit marking* |
| Extend plan – add the next syllabus topics up to a new end date | Plan page → *Extend plan* |
| Extend a class – give a topic +1…+5 periods (next class periods or free periods) | Click a lesson → *Add periods* |

## Connect the real backend later

1. In `.env` set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL=http://localhost:5000/api`.
2. The backend must answer every call with `{ success, data, message }`.
3. All calls are in `src/services/lessonPlannerApi.js` – nothing else needs to change.
   Endpoints added for the new features:
   `POST /plan-items/:id/continue` · `POST /plan-items/:id/move` · `POST /plan-items/:id/add-periods` · `POST /plans/:id/extend`.
4. The rules in `services/mock/api/scheduling.js` and `lessons.js` show exactly what the backend must do.

## Formatting

Code is formatted with Prettier (`.prettierrc`). In VS Code, install the *Prettier* extension and turn on *Format on Save*.
