import type { FormEvent, KeyboardEvent, Ref } from "react";

const PROMPT = "joyco@studio:~$";
const PROMPT_CLASS = "shrink-0 self-start bg-primary px-[1ch] text-primary-foreground";

interface CommandLineProps {
  command: string;
}

/** An already-executed command, echoed the way the shell printed it. */
export function CommandLine({ command }: CommandLineProps) {
  return (
    <p className="mt-[1lh] flex gap-[1ch]">
      <span className={PROMPT_CLASS}>{PROMPT}</span>
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
 * the menu lands here, Enter submits, Escape or ArrowUp return to the menu.
 */
export function PromptInput({ ref, value, onChange, onSubmit, onExit }: PromptInputProps) {
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
    <form className="mt-[1lh] flex gap-[1ch]" onSubmit={handleSubmit}>
      <label htmlFor="command" className={PROMPT_CLASS}>
        {PROMPT}
      </label>
      <input
        ref={ref}
        id="command"
        name="command"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="or type a command"
        className="terminal-input w-full min-w-0 bg-transparent text-ink placeholder:text-ink-muted"
        aria-describedby="prompt-hint"
      />
    </form>
  );
}
