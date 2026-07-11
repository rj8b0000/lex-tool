import { parseLexSpecification } from "../parser/lex";

export function generateLexer(lexSpecification: string) {
  const parsed = parseLexSpecification(lexSpecification);
  if (!parsed.specification) return { generated: false, errors: parsed.errors, lexer: null };
  return { generated: parsed.errors.length === 0, errors: parsed.errors, lexer: { rules: parsed.specification.rules.length, definitions: Object.keys(parsed.specification.definitions), userCode: parsed.specification.userCode, api: ["nextToken", "peek", "tokenize", "reset"] } };
}
