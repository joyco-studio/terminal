"use client";

import { useEffect, useState } from "react";
import { STUDIO_HOURS } from "@/content/joyco";
import { studioTime, type StudioTime } from "@/terminal/studio-clock";

const TICK_MS = 1000;
/** Same width as a real reading, so nothing shifts when the clock starts. */
const PLACEHOLDER = "--- -- --- · --:--:--";

/**
 * Live Buenos Aires date and time with the studio's open/closed state.
 * Renders a fixed-width placeholder on the server and ticks once mounted.
 */
export function StudioClock() {
  const [reading, setReading] = useState<StudioTime | null>(null);

  useEffect(() => {
    const tick = () => setReading(studioTime(new Date()));
    tick();
    const timer = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  if (!reading) {
    return (
      <span>
        {PLACEHOLDER} {STUDIO_HOURS.zoneLabel}
      </span>
    );
  }

  return (
    <>
      <time dateTime={reading.iso}>
        {reading.date} · {reading.time} {STUDIO_HOURS.zoneLabel}
      </time>
      <span aria-hidden="true">·</span>
      <span>{reading.isOpen ? "Studio open" : "Studio closed"}</span>
    </>
  );
}
