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
    // iOS can pause audio when a call comes in or the app is backgrounded.
    // Wake it again as soon as the page is visible.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") resume();
    });
  }
  return ctx;
}

function resume() {
  const a = ctx;
  // iOS reports "interrupted" (not in the TS lib) as well as "suspended".
  if (a && (a.state as string) !== "running") a.resume().catch(() => {});
}

/**
 * Ask iOS to treat our sound as media playback, so it still plays when the
 * ring/silent switch is on silent (Audio Session API, Safari 16.4+).
 */
function setPlaybackSession() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession && nav.audioSession.type !== "playback") {
      nav.audioSession.type = "playback";
    }
  } catch {
    /* not supported */
  }
}

/** Call from a user gesture (tap) to unlock audio on iOS. */
export function primeAudio() {
  if (typeof window === "undefined") return;
  setPlaybackSession();
  const a = ac();
  if (!a) return;
  resume();
  // Classic iOS unlock: play a one-sample silent buffer inside the tap.
  try {
    const src = a.createBufferSource();
    src.buffer = a.createBuffer(1, 1, 22050);
    src.connect(a.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
  // Keep a near-silent oscillator running so iOS doesn't suspend the context
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

/** Two bursts of three beeps (~1.6 s) so it's hard to miss. */
function scheduleBeepTrain(a: AudioContext, startAt: number) {
  const nodes: OscillatorNode[] = [];
  [0, 0.22, 0.44, 1.0, 1.22, 1.44].forEach((t) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "square";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, startAt + t);
    g.gain.exponentialRampToValueAtTime(0.45, startAt + t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + t + 0.18);
    o.connect(g).connect(a.destination);
    o.start(startAt + t);
    o.stop(startAt + t + 0.2);
    nodes.push(o);
  });
  return nodes;
}

const stopAll = (nodes: OscillatorNode[]) =>
  nodes.forEach((o) => {
    try {
      o.stop(0);
    } catch {
      /* ignore */
    }
  });

/**
 * Schedule the alarm to fire in `delaySeconds`. Call from a tap (after
 * primeAudio()) so iOS keeps audio unlocked. Returns a canceller.
 *
 * The beeps are scheduled on the audio clock (precise while the app is open).
 * A backup timer checks at the due time: if the audio was paused or the page
 * was asleep (timer fired late), it plays the beeps right away instead.
 */
export function scheduleAlarm(delaySeconds: number): ScheduledAlarm {
  const a = ac();
  if (!a) return { cancel: () => {} };
  setPlaybackSession();
  resume();
  const delayMs = Math.max(0, delaySeconds * 1000);
  const due = Date.now() + delayMs;
  let nodes = scheduleBeepTrain(a, a.currentTime + delayMs / 1000);
  const backup = window.setTimeout(() => {
    navigator.vibrate?.([200, 100, 200, 100, 200]); // Android; iOS ignores it
    const lateBy = Date.now() - due;
    // Page was asleep: beep on wake-up, unless the rest ended long ago.
    if (lateBy > 60_000) return;
    if ((a.state as string) !== "running" || lateBy > 1500) {
      stopAll(nodes);
      resume();
      nodes = scheduleBeepTrain(a, a.currentTime + 0.05);
    }
  }, delayMs);
  return {
    cancel: () => {
      window.clearTimeout(backup);
      stopAll(nodes);
    },
  };
}

/** Fire the alarm immediately. */
export function playAlarm() {
  scheduleAlarm(0);
}
