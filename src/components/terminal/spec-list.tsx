interface SpecRowProps {
  label: string;
  value: string;
}

/**
 * `name .......... JOYCO`: the dot-leader row from a machine-readable index.
 * The leader is drawn with a dotted border so it stretches to any width and
 * screen readers hear only label and value.
 */
export function SpecRow({ label, value }: SpecRowProps) {
  return (
    <div className="flex items-baseline gap-[1ch]">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <span aria-hidden="true" className="min-w-[2ch] flex-1 border-b border-dotted border-ink-muted" />
      <dd className="text-right">{value}</dd>
    </div>
  );
}

interface SpecListProps {
  rows: ReadonlyArray<readonly [string, string]>;
}

export function SpecList({ rows }: SpecListProps) {
  return (
    <dl className="flex flex-col">
      {rows.map(([label, value]) => (
        <SpecRow key={label} label={label} value={value} />
      ))}
    </dl>
  );
}
