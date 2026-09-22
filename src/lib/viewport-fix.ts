/**
 * iOS home-screen web apps (viewport-fit=cover + translucent status bar) are
 * meant to fill the whole screen, but some iOS versions report a viewport that
 * is shorter than the screen, so anything pinned to `bottom: 0` floats above the
 * real bottom edge. Measure the shortfall and expose it as --vv-fix so pinned
 * elements can be pushed back down to the glass.
 */
export function startViewportFix() {
  if (typeof window === "undefined") return;
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone =
    nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  if (!standalone) return;
  const apply = () => {
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    const screenH = portrait
      ? Math.max(screen.height, screen.width)
      : Math.min(screen.height, screen.width);
    const gap = Math.round(screenH - window.innerHeight);
    const fix = gap > 0 && gap < 120 ? gap : 0;
    document.documentElement.style.setProperty("--vv-fix", `${fix}px`);
  };
  apply();
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", () => setTimeout(apply, 300));
  document.addEventListener("visibilitychange", () => setTimeout(apply, 100));
  setTimeout(apply, 500);
}
