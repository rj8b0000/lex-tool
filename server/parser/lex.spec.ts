import { describe, expect, it } from "vitest";
import { parseLexSpecification } from "./lex";

const spec = `%{ const user = true; %}
DIGIT [0-9]
ID [a-zA-Z_][a-zA-Z0-9_]*
%%
{DIGIT}+ { return NUMBER; }
{ID} { return('IDENT'); }
[ \t\n]+ { /* whitespace */ continue; }
%%
user code`;

describe("Lex specification parser", () => {
  it("parses definitions, rules, actions, and user code", () => {
    const result = parseLexSpecification(spec);
    expect(result.errors).toEqual([]);
    expect(result.specification?.definitions.DIGIT).toBe("[0-9]");
    expect(result.specification?.rules.map((r) => r.token)).toEqual(["NUMBER", "IDENT", null]);
    expect(result.specification?.rules[2].skip).toBe(true);
    expect(result.specification?.userCode).toContain("user code");
  });

  it("reports malformed specifications", () => {
    expect(parseLexSpecification("ID [a-z]\n{ID} { return ID; }").errors.length).toBeGreaterThan(0);
  });
});
