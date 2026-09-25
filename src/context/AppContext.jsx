import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { setApiContext } from '@/services/apiClient';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Top bar context – in Qshikshak these come from the existing chips
  const [ctx] = useState({ school: 'one', year: '2024-2025', board: 'SSC' });
  // Demo role switch – in production the role comes from the logged-in user
  const [role, setRole] = useState(() => localStorage.getItem('lp-role') || 'teacher');
  const [masters, setMasters] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    setApiContext(ctx);
  }, [ctx]);
  useEffect(() => {
    try {
      localStorage.setItem('lp-role', role);
    } catch {
      /* ignore */
    }
  }, [role]);

  const loadMasters = useCallback(async () => {
    const res = await lessonPlannerApi.getMasters();
    setMasters(res.data);
  }, []);
  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  const user = useMemo(() => {
    if (!masters) return null;
    return masters.staff.find((s) => s.id === masters.usersByRole[role]);
  }, [masters, role]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const res = await lessonPlannerApi.getNotifications({ userId: user.id });
    setNotifications(res.data);
  }, [user]);
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Lookup helpers used across pages
  const helpers = useMemo(() => {
    if (!masters) return {};
    const find = (list, id) => masters[list].find((x) => x.id === id);
    return {
      className: (id) => find('classes', id)?.name,
      sectionsOf: (classId) => masters.sections.filter((s) => s.classId === classId),
      subjectName: (id) => find('subjects', id)?.name,
      staffName: (id) => find('staff', id)?.name,
      sectionLabel: (sectionId) => {
        const s = find('sections', sectionId);
        return s ? `${find('classes', s.classId).name}-${s.name}` : '';
      },
      // Class/section/subject combos the current teacher teaches (from timetable)
      myAssignments: (teacherId) => {
        const seen = new Map();
        masters.timetable
          .filter((t) => t.teacherId === teacherId)
          .forEach((t) => {
            const key = `${t.sectionId}|${t.subjectId}`;
            if (!seen.has(key)) {
              const sec = find('sections', t.sectionId);
              seen.set(key, { ...t, classId: sec.classId, periodsPerWeek: 0 });
            }
            seen.get(key).periodsPerWeek += 1;
          });
        return [...seen.values()];
      },
    };
  }, [masters]);

  const value = {
    ctx,
    role,
    setRole,
    user,
    masters,
    loadMasters,
    notifications,
    loadNotifications,
    setNotifications,
    ...helpers,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
