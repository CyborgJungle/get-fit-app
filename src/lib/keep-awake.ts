import { useEffect, useState } from "react";

type Sentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (t: "release", f: () => void) => void;
};
type WakeLockApi = { request: (t: "screen") => Promise<Sentinel> };

let sentinel: Sentinel | null = null;
let wanted = false;
const listeners = new Set<(on: boolean) => void>();
const notify = () => listeners.forEach((l) => l(!!sentinel && !sentinel.released));

/**
 * Ask iPhone to keep the screen on (Screen Wake Lock API; works in Safari and
 * home-screen apps on current iOS). iOS drops the lock when the app is hidden
 * or on low power, so we re-request it whenever it's released while wanted.
 * Safe to call repeatedly — calling it from a tap is the most reliable.
 */
let pending: Promise<void> | null = null;

export function keepAwake(): Promise<void> {
  wanted = true;
  const api = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
  if (!api || document.visibilityState !== "visible") return Promise.resolve();
  if (sentinel && !sentinel.released) return Promise.resolve();
  // One request at a time (a tap and a visibility change can arrive together).
  pending ??= (async () => {
    try {
      const s = await api.request("screen");
      if (!wanted) {
        // allowSleep() was called while we were waiting.
        await s.release().catch(() => {});
        return;
      }
      sentinel = s;
      s.addEventListener("release", () => {
        notify();
        if (wanted && document.visibilityState === "visible") void keepAwake();
      });
    } catch {
      sentinel = null;
    } finally {
      pending = null;
      notify();
    }
  })();
  return pending;
}

export function allowSleep() {
  wanted = false;
  sentinel?.release().catch(() => {});
  sentinel = null;
  notify();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (wanted && document.visibilityState === "visible") void keepAwake();
  });
}

/** Keep the screen on while mounted; returns whether the lock is currently held. */
export function useKeepAwake() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    listeners.add(setOn);
    void keepAwake();
    return () => {
      listeners.delete(setOn);
      allowSleep();
    };
  }, []);
  return on;
}
