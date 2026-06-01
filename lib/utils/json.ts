export function parseJsonWithControlCharacterRepair<T = unknown>(
  input: string
): T {
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    if (!isControlCharacterJsonParseError(error)) {
      throw error;
    }
    return JSON.parse(escapeControlCharactersInJsonStrings(input)) as T;
  }
}

export function extractFirstJsonObject(input: string): string | null {
  const start = input.indexOf("{");
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (inString && char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, index + 1);
      }
    }
  }

  return null;
}

function isControlCharacterJsonParseError(error: unknown): boolean {
  if (!(error instanceof SyntaxError)) {
    return false;
  }

  return /control character/i.test(error.message);
}

function escapeControlCharactersInJsonStrings(input: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = inString;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString && char && char < " ") {
      result += escapeControlCharacter(char);
      continue;
    }

    result += char;
  }

  return result;
}

function escapeControlCharacter(char: string): string {
  switch (char) {
    case "\b":
      return "\\b";
    case "\f":
      return "\\f";
    case "\n":
      return "\\n";
    case "\r":
      return "\\r";
    case "\t":
      return "\\t";
    default:
      return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
  }
}
