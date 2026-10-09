"use client";

import { useEffect, useImperativeHandle, useRef, type KeyboardEvent, type Ref } from "react";
import { COMMANDS } from "@/terminal/commands";

export interface CommandMenuHandle {
  /** Returns focus to the active item. */
  focus(): void;
}

interface CommandMenuProps {
  ref?: Ref<CommandMenuHandle>;
  activeIndex: number;
  /** Arrow keys: move the selection. */
  onMove: (index: number) => void;
  /** Enter or Space: run the item's command. */
  onOpen: (index: number) => void;
  /** A printable key that is not a shortcut: hand it to the prompt. */
  onTypeAhead: () => void;
}

/** Breathing room between the command name and its description. */
const NAME_GAP_CH = 3;
/** Letter-spacing (0.06em) makes each glyph ~0.1ch wider than `ch`. */
const TRACKING_PER_CHAR_CH = 0.1;
const LONGEST_NAME = Math.max(...COMMANDS.map((command) => command.id.length));
const NAME_COLUMN_CH = Math.ceil(LONGEST_NAME * (1 + TRACKING_PER_CHAR_CH)) + NAME_GAP_CH;
/** marker · [n] · name · description */
const ROW_COLUMNS = `2ch 4ch ${NAME_COLUMN_CH}ch 1fr`;

function wrapIndex(index: number): number {
  return (index + COMMANDS.length) % COMMANDS.length;
}

function isTypeAhead(event: KeyboardEvent): boolean {
  const printable = event.key.length === 1 && event.key !== " ";
  const modified = event.ctrlKey || event.metaKey || event.altKey;
  return printable && !modified;
}

/**
 * BIOS-style menu of commands. Roving tabindex: Tab enters on the active
 * item, arrows or a digit move it, Enter/Space run its command, any other
 * letter starts typing in the prompt.
 */
export function CommandMenu({ ref, activeIndex, onMove, onOpen, onTypeAhead }: CommandMenuProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useImperativeHandle(ref, () => ({
    focus: () => itemRefs.current[activeIndex]?.focus(),
  }));

  useEffect(() => {
    itemRefs.current[0]?.focus({ preventScroll: true });
  }, []);

  const moveTo = (index: number) => {
    const next = wrapIndex(index);
    onMove(next);
    itemRefs.current[next]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const keyActions: Record<string, () => void> = {
      ArrowDown: () => moveTo(activeIndex + 1),
      ArrowUp: () => moveTo(activeIndex - 1),
      Home: () => moveTo(0),
      End: () => moveTo(COMMANDS.length - 1),
    };
    const action = keyActions[event.key];
    if (action) {
      event.preventDefault();
      action();
      return;
    }

    // a digit only selects; Enter is what runs, like every other row
    const shortcutIndex = Number(event.key) - 1;
    if (COMMANDS[shortcutIndex]) {
      event.preventDefault();
      moveTo(shortcutIndex);
      return;
    }

    // focus moves before the key's default action, so the character lands in the prompt
    if (isTypeAhead(event)) onTypeAhead();
  };

  return (
    <nav aria-label="Main menu" className="flex flex-col">
      <h2 className="flex items-center gap-[1ch] px-[1ch] text-caption-mono">
        <span aria-hidden="true" className="h-px w-[2ch] bg-ink" />
        <span>Main menu</span>
        <span aria-hidden="true" className="h-px flex-1 bg-ink-muted" />
      </h2>
      <ul className="group/menu mt-[0.5lh] flex flex-col" onKeyDown={handleKeyDown}>
        {COMMANDS.map((command, index) => {
          const isActive = index === activeIndex;
          return (
            <li key={command.id}>
              <button
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                data-gl-own-focus
                tabIndex={isActive ? 0 : -1}
                aria-current={isActive ? "true" : undefined}
                aria-keyshortcuts={String(index + 1)}
                onClick={() => onOpen(index)}
                onFocus={() => {
                  if (!isActive) onMove(index);
                }}
                style={{ gridTemplateColumns: ROW_COLUMNS }}
                className={`grid w-full px-[1ch] text-left ${
                  // filled only while the menu holds focus; elsewhere the > marker keeps the place
                  isActive
                    ? "group-focus-within/menu:bg-primary group-focus-within/menu:text-primary-foreground"
                    : "text-ink-muted"
                }`}
              >
                <span aria-hidden="true">{isActive ? ">" : ""}</span>
                <span aria-hidden="true">[{index + 1}]</span>
                <span>{command.id}</span>
                <span className="whitespace-nowrap">{command.description}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
