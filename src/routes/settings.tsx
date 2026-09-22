import { createFileRoute } from "@tanstack/react-router";
import { useRestSeconds } from "@/lib/gym";
import { LineButton, SectionLabel, Shell } from "@/components/kit";
import { DotMatrix } from "@/components/timer";
import { primeAudio, scheduleAlarm } from "@/lib/alarm";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Workout by Tim" }] }),
  component: SettingsPage,
});

const PRESETS = [30, 50, 60];

function SettingsPage() {
  const [rest, setRest] = useRestSeconds();
  const step = (d: number) => setRest(Math.min(600, Math.max(5, rest + d)));
  const btn =
    "flex h-14 w-14 items-center justify-center border-[1.5px] border-[var(--ink)] text-[24px] font-light active:bg-[var(--sage-2)]";

  return (
    <Shell>
      <SectionLabel n="04">Rest timer</SectionLabel>

      <div className="mt-4 flex items-center justify-between gap-3 border-[1.5px] border-[var(--ink)] p-3">
        <button className={btn} onClick={() => step(-5)} aria-label="5 seconds less">
          −
        </button>
        <div className="flex flex-col items-center gap-2">
          <DotMatrix text={String(rest)} pitch={6} />
          <span className="font-mono text-[10px] uppercase">seconds</span>
        </div>
        <button className={btn} onClick={() => step(5)} aria-label="5 seconds more">
          +
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <LineButton
            key={p}
            active={p === rest}
            onClick={() => setRest(p)}
            className="h-11 font-mono"
          >
            {p} s
          </LineButton>
        ))}
      </div>

      <button
        onClick={() => {
          primeAudio();
          scheduleAlarm(0);
        }}
        className="mt-6 font-mono text-[11px] uppercase underline underline-offset-4"
      >
        Test alarm sound
      </button>

      <DisplayInfo />
    </Shell>
  );
}

/** Screen measurements, to diagnose layout on the home-screen app. */
function DisplayInfo() {
  const [info, setInfo] = useState<[string, string][]>([]);
  useEffect(() => {
    const read = () => {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;visibility:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)";
      document.body.appendChild(probe);
      const cs = getComputedStyle(probe);
      const nav = navigator as Navigator & { standalone?: boolean };
      const vv = window.visualViewport;
      setInfo([
        ["mode", nav.standalone ? "home screen" : "browser"],
        ["screen", `${screen.width} × ${screen.height}`],
        ["inner", `${window.innerWidth} × ${window.innerHeight}`],
        ["client h", String(document.documentElement.clientHeight)],
        ["visual h", vv ? String(Math.round(vv.height)) : "–"],
        ["inset top", cs.paddingTop],
        ["inset bottom", cs.paddingBottom],
      ]);
      probe.remove();
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return (
    <div className="mt-8">
      <SectionLabel n="05">Display info</SectionLabel>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
        {info.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="uppercase text-[var(--faint)]">{k}</dt>
            <dd className="tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
