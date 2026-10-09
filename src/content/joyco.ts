/**
 * Snapshot of joyco.studio facts for the static preview. Every line here is
 * published on the site (src/content/agents.ts in joyco-studio/website or
 * https://joyco.studio/ai.md). The real terminal reads the same facts live
 * from https://joyco.studio/api/v1/documents.
 */

export const SITE = {
  name: "JOYCO",
  legalName: "Joyco Studio",
  url: "https://joyco.studio",
  tagline: "The new generation of rebels",
  coordinates: "34°36′14″S 58°22′53″W",
  hotline: "0800-333-JOYCO",
  locality: "Buenos Aires",
  region: "Saavedra",
  countryName: "Argentina",
  areaServed: "Worldwide",
  timezone: "GMT-3 (ART)",
  days: "MON - FRI",
  hours: "9:00 - 18:00",
  email: "hey@joyco.studio",
  github: "https://github.com/joyco-studio",
  documentCount: 28,
} as const;

/** The same opening hours as SITE.days / SITE.hours, in machine-readable form. */
export const STUDIO_HOURS = {
  timeZone: "America/Argentina/Buenos_Aires",
  /** ISO weekdays: 1 = Monday … 7 = Sunday. */
  openWeekdays: [1, 2, 3, 4, 5],
  opensAtHour: 9,
  closesAtHour: 18,
  zoneLabel: "ART",
} as const;

export const SUMMARY =
  "JOYCO is a design and engineering studio working on brands, websites and digital products with clients all around the world. Based in Buenos Aires, Argentina.";

export const CLIENTS = ["Sazabi", "Vercel", "Mistral", "v0", "Cerebral Valley"] as const;

export const ASCII_LOGO = String.raw`     ██╗ ██████╗ ██╗   ██╗ ██████╗ ██████╗
     ██║██╔═══██╗╚██╗ ██╔╝██╔════╝██╔═══██╗
     ██║██║   ██║ ╚████╔╝ ██║     ██║   ██║
██   ██║██║   ██║  ╚██╔╝  ██║     ██║   ██║
╚█████╔╝╚██████╔╝   ██║   ╚██████╗╚██████╔╝
 ╚════╝  ╚═════╝    ╚═╝    ╚═════╝ ╚═════╝`;

export interface Capability {
  title: string;
  work: readonly string[];
}

export const CAPABILITIES: readonly Capability[] = [
  { title: "Brand Identity & Visual Systems", work: ["Sazabi", "Cerebral Valley"] },
  {
    title: "Website Design & Front-End Development",
    work: ["Andrés Briganti", "Johanna Arrieta", "Rampant"],
  },
  { title: "Digital Products & Design Engineering", work: ["Sazabi", "Cerebral Valley"] },
  { title: "3D, WebGL & Real-Time Interaction", work: ["Rampant", "Johanna Arrieta"] },
  { title: "Open Source", work: ["OPEN SOURCE / LAB"] },
];

export interface ShowcaseEntry {
  slug: string;
  title: string;
  year: string;
  categories: readonly string[];
}

export const SHOWCASE: readonly ShowcaseEntry[] = [
  { slug: "jam", title: "Joyco Jam", year: "2026", categories: ["Game Design", "Development"] },
  { slug: "sazabi", title: "Sazabi", year: "2026", categories: ["Branding", "Development"] },
  { slug: "anomaly", title: "Anomaly", year: "2026", categories: ["Visual identity", "3D"] },
  { slug: "mistral", title: "Mistral", year: "ongoing", categories: ["Video production"] },
  {
    slug: "cerebral-valley",
    title: "Cerebral Valley",
    year: "2024 - 2026",
    categories: ["Product", "Design engineering"],
  },
  { slug: "rampant", title: "Rampant", year: "2024", categories: ["3D", "Web Design"] },
  { slug: "johanna-arrieta", title: "Johanna Arrieta", year: "2025", categories: ["Illustration", "WebGL"] },
];

