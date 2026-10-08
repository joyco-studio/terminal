import { SectionRule } from "@/components/terminal/section-rule";
import { SpecList } from "@/components/terminal/spec-list";
import { CAPABILITIES, CLIENTS, SHOWCASE, SITE, SUMMARY } from "@/content/joyco";
import { COMMANDS, type CommandId } from "@/terminal/commands";

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

const LINK_CLASS =
  "underline decoration-1 underline-offset-4 hover:bg-primary hover:text-primary-foreground";

function AboutOutput() {
  return (
    <>
      <SectionRule title="About" />
      <SpecList rows={ABOUT_ROWS} />
      <p className="mt-[1lh] max-w-[72ch]">{SUMMARY}</p>
    </>
  );
}

function CapabilitiesOutput() {
  return (
    <>
      <SectionRule title="Capabilities" />
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
      <SectionRule title="Showcase" />
      <ul className="grid grid-cols-[auto_auto_1fr] gap-x-[2ch]">
        {SHOWCASE.map((project) => (
          <li key={project.slug} className="col-span-3 grid grid-cols-subgrid">
            <span className="text-ink-muted">{project.year}</span>
            <a href={`${SITE.url}/showcase/${project.slug}`} className={LINK_CLASS}>
              {project.slug}/
            </a>
            <span className="text-ink-muted">{project.categories.join(" · ")}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function ContactOutput() {
  return (
    <>
      <SectionRule title="Contact" />
      <SpecList rows={CONTACT_ROWS} />
      <p className="mt-[1lh]">
        <a href={`mailto:${SITE.email}`} className={LINK_CLASS}>
          Write to {SITE.email}
        </a>
      </p>
    </>
  );
}

function HelpOutput() {
  return (
    <>
      <SectionRule title="Help" />
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

interface UnknownOutputProps {
  input: string;
}

function UnknownOutput({ input }: UnknownOutputProps) {
  return (
    <p>
      <span className="text-ink-muted">[ ERR ]</span> command not found: {input}. Type{" "}
      <kbd>help</kbd> or pick one from the menu.
    </p>
  );
}

const OUTPUTS: Record<Exclude<CommandId, "clear">, () => React.ReactNode> = {
  about: AboutOutput,
  capabilities: CapabilitiesOutput,
  showcase: ShowcaseOutput,
  contact: ContactOutput,
  help: HelpOutput,
};

interface CommandOutputProps {
  command: Exclude<CommandId, "clear"> | null;
  input: string;
}

export function CommandOutput({ command, input }: CommandOutputProps) {
  if (!command) return <UnknownOutput input={input} />;
  const Output = OUTPUTS[command];
  return <Output />;
}
