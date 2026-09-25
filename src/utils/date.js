// Small date helpers (no library needed). All dates are handled as local "YYYY-MM-DD" strings.

export const toISO = (d) => {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
};

export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayISO = () => toISO(new Date());

export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

// Monday of the week that contains `iso`
export const startOfWeek = (iso) => {
  const d = parseISO(iso);
  const diff = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - diff);
  return toISO(d);
};

export const weekdayIndex = (iso) => (parseISO(iso).getDay() + 6) % 7; // Mon=0 … Sun=6

export const weekDates = (weekStart, days = 6) => Array.from({ length: days }, (_, i) => addDays(weekStart, i));

export const startOfMonth = (iso) => {
  const d = parseISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
};

export const addMonths = (iso, n) => {
  const d = parseISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1));
};

export const fmt = (iso, opts = { day: 'numeric', month: 'short' }) => parseISO(iso).toLocaleDateString('en-IN', opts);

export const fmtLong = (iso) =>
  parseISO(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const fmtMonth = (iso) => parseISO(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

// "13:10" -> "01:10 PM"
export const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const hr = ((h + 11) % 12) + 1;
  return `${String(hr).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// Group an array into { key: [items] }
export const groupBy = (list, keyFn) =>
  list.reduce((acc, x) => {
    const k = keyFn(x);
    (acc[k] = acc[k] || []).push(x);
    return acc;
  }, {});
