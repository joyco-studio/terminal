"use client";

import { useEffect, useRef, useState } from "react";
import { CommandLine, PromptInput } from "@/components/terminal/command-line";
import { CommandMenu, type CommandMenuHandle } from "@/components/terminal/command-menu";
import { CommandOutput } from "@/components/terminal/outputs";
import { resolveCommand, type CommandId } from "@/terminal/commands";

interface LogEntry {
  id: number;
  input: string;
  command: Exclude<CommandId, "clear"> | null;
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/** Session log, menu and prompt. Owns what has been run so far. */
export function Terminal() {
  const [entries, setEntries] = useState<readonly LogEntry[]>([]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(0);
  const latestEntryRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<CommandMenuHandle>(null);
  const promptRef = useRef<HTMLInputElement>(null);

  // keyboard-only: if focus ever falls to <body>, the next key goes back to the menu
  useEffect(() => {
    const recoverFocus = () => {
      if (document.activeElement === document.body) menuRef.current?.focus();
    };
    document.addEventListener("keydown", recoverFocus, { capture: true });
    return () => document.removeEventListener("keydown", recoverFocus, { capture: true });
  }, []);

  useEffect(() => {
    latestEntryRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
  }, [entries]);

  const run = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setDraft("");
    const command = resolveCommand(trimmed);
    if (command === "clear") {
      setEntries([]);
      return;
    }
    setEntries((previous) => [...previous, { id: nextId.current++, input: trimmed, command }]);
  };

  return (
    <>
      <div role="log" aria-label="Terminal output" aria-live="polite">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            ref={index === entries.length - 1 ? latestEntryRef : undefined}
            className="scroll-mt-[1lh]"
          >
            <CommandLine command={entry.input} />
            <CommandOutput command={entry.command} input={entry.input} />
          </div>
        ))}
      </div>
      <CommandMenu ref={menuRef} onSelect={run} onTypeAhead={() => promptRef.current?.focus()} />
      <PromptInput
        ref={promptRef}
        value={draft}
        onChange={setDraft}
        onSubmit={run}
        onExit={() => menuRef.current?.focus()}
      />
    </>
  );
}
