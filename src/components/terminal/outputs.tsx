import type { ReactNode } from "react";
import { SpecList } from "@/components/terminal/spec-list";
import { CAPABILITIES, CLIENTS, SHOWCASE, SITE, SUMMARY } from "@/content/joyco";
import { COMMANDS, type CommandId } from "@/terminal/commands";
import { useLabExperiments } from "@/components/terminal/lab-context";

const ABOUT_ROWS = [
  ["name", SITE.name],
  ["legal_name", SITE.legalName],
  ["location", `${SITE.locality} (${SITE.region}), ${SITE.countryName}`],
  ["area_served", SITE.areaServed],
  ["timezone", SITE.timezone],
  ["availability", `${SITE.days} · ${SITE.hours}`],
  ["clients", CLIENTS.join(", ")],
] as const;

const CONTACT_ROWS = [
  ["email", SITE.email],
  ["hotline", SITE.hotline],
  ["github", SITE.github],
  ["hours", `${SITE.days} · ${SITE.hours} ${SITE.timezone}`],
] as const;

interface TerminalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** Opens in a new tab so the terminal session survives. */
  external?: boolean;
}

/**
 * A selectable row target: arrows in the panel move between these, the
 * selected one fills like a menu item (that fill is its focus indicator).
 */
function TerminalLink({ href, children, className = "", external = false }: TerminalLinkProps) {
  return (
    <a
      href={href}
      data-gl-own-focus
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={`underline decoration-1 underline-offset-4 focus-visible:bg-primary focus-visible:text-primary-foreground focus-visible:no-underline ${className}`}
    >
      {children}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

function AboutOutput() {
  return (
    <>
      <SpecList rows={ABOUT_ROWS} />
      <p className="mt-[1lh] max-w-[72ch]">{SUMMARY}</p>
    </>
  );
}

function CapabilitiesOutput() {
  return (
    <>
      <ol className="flex flex-col">
        {CAPABILITIES.map((capability, index) => (
          <li key={capability.title} className="flex flex-wrap gap-x-[2ch]">
            <span className="text-ink-muted">[{String(index + 1).padStart(2, "0")}]</span>
            <span>{capability.title}</span>
            <span className="text-ink-muted">{capability.work.join(", ")}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function ShowcaseOutput() {
  return (
    <>
      <ul className="grid grid-cols-[auto_auto_1fr] gap-x-[2ch]">
        {SHOWCASE.map((project) => (
          <li key={project.slug} className="col-span-3 grid grid-cols-subgrid">
            <span className="text-ink-muted">{project.year}</span>
            <TerminalLink href={`${SITE.url}/showcase/${project.slug}`} className="justify-self-start" external>
              {project.slug}/
            </TerminalLink>
            <span className="text-ink-muted">{project.categories.join(" · ")}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Tags beyond this are noise in a one-line row. */
const LAB_TAGS_SHOWN = 3;

function LabOutput() {
  const experiments = useLabExperiments();
  return (
    <ul className="grid grid-cols-[auto_auto_1fr] gap-x-[2ch]">
      {experiments.map((experiment) => (
        <li key={experiment.slug} className="col-span-3 grid grid-cols-subgrid">
          <time dateTime={experiment.date} className="text-ink-muted">
            {experiment.date}
          </time>
          <TerminalLink href={experiment.href} className="justify-self-start" external>
            {experiment.slug}/
          </TerminalLink>
          <span className="text-ink-muted">{experiment.tags.slice(0, LAB_TAGS_SHOWN).join(" · ")}</span>
        </li>
      ))}
    </ul>
  );
}

function ContactOutput() {
  return (
    <>
      <SpecList rows={CONTACT_ROWS} />
      <p className="mt-[1lh]">
        <TerminalLink href={`mailto:${SITE.email}`}>Write to {SITE.email}</TerminalLink>
      </p>
    </>
  );
}

function HelpOutput() {
  return (
    <>
      <dl className="grid grid-cols-[auto_1fr] gap-x-[2ch]">
        {COMMANDS.map((command, index) => (
          <div key={command.id} className="col-span-2 grid grid-cols-subgrid">
            <dt>
              <span className="text-ink-muted">[{index + 1}]</span> {command.id}
            </dt>
            <dd className="text-ink-muted">
              {command.description}
              {command.aliases.length > 0 && ` · also: ${command.aliases.join(", ")}`}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

const OUTPUTS: Record<CommandId, () => ReactNode> = {
  about: AboutOutput,
  capabilities: CapabilitiesOutput,
  showcase: ShowcaseOutput,
  contact: ContactOutput,
  lab: LabOutput,
  help: HelpOutput,
};

interface CommandOutputProps {
  command: CommandId;
}

export function CommandOutput({ command }: CommandOutputProps) {
  const Output = OUTPUTS[command];
  return <Output />;
}
