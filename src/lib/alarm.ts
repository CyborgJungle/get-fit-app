let ctx: AudioContext | null = null;
let silentKeepAlive: OscillatorNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Call from a user gesture (tap) to unlock audio on iOS. */
export function primeAudio() {
  const a = ac();
  if (!a) return;
  if (a.state === "suspended") a.resume().catch(() => {});
  // Start a near-silent oscillator to keep iOS from suspending the context
  // between the tap and the scheduled alarm.
  if (!silentKeepAlive) {
    try {
      const o = a.createOscillator();
      const g = a.createGain();
      g.gain.value = 0.0001;
      o.frequency.value = 1;
      o.connect(g).connect(a.destination);
      o.start();
      silentKeepAlive = o;
    } catch {
      /* ignore */
    }
  }
}

export type ScheduledAlarm = { cancel: () => void };

function scheduleBeepTrain(a: AudioContext, startAt: number) {
  const nodes: { o: OscillatorNode; g: GainNode }[] = [];
  [0, 0.25, 0.5].forEach((t) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "square";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, startAt + t);
    g.gain.exponentialRampToValueAtTime(0.3, startAt + t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + t + 0.2);
    o.connect(g).connect(a.destination);
    o.start(startAt + t);
    o.stop(startAt + t + 0.22);
    nodes.push({ o, g });
  });
  return nodes;
}

/**
 * Schedule the alarm to fire in `delaySeconds`. Must be called from within a
 * user gesture (or shortly after primeAudio()) so iOS keeps audio unlocked.
 * Returns a canceller. Vibrates on fire via a JS timer (best effort).
 */
export function scheduleAlarm(delaySeconds: number): ScheduledAlarm {
  const a = ac();
  if (!a) return { cancel: () => {} };
  if (a.state === "suspended") a.resume().catch(() => {});
  const startAt = a.currentTime + Math.max(0, delaySeconds);
  const nodes = scheduleBeepTrain(a, startAt);
  const vibrateTimer = window.setTimeout(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, Math.max(0, delaySeconds * 1000));
  return {
    cancel: () => {
      window.clearTimeout(vibrateTimer);
      nodes.forEach(({ o }) => {
        try {
          o.stop(0);
        } catch {
          /* ignore */
        }
      });
    },
  };
}

/** Fire the alarm immediately (used as a fallback). */
export function playAlarm() {
  scheduleAlarm(0);
}
