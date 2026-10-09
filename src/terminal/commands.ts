export interface CommandDefinition {
  id: string;
  label: string;
  description: string;
  aliases: readonly string[];
}

/** Menu order is shortcut order: the first command is key 1. */
export const COMMANDS = [
  { id: "about", label: "About", description: "Who we are", aliases: ["cat about", "whoami"] },
  { id: "showcase", label: "Showcase", description: "Selected work", aliases: ["ls showcase", "work"] },
  { id: "capabilities", label: "Capabilities", description: "What we do", aliases: ["services"] },
  { id: "contact", label: "Contact", description: "Start a project", aliases: ["mail"] },
  { id: "lab", label: "Lab", description: "Experiments", aliases: ["experiments", "ls lab"] },
  { id: "help", label: "Help", description: "All commands", aliases: ["?", "menu"] },
] as const satisfies readonly CommandDefinition[];

export type CommandId = (typeof COMMANDS)[number]["id"];

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function commandAtShortcut(input: string): CommandId | null {
  const shortcut = Number(input);
  if (!Number.isInteger(shortcut)) return null;
  return COMMANDS[shortcut - 1]?.id ?? null;
}

/** Maps typed input to a command by id, alias, or menu number. */
export function resolveCommand(input: string): CommandId | null {
  const normalized = normalize(input);
  const match = COMMANDS.find(
    (command) =>
      command.id === normalized || command.aliases.some((alias) => alias === normalized),
  );
  return match?.id ?? commandAtShortcut(normalized);
}

export function commandIndex(id: CommandId): number {
  return COMMANDS.findIndex((command) => command.id === id);
}
