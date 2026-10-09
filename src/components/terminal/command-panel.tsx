"use client";

import { useId, useImperativeHandle, useRef, type KeyboardEvent, type Ref } from "react";
import { CommandLine } from "@/components/terminal/command-line";
import { CommandOutput } from "@/components/terminal/outputs";
import { COMMANDS, commandIndex, type CommandId } from "@/terminal/commands";

const LINK_SELECTOR = "a[href]";
const STEP: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };
/** Escape, or q like a pager (less, man). */
const CLOSE_KEYS = new Set(["Escape", "q", "Q"]);

export interface CommandPanelHandle {
  /** Takes focus: the first link when there is one, the scroll body otherwise. */
  enter(): void;
}

/** One executed command: what was typed and what it resolved to. */
export interface PanelRun {
  input: string;
  command: CommandId;
}

interface CommandPanelProps {
  ref?: Ref<CommandPanelHandle>;
  /** The command this window shows. */
  run: PanelRun;
  /** Escape: close the output and hand focus back to the menu. */
  onClose: () => void;
}

function panelTitle(run: PanelRun): string {
  return COMMANDS[commandIndex(run.command)].label;
}

function linksIn(body: HTMLElement | null): HTMLAnchorElement[] {
  return body ? Array.from(body.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR)) : [];
}

function focusLink(link: HTMLAnchorElement | undefined): void {
  link?.focus();
  link?.scrollIntoView({ block: "nearest" });
}

/**
 * The output window: exists only while a command's output is open, and
 * shows that one output, never a growing log. Inside it, arrows move between its links like
 * menu rows (or scroll when there are none), Enter opens the selected link,
 * Escape closes it. The title bar fills while it holds focus.
 */
export function CommandPanel({ ref, run, onClose }: CommandPanelProps) {
  const titleId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    enter: () => {
      const [first] = linksIn(bodyRef.current);
      if (first) focusLink(first);
      else bodyRef.current?.focus();
    },
  }));

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (CLOSE_KEYS.has(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      onClose();
      return;
    }

    const step = STEP[event.key];
    const links = linksIn(bodyRef.current);
    if (!step || links.length === 0) return;

    event.preventDefault();
    const current = links.findIndex((link) => link === document.activeElement);
    const next = Math.min(links.length - 1, Math.max(0, current + step));
    focusLink(links[current === -1 ? 0 : next]);
  };

  return (
    <section
      aria-labelledby={titleId}
      className="group/panel flex min-h-0 flex-1 flex-col border border-ink-muted focus-within:border-ink"
    >
      <h2
        id={titleId}
        data-gl-hatch
        className="diagonal-bg flex items-center justify-between gap-[2ch] border-b border-ink-muted px-[1ch] text-caption-mono group-focus-within/panel:border-ink group-focus-within/panel:bg-primary group-focus-within/panel:text-primary-foreground"
      >
        <span>[ {panelTitle(run)} ]</span>
        <span aria-hidden="true" className="hidden group-focus-within/panel:inline">
          Arrows move · Enter open · Q/Esc close
        </span>
      </h2>
      <div
        ref={bodyRef}
        tabIndex={0}
        data-gl-clip
        data-gl-own-focus
        onKeyDown={handleKeyDown}
        className="min-h-0 flex-1 overflow-y-auto px-[2ch] pb-[1lh]"
      >
        {/* keyed so each output mounts fresh text and decodes in on the GPU */}
        <div key={`${run.input}:${run.command}`}>
          <CommandLine command={run.input} />
          <div className="mt-[1lh]">
            <CommandOutput command={run.command} />
          </div>
        </div>
      </div>
    </section>
  );
}
