"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { PromptInput } from "@/components/terminal/command-line";
import { CommandMenu, type CommandMenuHandle } from "@/components/terminal/command-menu";
import { CommandPanel, type CommandPanelHandle, type PanelRun } from "@/components/terminal/command-panel";
import { COMMANDS, commandIndex, resolveCommand } from "@/terminal/commands";

const PROMPT_KEY = "/";

/**
 * Menu, output window and prompt as one shell: every menu option is a
 * command, picking one runs it, typing one in the prompt does the same. The
 * window exists only while a command is open; q or Escape closes it.
 */
interface TerminalProps {
  /** Logo and status lines heading the left column; they set its width. */
  intro: ReactNode;
}

export function Terminal({ intro }: TerminalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [run, setRun] = useState<PanelRun | null>(null);
  const [draft, setDraft] = useState("");
  /** What was typed when a command was not found; shown under the window, by the prompt. */
  const [notFound, setNotFound] = useState<string | null>(null);
  const menuRef = useRef<CommandMenuHandle>(null);
  const panelRef = useRef<CommandPanelHandle>(null);
  const promptRef = useRef<HTMLInputElement>(null);

  // keyboard-only: "/" jumps to the prompt from anywhere outside it, and if
  // focus ever falls to <body>, the next key goes back to the menu
  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      const prompt = promptRef.current;
      if (event.key === PROMPT_KEY && prompt && document.activeElement !== prompt) {
        event.preventDefault();
        prompt.focus();
        return;
      }
      if (document.activeElement === document.body) menuRef.current?.focus();
    };
    document.addEventListener("keydown", handleGlobalKey, { capture: true });
    return () => document.removeEventListener("keydown", handleGlobalKey, { capture: true });
  }, []);

  const execute = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setDraft("");
    const command = resolveCommand(trimmed);
    // an unknown command is a shell error, not content: report it by the prompt, keep focus there
    if (!command) {
      setNotFound(trimmed);
      return;
    }

    setNotFound(null);
    setActiveIndex(commandIndex(command));
    // render the output first so the window can select its first link
    flushSync(() => setRun({ input: trimmed, command }));
    panelRef.current?.enter();
  };

  const runOption = (index: number) => execute(COMMANDS[index].id);

  const close = () => {
    setRun(null);
    menuRef.current?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[1lh] md:flex-row md:gap-[2ch]">
      {/* left column: as wide as the intro block, menu stretched to match, prompt at the foot */}
      <div className="flex min-h-0 shrink-0 flex-col gap-[1lh] md:w-max">
        <header>{intro}</header>
        <CommandMenu
          ref={menuRef}
          activeIndex={activeIndex}
          onMove={setActiveIndex}
          onOpen={runOption}
          onTypeAhead={() => promptRef.current?.focus()}
        />
        <div className="mt-auto flex flex-col">
          <p role="status" className="min-h-[1lh]">
            {notFound && (
              <>
                <span className="text-ink-muted">[ ERR ]</span> command not found: {notFound} · try help
              </>
            )}
          </p>
          <PromptInput
            ref={promptRef}
            value={draft}
            onChange={(value) => {
              // "/" only summons the prompt; whatever the keyboard layout, it never lands as text
              if (value === PROMPT_KEY) return;
              setNotFound(null);
              setDraft(value);
            }}
            onSubmit={execute}
            onExit={() => menuRef.current?.focus()}
          />
        </div>
      </div>
      {run && <CommandPanel ref={panelRef} run={run} onClose={close} />}
    </div>
  );
}
