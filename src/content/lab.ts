/**
 * JOYCO Lab experiments, as published in the public registry
 * https://github.com/joyco-studio/lab (experiments.json), the same list the
 * Hub renders. Only the fields the terminal shows are kept.
 */
export interface LabExperiment {
  slug: string;
  title: string;
  /** The experiment's own live deployment. */
  href: string;
  /** YYYY-MM-DD */
  date: string;
  tags: readonly string[];
}

export const LAB_REGISTRY_URL =
  "https://raw.githubusercontent.com/joyco-studio/lab/main/experiments.json";

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Only absolute http(s) URLs: the registry is external input and ends up in an href. */
function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function parseExperiment(value: unknown): LabExperiment | null {
  if (!isRecord(value)) return null;
  const { slug, title, href, date, tags } = value;
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) return null;
  if (typeof title !== "string" || title.trim() === "") return null;
  if (!isWebUrl(href)) return null;
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) return null;
  return { slug, title, href, date, tags: isStringArray(tags) ? tags : [] };
}

/**
 * Validates the registry payload. Malformed entries are dropped rather than
 * failing the list; newest first. Returns null when the payload itself is
 * not a registry, so the caller can fall back.
 */
export function parseLabRegistry(payload: unknown): LabExperiment[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.experiments)) return null;
  return payload.experiments
    .map(parseExperiment)
    .filter((experiment): experiment is LabExperiment => experiment !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}
