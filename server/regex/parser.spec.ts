import { describe, expect, it } from "vitest";
import type { RegexNode } from "../ast/lex";
import { RegexParser } from "./parser";

describe("Lex regex parser", () => {
  it("parses macros, grouping, alternation, and repetition", () => {
    const node = new RegexParser("({DIGIT}+|[a-z]?)", { DIGIT: "[0-9]" }).parse();
    expect(node.kind).toBe("alternate");
  });

  it("decodes escaped characters and negated classes", () => {
    const node = new RegexParser("[^\\n]\\+\\t").parse();
    expect(node.kind).toBe("concat");
    expect((node as { kind: "concat"; parts: RegexNode[] }).parts).toHaveLength(3);
  });

  it("rejects unknown macros and malformed groups", () => {
    expect(() => new RegexParser("{UNKNOWN}").parse()).toThrow("Unknown");
    expect(() => new RegexParser("(abc").parse()).toThrow("Unclosed group");
  });
});
