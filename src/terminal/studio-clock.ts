import { STUDIO_HOURS } from "@/content/joyco";

export interface StudioTime {
  /** e.g. "THU 09 OCT" */
  date: string;
  /** e.g. "00:15:42" */
  time: string;
  /** ISO string for <time dateTime>. */
  iso: string;
  isOpen: boolean;
}

const ISO_WEEKDAY: Readonly<Record<string, number>> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: STUDIO_HOURS.timeZone,
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((entry) => entry.type === type)?.value ?? "";
}

/** The studio's local date and time, and whether it is within opening hours. */
export function studioTime(now: Date): StudioTime {
  const parts = formatter.formatToParts(now);
  const weekday = part(parts, "weekday");
  const hour = Number(part(parts, "hour"));
  const isOpenDay = STUDIO_HOURS.openWeekdays.some((day) => day === ISO_WEEKDAY[weekday]);

  return {
    date: `${weekday} ${part(parts, "day")} ${part(parts, "month")}`.toUpperCase(),
    time: `${part(parts, "hour")}:${part(parts, "minute")}:${part(parts, "second")}`,
    iso: now.toISOString(),
    isOpen: isOpenDay && hour >= STUDIO_HOURS.opensAtHour && hour < STUDIO_HOURS.closesAtHour,
  };
}
