let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

export function primeAudio() {
  const a = ac();
  if (a && a.state === "suspended") a.resume().catch(() => {});
}

export function playAlarm() {
  const a = ac();
  if (!a) return;
  const now = a.currentTime;
  [0, 0.25, 0.5].forEach((t) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "square";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, now + t);
    g.gain.exponentialRampToValueAtTime(0.25, now + t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.2);
    o.connect(g).connect(a.destination);
    o.start(now + t);
    o.stop(now + t + 0.22);
  });
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
}
