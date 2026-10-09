"use client";

import { useState, type FormEvent, type KeyboardEvent, type Ref } from "react";

const PROMPT = "joyco@studio:~$";
const PROMPT_LABEL_CLASS = "shrink-0 self-start px-[1ch]";
const PLACEHOLDER = { idle: "press / to type", focused: "type a command" } as const;

interface CommandLineProps {
  command: string;
}

/** An already-executed command, echoed the way the shell printed it. */
export function CommandLine({ command }: CommandLineProps) {
  return (
    <p className="mt-[1lh] flex gap-[1ch]">
      <span className={`${PROMPT_LABEL_CLASS} text-ink-muted`}>{PROMPT}</span>
      <span className="min-w-0 break-all">{command}</span>
    </p>
  );
}

interface PromptInputProps {
  ref?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /** Escape or ArrowUp: give focus back to the menu. */
  onExit: () => void;
}

const EXIT_KEYS = new Set(["Escape", "ArrowUp"]);

/**
 * The live prompt. A real text input so the keyboard owns it: typing from
 * the menu or pressing / lands here, Enter submits, Escape or ArrowUp return
 * to the menu. Its label fills only while it holds focus, like every other
 * focus owner on screen: the one blue thing is where keys go.
 */
export function PromptInput({ ref, value, onChange, onSubmit, onExit }: PromptInputProps) {
  const [focused, setFocused] = useState(false);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!EXIT_KEYS.has(event.key)) return;
    event.preventDefault();
    onExit();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value);
  };

  return (
    <form className="group/prompt flex gap-[1ch]" onSubmit={handleSubmit}>
      <label
        htmlFor="command"
        className={`${PROMPT_LABEL_CLASS} text-ink-muted group-focus-within/prompt:bg-primary group-focus-within/prompt:text-primary-foreground`}
      >
        {PROMPT}
      </label>
      <input
        ref={ref}
        data-gl-own-focus
        id="command"
        name="command"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={focused ? PLACEHOLDER.focused : PLACEHOLDER.idle}
        className="terminal-input w-full min-w-0 bg-transparent text-ink placeholder:text-ink-muted"
        aria-describedby="prompt-hint"
      />
    </form>
  );
}
