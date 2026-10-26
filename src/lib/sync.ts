import { useEffect, useState } from "react";
import {
  SYNC_KEYS,
  assignMuscles,
  exampleExercise,
  exportState,
  fixLogDays,
  importState,
  tidyOnce,
} from "@/lib/gym";

/**
 * Account sync. The phone keeps working from localStorage (fast, offline);
 * when signed in, changes are pushed to the account and the account's data is
 * pulled on launch and whenever the app comes back to the foreground.
 *
 * Every part (exercises, calendar days, day logs, presets, …) carries its own
 * "last changed" time, and both phone and server keep the newer side per part.
 * So a second phone or an old Safari tab can't wipe newer data it didn't touch.
 */

export type AccountUser = { sub: string; email: string; name: string; picture?: string };
export type Account = {
  status: "loading" | "off" | "signed-out" | "signed-in";
  user: AccountUser | null;
  syncedAt: number | null;
  error: string | null;
};
type Remote = { updatedAt: number; data: Record<string, unknown>; keyAt?: Record<string, number> };

/** Accounts whose exercise library gets the one-time clean-up (see tidy.ts). */
const TIDY_ACCOUNTS: string[] = []; // add your own account e-mail to run the one-time library clean-up

const K_OWNER = "gr.sync.owner"; // account sub the local data belongs to
const K_KEY_AT = "gr.sync.keyAt"; // per-part last local change time
const K_LEGACY_AT = "gr.sync.localAt"; // pre-merge versions stored one time for everything

let account: Account = { status: "loading", user: null, syncedAt: null, error: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<Account>) => {
  account = { ...account, ...patch };
  listeners.forEach((l) => l());
};

export function useAccount() {
  const [a, setA] = useState(account);
  useEffect(() => {
    const l = () => setA(account);
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return a;
}

const readLS = (k: string) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const writeLS = (k: string, v: string) => {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

function getKeyAt(): Record<string, number> {
  try {
    const m = JSON.parse(readLS(K_KEY_AT) ?? "null") as Record<string, number> | null;
    if (m) return m;
  } catch {
    /* fall through */
  }
  // Upgrade from the single timestamp the first sync version used.
  const legacy = Number(readLS(K_LEGACY_AT)) || 0;
  return Object.fromEntries(SYNC_KEYS.map((k) => [k, legacy]));
}
const setKeyAt = (m: Record<string, number>) => writeLS(K_KEY_AT, JSON.stringify(m));
const stampAll = (t: number) => setKeyAt(Object.fromEntries(SYNC_KEYS.map((k) => [k, t])));

let applying = false; // true while we write server data locally (don't echo it back)
let pushTimer: number | undefined;
let lastPull = 0;

/**
 * When the account last changed part `k`. Saves from before per-part times
 * only have one time for everything; a part the account has never stored
 * counts as never changed (so it can't wipe a part this phone does have).
 */
const remoteAt = (remote: Remote, k: string) =>
  remote.keyAt ? (remote.keyAt[k] ?? 0) : (remote.updatedAt ?? 0);

/** Apply parts where the server is newer; returns whether this phone has newer parts. */
function mergeIn(remote: Remote): boolean {
  const local = getKeyAt();
  const newer: string[] = [];
  let localNewer = false;
  for (const k of SYNC_KEYS) {
    const theirs = remoteAt(remote, k);
    const mine = local[k] ?? 0;
    if (theirs > mine) newer.push(k);
    else if (mine > theirs) localNewer = true;
  }
  if (newer.length) {
    applying = true;
    importState(remote.data, newer);
    applying = false;
    for (const k of newer) local[k] = remoteAt(remote, k);
    setKeyAt(local);
  }
  return localNewer;
}

async function push() {
  if (account.status !== "signed-in") return;
  try {
    const res = await fetch("/api/state", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: exportState(), keyAt: getKeyAt() }),
      credentials: "same-origin",
    });
    if (res.status === 401) return set({ status: "signed-out", user: null });
    if (res.status === 413) return set({ error: "Too much data to sync" });
    if (!res.ok) throw new Error(String(res.status));
    // The server returns the merged result; take anything it had that's newer.
    mergeIn((await res.json()) as Remote);
    set({ syncedAt: Date.now(), error: null });
  } catch {
    set({ error: "Not synced yet — will retry" });
  }
}

const schedulePush = (ms = 1200) => {
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(push, ms);
};

