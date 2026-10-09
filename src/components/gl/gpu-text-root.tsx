"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BootLoader } from "@/components/gl/boot-loader";
import { INITIAL_BOOT_PROGRESS, type BootProgress, type RenderBackend } from "@/gl/boot-progress";

export type TextRenderer = "dom" | RenderBackend;

interface GpuTextRootProps {
  children: ReactNode;
  className?: string;
}

/**
 * Progressive enhancement: a boot loader covers the page while the GPU comes
 * up, then the canvas takes over every pixel and the DOM below only keeps
 * layout, focus and semantics. Any failure drops the loader and leaves the
 * plain DOM terminal in place.
 */
export function GpuTextRoot({ children, className }: GpuTextRootProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<TextRenderer>("dom");
  const [boot, setBoot] = useState<BootProgress | null>(INITIAL_BOOT_PROGRESS);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    let dispose: (() => void) | undefined;

    const start = () =>
      import("@/gl/gpu-text")
        .then(({ startGpuText }) =>
          startGpuText(root, (progress) => {
            if (!cancelled) setBoot(progress);
          }),
        )
        .then((session) => {
          if (cancelled) {
            session.dispose();
            return;
          }
          dispose = session.dispose;
          setRenderer(session.backend);
          setBoot(null);
        })
        .catch((error: unknown) => {
          console.warn("GPU text unavailable, keeping DOM text.", error);
          if (!cancelled) setBoot(null);
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
    <>
      <div ref={rootRef} data-text-renderer={renderer} className={className}>
        {children}
      </div>
      {boot && <BootLoader progress={boot} />}
    </>
  );
}
