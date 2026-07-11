import { describe, expect, it } from "vitest";
import { tokenizeLex } from "../tokenizer";

const spec = `DIGIT [0-9]
%%
"if" { return IF; }
[a-z]+ { return ID; }
{DIGIT}+ { return NUMBER; }
[ \t\n]+ { continue; }
%%`;

describe("Lex NFA lexer", () => {
  it("uses longest match and first rule on ties", () => {
    const result = tokenizeLex(spec, "if abc 123");
    expect(result.success).toBe(true);
    expect(result.tokens.map((x) => x.token)).toEqual(["IF", "ID", "NUMBER"]);
    expect(result.tokens[1].lexeme).toBe("abc");
  });

  it("tracks positions and continues after invalid characters", () => {
    const result = tokenizeLex(spec, "a\n@b");
    expect(result.tokens[0]).toMatchObject({ token: "ID", line: 1, column: 1, start: 0, end: 1 });
    expect(result.tokens[1]).toMatchObject({ token: "ID", lexeme: "b", line: 2, column: 2 });
    expect(result.errors[0]).toMatchObject({ line: 2, column: 1 });
  });

  it("skips whitespace", () => expect(tokenizeLex(spec, "  42\t").tokens.map((x) => x.lexeme)).toEqual(["42"]));
});
