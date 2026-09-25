import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data from an API function.
 *   const { data, loading, error, reload } = useApi(() => api.getPlans(params), [params]);
 */
export function useApi(fn, deps = [], { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fnRef.current();
      setData(res.data);
      return res.data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!skip) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, skip]);

  return { data, setData, loading, error, reload };
}

/** Wraps an action (save/submit) with a busy flag and toast messages */
export function useAction(toast) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn, { success, onError } = {}) => {
      setBusy(true);
      try {
        const res = await fn();
        if (success !== false) toast?.(success || res.message || 'Saved');
        return res.data;
      } catch (e) {
        toast?.(e.message, 'error');
        onError?.(e);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, run };
}
