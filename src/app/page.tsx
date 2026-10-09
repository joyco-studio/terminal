import { GpuTextRoot } from "@/components/gl/gpu-text-root";
import { StudioClock } from "@/components/terminal/studio-clock";
import { Terminal } from "@/components/terminal/terminal";
import { ASCII_LOGO, SITE } from "@/content/joyco";
import { COMMANDS } from "@/terminal/commands";

const CONTROL_HINTS = [
  "Arrows select",
  "Enter run",
  `1-${COMMANDS.length} jump`,
  "/ to type",
  "Q/Esc close",
] as const;

function TopBar() {
  return (
    <header data-gl-hatch className="diagonal-bg flex items-center justify-between gap-[2ch] border-b px-[2ch] py-[0.5lh] text-caption-mono whitespace-nowrap">
      <div className="flex items-center gap-[2ch]">
        <span className="bg-primary px-[1ch] text-primary-foreground">{SITE.name}</span>
        <span>Terminal v0.1</span>
      </div>
      <div className="hidden items-center gap-[2ch] text-ink-muted lg:flex">
        <span>{SITE.coordinates}</span>
        <span aria-hidden="true">·</span>
        <StudioClock />
      </div>
      <span className="bg-primary px-[1ch] text-primary-foreground">Rebels online</span>
    </header>
  );
}

function Boot() {
  return (
    <>
      <pre
        data-gl-ascii
        role="img"
        aria-label={SITE.name}
        className="ascii-art overflow-x-auto text-[min(1em,2.9vw)]"
      >
        {ASCII_LOGO}
      </pre>
      <p className="mt-[0.5lh] text-caption-mono text-ink-muted">
        {SITE.tagline} · {SITE.url} · {SITE.hotline}
      </p>
      <p className="mt-[0.5lh]">
        <span className="text-ink-muted">[ OK ]</span> connected to {SITE.url} · {SITE.documentCount}{" "}
        documents
      </p>
    </>
  );
}

function StatusBar() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-[2ch] gap-y-[0.5lh] border-t px-[2ch] py-[0.5lh] text-caption-mono text-ink-muted">
      <p id="prompt-hint" className="flex flex-wrap gap-[1ch]">
        {CONTROL_HINTS.map((hint) => (
          <span key={hint}>[ {hint} ]</span>
        ))}
      </p>
      <p>Rendered with lettra</p>
    </footer>
  );
}

export default function Home() {
  return (
    <GpuTextRoot className="flex h-svh flex-col overflow-hidden font-mono text-blog-mono">
      <TopBar />
      <main className="flex min-h-0 flex-1 flex-col gap-[1lh] px-[2ch] py-[1lh]">
        <h1 className="sr-only">{SITE.name} terminal</h1>
        <Terminal intro={<Boot />} />
      </main>
      <StatusBar />
    </GpuTextRoot>
  );
}