/** Pull the account's data (or seed a fresh account) and merge it with this phone's. */
async function pull(user: AccountUser) {
  lastPull = Date.now();
  const res = await fetch("/api/state", { credentials: "same-origin" });
  if (res.status === 401) return set({ status: "signed-out", user: null });
  if (!res.ok) throw new Error(String(res.status));
  const remote = (await res.json()) as Remote | null;
  const owner = readLS(K_OWNER);

  if (owner && owner !== user.sub) {
    // This phone holds someone else's data: switch to this account's data.
    applying = true;
    importState(remote ? remote.data : { "gr.exercises.v1": [exampleExercise()] });
    applying = false;
    if (remote) setKeyAt(remote.keyAt ?? {});
    else {
      stampAll(Date.now());
      schedulePush(0);
    }
  } else if (!remote) {
    // First sign-in on a fresh account: this phone's data becomes the account's.
    stampAll(Date.now());
    schedulePush(0);
  } else if (!owner) {
    // First sign-in on this phone to an existing account: combine both, so
    // nothing done on this phone before signing in is lost.
    applying = true;
    importState(combine(exportState(), remote.data));
    applying = false;
    stampAll(Date.now());
    schedulePush(0);
  } else if (mergeIn(remote)) {
    schedulePush(0);
  }
  writeLS(K_OWNER, user.sub);
  set({ syncedAt: Date.now(), error: null });
  // Clean up only once the account's data is on this phone.
  if (TIDY_ACCOUNTS.includes(user.email.toLowerCase())) tidyOnce();
  assignMuscles();
  fixLogDays();
}

type WithId = { id: string; name?: string };
const byIdUnion = (a: unknown, b: unknown) => {
  const remote = Array.isArray(b) ? (b as WithId[]) : [];
  const local = Array.isArray(a) ? (a as WithId[]) : [];
  const ids = new Set(remote.map((x) => x.id));
  const names = new Set(remote.map((x) => x.name?.toLowerCase()));
  return [
    ...remote,
    ...local.filter((x) => !ids.has(x.id) && !(x.name && names.has(x.name.toLowerCase()))),
  ];
};

/** Union of this phone's data and the account's (account wins on settings). */
function combine(local: Record<string, unknown>, remote: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...remote };
  // A fresh phone's untouched example exercise isn't worth adding to an account.
  const localEx = (local["gr.exercises.v1"] as { tags?: string[] }[] | undefined) ?? [];
  const onlyExample = localEx.length === 1 && (localEx[0].tags ?? []).includes("example");
  out["gr.exercises.v1"] = byIdUnion(
    onlyExample ? [] : local["gr.exercises.v1"],
    remote["gr.exercises.v1"],
  );
  out["gr.presets.v1"] = byIdUnion(local["gr.presets.v1"], remote["gr.presets.v1"]);
  out["gr.timed.v1"] = byIdUnion(local["gr.timed.v1"], remote["gr.timed.v1"]);
  out["gr.times.v1"] = byIdUnion(local["gr.times.v1"], remote["gr.times.v1"]);
  const days = new Set([
    ...((remote["gr.days.v1"] as string[] | undefined) ?? []),
    ...((local["gr.days.v1"] as string[] | undefined) ?? []),
  ]);
  out["gr.days.v1"] = [...days];
  type Log = { finishedAt: number };
  const logs = { ...((remote["gr.dayLog.v1"] as Record<string, Log> | undefined) ?? {}) };
  for (const [day, log] of Object.entries(
    (local["gr.dayLog.v1"] as Record<string, Log> | undefined) ?? {},
  )) {
    if (!logs[day] || logs[day].finishedAt < log.finishedAt) logs[day] = log;
  }
  out["gr.dayLog.v1"] = logs;
  return out;
}

let started = false;
export async function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("gr:store", (e) => {
    const key = (e as CustomEvent).detail?.key as string | undefined;
    if (applying || !key || !(SYNC_KEYS as readonly string[]).includes(key)) return;
    const m = getKeyAt();
    m[key] = Date.now();
    setKeyAt(m);
    schedulePush();
  });
  document.addEventListener("visibilitychange", () => {
    if (account.status !== "signed-in" || !account.user) return;
    if (document.visibilityState === "hidden") {
      window.clearTimeout(pushTimer);
      void push();
    } else if (Date.now() - lastPull > 15_000) {
      // Back in the foreground: pick up changes made on another phone/tab.
      pull(account.user).catch(() => set({ error: "Not synced yet — will retry" }));
    }
  });

  try {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    if (!res.ok) return set({ status: "off" });
    const me = (await res.json()) as { configured: boolean; user: AccountUser | null };
    // Not syncing: this phone's data is the only copy, so map muscles right away.
    // (Signed in, it waits for the pull, so old local data never overwrites newer.)
    if (!me.configured || !me.user) {
      assignMuscles();
      fixLogDays();
      return set({ status: me.configured ? "signed-out" : "off" });
    }
    set({ status: "signed-in", user: me.user });
    await pull(me.user);
  } catch {
    // Offline or server unavailable: keep working locally.
    if (account.status === "loading") set({ status: "off" });
    else set({ error: "Not synced yet — will retry" });
  }
}

export function signIn() {
  window.location.href = "/api/auth/login";
}

export async function signOut() {
  window.clearTimeout(pushTimer);
  await push();
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  set({ status: "signed-out", user: null, syncedAt: null });
}
