/**
 * The app is installed to the iPhone home screen and can sit in memory for
 * days. Whenever it comes back to the foreground (and every few minutes while
 * open) we check whether a new build has been published; if so, reload.
 * No service worker, so a reload always gets the fresh build.
 */
const assetsOf = (html: string) =>
  Array.from(new Set(html.match(/\/assets\/[\w.-]+\.(?:js|css)/g) ?? []))
    .sort()
    .join("|");

async function fingerprint(): Promise<string | null> {
  try {
    const res = await fetch(`/?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return assetsOf(await res.text()) || null;
  } catch {
    return null;
  }
}

export function startAutoUpdate(canReload: () => boolean) {
  if (typeof window === "undefined" || import.meta.env.DEV) return;
  let base: string | null = null;
  let checking = false;
  const check = async () => {
    if (checking) return;
    checking = true;
    const fp = await fingerprint();
    checking = false;
    if (!fp) return;
    if (!base) {
      base = fp;
      return;
    }
    if (fp !== base && canReload()) window.location.reload();
  };
  check();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
  window.addEventListener("focus", check);
  setInterval(check, 5 * 60 * 1000);
}
