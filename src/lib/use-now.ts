import { useEffect, useState } from "react";

/** Current time, refreshed every `ms` while active. */
export function useNow(active: boolean, ms = 200) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [active, ms]);
  return now;
}

/** Whether the time `at` has passed (re-renders once, when it does). */
export function useReached(at: number | null) {
  const [reached, setReached] = useState(false);
  useEffect(() => {
    if (at === null) return setReached(false);
    const left = at - Date.now();
    setReached(left <= 0);
    if (left <= 0) return;
    const t = setTimeout(() => setReached(true), left);
    return () => clearTimeout(t);
  }, [at]);
  return reached;
}
