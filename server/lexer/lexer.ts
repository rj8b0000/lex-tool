import { LexRule, LexSpecification, LexToken, LexError } from "../ast/lex";
import { compileNfa, longestNfaMatch, Nfa } from "../regex/nfa";

interface CompiledRule { rule: LexRule; nfa: Nfa; order: number; }
export interface ScanResult { tokens: LexToken[]; errors: LexError[]; logs: string[]; }

export class LexLexer {
  private readonly compiled: CompiledRule[];
  private index = 0; private line = 1; private column = 1;
  constructor(private readonly spec: LexSpecification, private readonly source: string) { this.compiled = spec.rules.map((rule, order) => ({ rule, nfa: compileNfa(rule.regex), order })); }
  reset(): void { this.index = 0; this.line = 1; this.column = 1; }
  peek(): LexToken | null { const old = [this.index, this.line, this.column]; const result = this.nextToken(); this.index = old[0]; this.line = old[1]; this.column = old[2]; return result; }
  nextToken(): LexToken | null {
    while (this.index < this.source.length) {
      let best: CompiledRule | null = null; let length = -1;
      for (const candidate of this.compiled) { const found = longestNfaMatch(candidate.nfa, this.source, this.index); if (found > length) { length = found; best = candidate; } }
      const start = this.index, line = this.line, column = this.column;
      if (!best || length <= 0) { const bad = this.source[this.index++]; this.advance(bad); return { token: "INVALID", lexeme: bad, value: bad, line, column, start, end: this.index }; }
      const lexeme = this.source.slice(this.index, this.index + length); this.index += length; this.advance(lexeme);
      if (best.rule.skip) continue;
      return { token: best.rule.token ?? "TOKEN", lexeme, value: lexeme, line, column, start, end: this.index };
    }
    return null;
  }
  tokenize(): ScanResult { this.reset(); const tokens: LexToken[] = []; const errors: LexError[] = []; const logs = ["Lexer initialized", "Scanning input..."]; let token: LexToken | null; while ((token = this.nextToken())) { if (token.token === "INVALID") errors.push({ message: `Invalid character: ${JSON.stringify(token.lexeme)}`, line: token.line, column: token.column, index: token.start }); else { tokens.push(token); logs.push(`Token generated: ${token.token} (${token.lexeme})`); } } logs.push("Analysis completed."); return { tokens, errors, logs }; }
  private advance(text: string): void { for (const c of text) { if (c === "\n") { this.line++; this.column = 1; } else this.column++; } }
}
