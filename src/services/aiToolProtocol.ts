export interface ToolCall {
  args: Record<string, string>;
  name: string;
  raw: string;
}

const MUTATING_TOOLS = new Set(["create_reminder", "save_patient_note", "add_note"]);

const decodeQuotedValue = (value: string): string =>
  value.replace(/\\(["'])/g, "$1");

export const parseToolArguments = (raw: string): Record<string, string> => {
  const normalized = raw.trim();
  if (!normalized) return {};

  try {
    const parsed: unknown = JSON.parse(normalized);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [
          key,
          value === null || value === undefined ? "" : String(value),
        ])
      );
    }
  } catch {
    // Local models often use function-style arguments instead of JSON.
  }

  const args: Record<string, string> = {};
  const argumentPattern =
    /([A-Za-z_][\w-]*)\s*=\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|([^\s,]+))/g;
  let match: RegExpExecArray | null;

  while ((match = argumentPattern.exec(normalized)) !== null) {
    const [, key, doubleQuoted, singleQuoted, unquoted] = match;
    const value = doubleQuoted ?? singleQuoted ?? unquoted ?? "";
    args[key] = doubleQuoted || singleQuoted ? decodeQuotedValue(value) : value;
  }

  return args;
};

export const extractToolCall = (text: string): ToolCall | null => {
  const markerStart = text.indexOf("[TOOL:");
  if (markerStart < 0) return null;

  let cursor = markerStart + "[TOOL:".length;
  while (/\s/.test(text[cursor] ?? "")) cursor += 1;

  const nameMatch = text.slice(cursor).match(/^([A-Za-z][A-Za-z0-9_]*)/);
  if (!nameMatch) return null;

  const name = nameMatch[1];
  cursor += name.length;
  while (/\s/.test(text[cursor] ?? "")) cursor += 1;
  if (text[cursor] !== "(") return null;

  const argsStart = cursor + 1;
  let depth = 1;
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (let index = argsStart; index < text.length; index += 1) {
    const character = text[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) {
        const rawEnd = text[index + 1] === "]" ? index + 2 : index + 1;
        return {
          name,
          args: parseToolArguments(text.slice(argsStart, index)),
          raw: text.slice(markerStart, rawEnd),
        };
      }
    }
  }

  return null;
};

export const isMutatingTool = (name: string): boolean =>
  MUTATING_TOOLS.has(name);

export const toolNeedsConfirmation = isMutatingTool;
