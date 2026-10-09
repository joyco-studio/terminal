import { SpecList } from "@/components/terminal/spec-list";
import { bootRatio, type BootProgress } from "@/gl/boot-progress";

const PERCENT = 100;
const PENDING = "...";

interface BootLoaderProps {
  progress: BootProgress;
}

function bootRows(progress: BootProgress): ReadonlyArray<readonly [string, string]> {
  return [
    ["gpu_device", progress.backend ? progress.backend.toUpperCase() : PENDING],
    ["lettra_fonts", `${progress.fontsLoaded}/${progress.fontsTotal}`],
    ["tsl_pipelines", progress.shadersReady ? "OK" : PENDING],
  ];
}

/**
 * Covers the page while the GPU boots so the raw DOM never flashes. Plain
 * DOM on purpose: it has to paint before any of the GL bundle exists.
 */
export function BootLoader({ progress }: BootLoaderProps) {
  const percent = Math.round(bootRatio(progress) * PERCENT);

  return (
    <div
      data-boot-loader
      className="fixed inset-0 z-20 flex items-center bg-screen px-[2ch] font-mono text-blog-mono text-ink"
    >
      <div className="mx-auto w-full max-w-[60ch]">
        <p className="text-caption-mono text-ink-muted">JOYCO terminal v0.1 · boot</p>
        <div className="mt-[1lh]">
          <SpecList rows={bootRows(progress)} />
        </div>
        <div className="mt-[1lh] flex items-center gap-[2ch]">
          <div
            role="progressbar"
            aria-label="Booting terminal"
            aria-valuemin={0}
            aria-valuemax={PERCENT}
            aria-valuenow={percent}
            className="h-[1lh] flex-1 border border-ink p-[2px]"
          >
            <div
              className="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="w-[4ch] text-right tabular-nums">{percent}%</span>
        </div>
        <p className="mt-[1lh] text-ink-muted" role="status">
          booting<span aria-hidden="true" className="terminal-caret">_</span>
        </p>
      </div>
      <noscript>
        <style>{"[data-boot-loader]{display:none}"}</style>
      </noscript>
    </div>
  );
}
