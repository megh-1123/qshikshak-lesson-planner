// Test helpers for the in-browser mock API.
import { vi } from 'vitest';
import { reset, db } from '@/services/mock/mockDb';

// Monday 21 Sep 2026. The seed data (holidays, exams, sample plans) is built
// relative to "today", so freezing the clock makes every test deterministic.
//   this week : 21–26 Sep      next week : 28 Sep – 3 Oct
//   holidays  : 30 Sep (Annual Day), 2 Oct (Gandhi Jayanti)
//   exams     : 12 Oct, 13 Oct (Unit Test 2)
export const TODAY = '2026-09-21';

export function freshDb() {
  vi.useFakeTimers({ now: new Date(`${TODAY}T10:00:00`), toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  localStorage.clear();
  reset();
  return db();
}

// Every mock API call waits ~250 ms to feel like a network call.
// `call` fast-forwards that delay and returns the result (or rethrows the error).
export async function call(promise) {
  const settled = Promise.resolve(promise).then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await vi.advanceTimersByTimeAsync(300);
  const r = await settled;
  if ('error' in r) throw r.error;
  return r.value;
}

export const itemsOf = (planId) => db().items.filter((i) => i.planId === planId);
export const planById = (planId) => db().plans.find((p) => p.id === planId);
export const key = (i) => `${i.date}|${i.periodId}`;