import { GpuTextRoot, RendererBadge } from "@/components/gl/gpu-text-root";
import { CommandLine } from "@/components/terminal/command-line";
import { Terminal } from "@/components/terminal/terminal";
import { ASCII_LOGO, SITE } from "@/content/joyco";
import { COMMANDS } from "@/terminal/commands";

const CONTROL_HINTS = [
  "Arrows navigate",
  "Enter select",
  `1-${COMMANDS.length} shortcut`,
  "Type to prompt",
  "Esc to menu",
] as const;

function TopBar() {
  return (
    <header data-gl-hatch className="diagonal-bg flex items-center justify-between gap-[2ch] border-b px-[2ch] py-[0.5lh] text-caption-mono">
      <div className="flex items-center gap-[2ch]">
        <span className="bg-ink px-[1ch] text-screen">{SITE.name}</span>
        <span>Terminal v0.1</span>
      </div>
      <div className="hidden items-center gap-[2ch] text-ink-muted md:flex">
        <span>{SITE.coordinates}</span>
        <span aria-hidden="true">·</span>
        <span>
          {SITE.days} {SITE.hours} {SITE.timezone}
        </span>
      </div>
      <RendererBadge />
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
      <p className="mt-[1lh] text-caption-mono text-ink-muted">
        {SITE.tagline} · {SITE.url} · {SITE.hotline}
      </p>
      <CommandLine command={`connect ${SITE.url}`} />
      <p>
        <span className="text-ink-muted">[ OK ]</span> {SITE.documentCount} documents · text/markdown
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
      <p>lettra · three/webgpu · tsl</p>
    </footer>
  );
}

export default function Home() {
  return (
    <GpuTextRoot className="flex min-h-svh flex-col font-mono text-blog-mono">
      <TopBar />
      <main className="flex flex-1 flex-col px-[2ch] py-[1lh]">
        <h1 className="sr-only">{SITE.name} terminal</h1>
        <Boot />
        <Terminal />
      </main>
      <StatusBar />
    </GpuTextRoot>
  );
}
