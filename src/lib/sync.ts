import { useEffect, useState } from "react";
import { SYNC_KEYS, exampleExercise, exportState, importState } from "@/lib/gym";

/**
 * Account sync. The phone keeps working from localStorage (fast, offline);
 * when signed in, every change is pushed to the account and the account's
 * data is pulled on launch, so it survives a new phone or a reinstall.
 */

export type AccountUser = { sub: string; email: string; name: string; picture?: string };
export type Account = {
  status: "loading" | "off" | "signed-out" | "signed-in";
  user: AccountUser | null;
  syncedAt: number | null;
  error: string | null;
};

const K_OWNER = "gr.sync.owner"; // account sub the local data belongs to
const K_LOCAL_AT = "gr.sync.localAt"; // when local data last changed

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

let applying = false; // true while we write server data locally (don't echo it back)
let pushTimer: number | undefined;

async function push() {
  if (account.status !== "signed-in") return;
  const updatedAt = Number(readLS(K_LOCAL_AT)) || Date.now();
  try {
    const res = await fetch("/api/state", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ updatedAt, data: exportState() }),
      credentials: "same-origin",
    });
    if (res.status === 401) return set({ status: "signed-out", user: null });
    if (!res.ok) throw new Error(String(res.status));
    set({ syncedAt: Date.now(), error: null });
  } catch {
    set({ error: "Not synced yet — will retry" });
  }
}

const schedulePush = () => {
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(push, 1200);
};

/** Pull the account's data (or seed a fresh account), then keep pushing changes. */
async function pull(user: AccountUser) {
  const res = await fetch("/api/state", { credentials: "same-origin" });
  if (!res.ok) throw new Error(String(res.status));
  const remote = (await res.json()) as { updatedAt: number; data: Record<string, unknown> } | null;
  const owner = readLS(K_OWNER);
  const localAt = Number(readLS(K_LOCAL_AT)) || 0;

  if (remote) {
    // Same account and this phone has newer edits (e.g. made offline): keep them.
    if (owner === user.sub && localAt > remote.updatedAt) {
      schedulePush();
    } else {
      applying = true;
      importState(remote.data);
      applying = false;
      writeLS(K_LOCAL_AT, String(remote.updatedAt));
    }
  } else if (owner && owner !== user.sub) {
    // Brand-new account on a phone that holds someone else's data: start fresh.
    applying = true;
    importState({ "gr.exercises.v1": [exampleExercise()] });
    applying = false;
    writeLS(K_LOCAL_AT, String(Date.now()));
    schedulePush();
  } else {
    // First sign-in: this phone's data becomes the account's data.
    writeLS(K_LOCAL_AT, String(Date.now()));
    schedulePush();
  }
  writeLS(K_OWNER, user.sub);
  set({ syncedAt: Date.now(), error: null });
}

let started = false;
export async function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("gr:store", (e) => {
    const key = (e as CustomEvent).detail?.key as string | undefined;
    if (applying || !key || !(SYNC_KEYS as readonly string[]).includes(key)) return;
    writeLS(K_LOCAL_AT, String(Date.now()));
    schedulePush();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      window.clearTimeout(pushTimer);
      void push();
    }
  });

  try {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    if (!res.ok) return set({ status: "off" });
    const me = (await res.json()) as { configured: boolean; user: AccountUser | null };
    if (!me.configured) return set({ status: "off" });
    if (!me.user) return set({ status: "signed-out" });
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
