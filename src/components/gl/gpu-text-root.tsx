"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RenderBackend } from "@/gl/stage";

export type TextRenderer = "dom" | RenderBackend;

const TextRendererContext = createContext<TextRenderer>("dom");

export function useTextRenderer(): TextRenderer {
  return useContext(TextRendererContext);
}

interface GpuTextRootProps {
  children: ReactNode;
  className?: string;
}

/**
 * Progressive enhancement: children render as plain DOM text until lettra is
 * up, then `data-text-renderer` hides the DOM glyphs (layout stays) and the
 * GPU draws them. Any failure leaves the DOM version in place.
 */
export function GpuTextRoot({ children, className }: GpuTextRootProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<TextRenderer>("dom");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    let dispose: (() => void) | undefined;

    const start = () =>
      import("@/gl/gpu-text")
        .then(({ startGpuText }) => startGpuText(root))
        .then((session) => {
          if (cancelled) {
            session.dispose();
            return;
          }
          dispose = session.dispose;
          setRenderer(session.backend);
        })
        .catch((error: unknown) => {
          console.warn("GPU text unavailable, keeping DOM text.", error);
        });

    // Deferred one task so a StrictMode mount/unmount/mount never boots two
    // GPU devices: the throwaway mount clears the timer before it fires.
    const startTimer = window.setTimeout(start, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      dispose?.();
      setRenderer("dom");
    };
  }, []);

  return (
    <TextRendererContext value={renderer}>
      <div ref={rootRef} data-text-renderer={renderer} className={className}>
        {children}
      </div>
    </TextRendererContext>
  );
}

const BACKEND_LABEL: Record<TextRenderer, string> = {
  dom: "DOM",
  webgpu: "WebGPU",
  webgl2: "WebGL2",
};

/** Header badge naming what is actually drawing the text right now. */
export function RendererBadge() {
  const renderer = useTextRenderer();
  return <span className="border px-[1ch]">{BACKEND_LABEL[renderer]}</span>;
}
