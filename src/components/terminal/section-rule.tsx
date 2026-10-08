interface SectionRuleProps {
  title: string;
}

/** `── ABOUT ─────` heading: the uppercase mono label, then a rule to the edge. */
export function SectionRule({ title }: SectionRuleProps) {
  return (
    <h2 className="mt-[1lh] flex items-center gap-[1ch] text-caption-mono">
      <span aria-hidden="true" className="h-px w-[2ch] bg-ink" />
      <span>{title}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-ink-muted" />
    </h2>
  );
}
