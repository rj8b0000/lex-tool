import { LexLexer, ScanResult } from "../lexer/lexer";
import { parseLexSpecification } from "../parser/lex";

export function tokenizeLex(lexSpecification: string, source: string): ScanResult & { success: boolean } {
  const parsed = parseLexSpecification(lexSpecification);
  if (!parsed.specification) return { tokens: [], errors: parsed.errors, logs: ["Parsing Lex specification...", "Lex specification failed to parse."], success: false };
  const result = new LexLexer(parsed.specification, source).tokenize();
  return { ...result, logs: ["Parsing Lex specification...", `Parsed ${parsed.specification.rules.length} rule${parsed.specification.rules.length === 1 ? "" : "s"}.`, "Generating lexer...", "Lexer generated.", "Tokenizing source...", ...result.logs.filter((log) => log !== "Lexer initialized" && log !== "Scanning input..."),], errors: [...parsed.errors, ...result.errors], success: parsed.errors.length === 0 && result.errors.length === 0 };
}
