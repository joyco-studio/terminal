"use client";

import { useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { SectionRule } from "@/components/terminal/section-rule";
import { COMMANDS, type CommandId } from "@/terminal/commands";

export interface CommandMenuHandle {
  /** Returns focus to the active item. */
  focus(): void;
}

interface CommandMenuProps {
  ref?: Ref<CommandMenuHandle>;
  onSelect: (command: CommandId) => void;
  /** A printable key that is not a shortcut: hand it to the prompt. */
  onTypeAhead: () => void;
}

function isTypeAhead(event: KeyboardEvent): boolean {
  const printable = event.key.length === 1 && event.key !== " ";
  const modified = event.ctrlKey || event.metaKey || event.altKey;
  return printable && !modified;
}

function wrapIndex(index: number): number {
  return (index + COMMANDS.length) % COMMANDS.length;
}

/**
 * Game-style main menu. Roving tabindex: Tab enters on the active item,
 * arrows move it, Enter/Space run it, digits jump straight to a command,
 * any other letter starts typing in the prompt.
 */
export function CommandMenu({ ref, onSelect, onTypeAhead }: CommandMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useImperativeHandle(ref, () => ({
    focus: () => itemRefs.current[activeIndex]?.focus(),
  }));

  useEffect(() => {
    itemRefs.current[0]?.focus({ preventScroll: true });
  }, []);

  const focusItem = (index: number) => {
    const next = wrapIndex(index);
    setActiveIndex(next);
    itemRefs.current[next]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const keyActions: Record<string, () => void> = {
      ArrowDown: () => focusItem(activeIndex + 1),
      ArrowUp: () => focusItem(activeIndex - 1),
      Home: () => focusItem(0),
      End: () => focusItem(COMMANDS.length - 1),
    };
    const action = keyActions[event.key];
    if (action) {
      event.preventDefault();
      action();
      return;
    }

    const shortcut = COMMANDS[Number(event.key) - 1];
    if (shortcut) {
      event.preventDefault();
      focusItem(Number(event.key) - 1);
      onSelect(shortcut.id);
      return;
    }

    // focus moves before the key's default action, so the character lands in the prompt
    if (isTypeAhead(event)) onTypeAhead();
  };

  return (
    <nav aria-label="Main menu">
      <SectionRule title="Main menu" />
      <ul className="mt-[0.5lh] flex flex-col" onKeyDown={handleKeyDown}>
        {COMMANDS.map((command, index) => {
          const isActive = index === activeIndex;
          return (
            <li key={command.id}>
              <button
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                tabIndex={isActive ? 0 : -1}
                aria-keyshortcuts={String(index + 1)}
                onClick={() => onSelect(command.id)}
                onFocus={() => setActiveIndex(index)}
                className={`grid w-full max-w-[60ch] grid-cols-[2ch_4ch_14ch_1fr] text-left uppercase ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-screen-border"
                }`}
              >
                <span aria-hidden="true">{isActive ? ">" : ""}</span>
                <span aria-hidden="true" className={isActive ? "" : "text-ink-muted"}>
                  [{index + 1}]
                </span>
                <span>{command.label}</span>
                <span className={`normal-case ${isActive ? "" : "text-ink-muted"}`}>
                  {command.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
