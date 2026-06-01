import { describe, expect, it } from "vitest";
import { parseJsonWithControlCharacterRepair } from "@/lib/utils/json";

describe("parseJsonWithControlCharacterRepair", () => {
  it("parses valid JSON without changing escaped content", () => {
    expect(
      parseJsonWithControlCharacterRepair<{ text: string }>(
        '{"text":"line one\\nline two"}'
      )
    ).toEqual({ text: "line one\nline two" });
  });

  it("repairs raw control characters inside string literals", () => {
    expect(
      parseJsonWithControlCharacterRepair<{ text: string }>(
        '{"text":"line one\nline two\tindented"}'
      )
    ).toEqual({ text: "line one\nline two\tindented" });
  });

  it("still rejects malformed JSON for non-control-character errors", () => {
    expect(() =>
      parseJsonWithControlCharacterRepair('{"text": "missing end"')
    ).toThrow(SyntaxError);
  });
});
