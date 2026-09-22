/**
 * Some iOS versions give home-screen web apps a viewport that stops short of
 * the bottom of the screen (by about the status-bar height) while still
 * reporting the home-indicator inset. Content can't be drawn below that
 * viewport, so when we detect the shortfall we drop the home-indicator spacing
 * and let the dock sit right on the viewport's bottom edge.
 */
export function startViewportFix() {
  if (typeof window === "undefined") return;
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone =
    nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  if (!standalone) return;
  const root = document.documentElement;
  const apply = () => {
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    const screenH = portrait
      ? Math.max(screen.height, screen.width)
      : Math.min(screen.height, screen.width);
    const short = screenH - window.innerHeight > 20;
    if (short) root.style.setProperty("--dock-bottom", "8px");
    else root.style.removeProperty("--dock-bottom");
  };
  apply();
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", () => setTimeout(apply, 300));
  document.addEventListener("visibilitychange", () => setTimeout(apply, 100));
  setTimeout(apply, 500);
}
