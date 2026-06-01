import { describe, expect, it } from "vitest";
import {
  extractFirstJsonObject,
  parseJsonWithControlCharacterRepair,
} from "@/lib/utils/json";

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

describe("extractFirstJsonObject", () => {
  it("extracts the first complete object when trailing prose contains braces", () => {
    expect(
      extractFirstJsonObject(
        'prefix {"summary":"ok","items":[{"name":"x"}]} trailing {not json}'
      )
    ).toBe('{"summary":"ok","items":[{"name":"x"}]}');
  });

  it("ignores braces inside JSON strings", () => {
    expect(
      extractFirstJsonObject('{"summary":"uses {curly} braces","items":[]}\n{"extra":true}')
    ).toBe('{"summary":"uses {curly} braces","items":[]}');
  });

  it("returns null when no complete object is present", () => {
    expect(extractFirstJsonObject('{"summary":"missing end"')).toBeNull();
  });
});
