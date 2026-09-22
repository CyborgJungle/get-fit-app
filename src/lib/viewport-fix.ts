/**
 * The app runs below a normal status bar (no viewport-fit=cover): on iOS 26
 * home-screen apps, cover mode subtracts the top inset from the viewport
 * height and loses the bottom of the screen. Without cover, iOS reports no
 * safe-area insets, so on Face ID iPhones we pad the tab bar clear of the home
 * indicator ourselves.
 */
export function startViewportFix() {
  if (typeof window === "undefined") return;
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone =
    nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  const faceIdPhone = Math.max(screen.height, screen.width) >= 812;
  if (standalone && faceIdPhone) {
    document.documentElement.style.setProperty("--home-pad", "22px");
  }
}
