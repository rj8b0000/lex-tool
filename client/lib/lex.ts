import type { AnalysisResult, LexError, TokenRecord } from "@/types/lex";

type RegexNode =
  | { kind: "empty" }
  | { kind: "literal"; value: string }
  | { kind: "class"; chars: Set<string>; negated: boolean }
  | { kind: "any" }
  | { kind: "concat"; parts: RegexNode[] }
  | { kind: "alternate"; alternatives: RegexNode[] }
  | { kind: "repeat"; child: RegexNode; min: number; max: number | null };

interface LexRule {
  pattern: string;
  regex: RegexNode;
  action: string;
  token: string | null;
  skip: boolean;
  line: number;
}

interface LexSpecification {
  definitions: Record<string, string>;
  rules: LexRule[];
  userCode: string;
  source: string;
}

interface LexToken extends TokenRecord {
  value: string;
  start: number;
  end: number;
}

interface ScanResult {
  tokens: LexToken[];
  errors: LexError[];
  logs: string[];
}

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function stripComments(source: string): string {
  let out = "";
  let quote = "";
  let block = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1];
    if (block) {
      if (c === "*" && n === "/") {
        block = false;
        i++;
        out += "  ";
      } else {
        out += c === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (quote) {
      out += c;
      if (c === "\\") {
        out += n || "";
        i++;
      } else if (c === quote) {
        quote = "";
      }
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      out += c;
      continue;
    }
    if (c === "/" && n === "*") {
      block = true;
      i++;
      out += "  ";
      continue;
    }
    if (c === "/" && n === "/") {
      while (i < source.length && source[i] !== "\n") {
        out += " ";
        i++;
      }
      if (i < source.length) out += "\n";
      continue;
    }
    out += c;
  }
  return out;
}

function unescapeLexChar(value: string): string {
  const map: Record<string, string> = {
    n: "\n",
    r: "\r",
    t: "\t",
    f: "\f",
    v: "\v",
    b: "\b",
  };

  if (value.length === 2 && value[0] === "\\") return map[value[1]] ?? value[1];
  if (value.startsWith("\\x")) return String.fromCharCode(parseInt(value.slice(2), 16));
  if (value.startsWith("\\u")) return String.fromCharCode(parseInt(value.slice(2), 16));
  return value;
}

class RegexParser {
  private i = 0;

  constructor(private readonly text: string, private readonly macros: Record<string, string> = {}, private readonly stack = new Set<string>()) {}

  parse(): RegexNode {
    const node = this.alternation();
    if (this.i < this.text.length) throw new Error(`Unexpected regex character '${this.text[this.i]}'`);
    return node;
  }

  private alternation(): RegexNode {
    const xs = [this.concat()];
    while (this.take("|")) xs.push(this.concat());
    return xs.length === 1 ? xs[0] : { kind: "alternate", alternatives: xs };
  }

  private concat(): RegexNode {
    const xs: RegexNode[] = [];
    while (this.i < this.text.length && !["|", ")"].includes(this.text[this.i])) xs.push(this.repeat());
    return xs.length === 0 ? { kind: "empty" } : xs.length === 1 ? xs[0] : { kind: "concat", parts: xs };
  }

  private repeat(): RegexNode {
    let node = this.atom();
    while (this.i < this.text.length) {
      const c = this.text[this.i];
      if (c === "*") {
        this.i++;
        node = { kind: "repeat", child: node, min: 0, max: null };
      } else if (c === "+") {
        this.i++;
        node = { kind: "repeat", child: node, min: 1, max: null };
      } else if (c === "?") {
        this.i++;
        node = { kind: "repeat", child: node, min: 0, max: 1 };
      } else break;
    }
    return node;
  }

  private atom(): RegexNode {
    const c = this.text[this.i++];
    if (c === "(") {
      const n = this.alternation();
      if (!this.take(")")) throw new Error("Unclosed group");
      return n;
    }
    if (c === ".") return { kind: "any" };
    if (c === "[") return this.characterClass();
    if (c === "\\") return { kind: "literal", value: unescapeLexChar("\\" + (this.text[this.i++] ?? "")) };
    if (c === '"' || c === "'") {
      let value = "";
      while (this.i < this.text.length && this.text[this.i] !== c) {
        const x = this.text[this.i++];
        value += x === "\\" ? unescapeLexChar("\\" + (this.text[this.i++] ?? "")) : x;
      }
      if (!this.take(c)) throw new Error("Unclosed quoted literal");
      return value.length === 1
        ? { kind: "literal", value }
        : { kind: "concat", parts: [...value].map((value) => ({ kind: "literal", value })) };
    }
    if (c === "{") {
      const end = this.text.indexOf("}", this.i);
      if (end < 0) throw new Error("Unclosed macro");
      const name = this.text.slice(this.i, end);
      this.i = end + 1;
      if (!this.macros[name] || this.stack.has(name)) throw new Error(`Unknown or recursive macro: ${name}`);
      const next = new Set(this.stack);
      next.add(name);
      return new RegexParser(this.macros[name], this.macros, next).parse();
    }
    if (c === ")" || c === "|") throw new Error(`Unexpected regex character '${c}'`);
    return { kind: "literal", value: c };
  }

  private characterClass(): RegexNode {
    const negated = this.take("^");
    const chars = new Set<string>();
    while (this.i < this.text.length && this.text[this.i] !== "]") {
      const first = this.classChar();
      if (this.take("-") && this.text[this.i] !== "]") {
        const last = this.classChar();
        for (let n = first.charCodeAt(0); n <= last.charCodeAt(0); n++) chars.add(String.fromCharCode(n));
      } else {
        chars.add(first);
      }
    }
    if (!this.take("]")) throw new Error("Unclosed character class");
    return { kind: "class", chars, negated };
  }

  private classChar(): string {
    if (this.text[this.i] === "\\") {
      this.i++;
      return unescapeLexChar("\\" + (this.text[this.i++] ?? ""));
    }
    return this.text[this.i++];
  }

  private take(value: string): boolean {
    if (this.text.startsWith(value, this.i)) {
      this.i += value.length;
      return true;
    }
    return false;
  }
}

interface NfaEdge {
  to: number;
  epsilon?: boolean;
  chars?: Set<string>;
  negated?: boolean;
  any?: boolean;
}

interface Nfa {
  start: number;
  accepts: Set<number>;
  edges: Map<number, NfaEdge[]>;
  states: number;
}

function compileNfa(node: RegexNode): Nfa {
  const edges = new Map<number, NfaEdge[]>();
  let next = 0;
  const state = () => next++;
  const add = (from: number, edge: NfaEdge) => edges.set(from, [...(edges.get(from) ?? []), edge]);

  const build = (n: RegexNode): [number, number] => {
    if (n.kind === "empty") {
      const a = state();
      const b = state();
      add(a, { to: b, epsilon: true });
      return [a, b];
    }
    if (n.kind === "literal" || n.kind === "class" || n.kind === "any") {
      const a = state();
      const b = state();
      add(a, n.kind === "literal" ? { to: b, chars: new Set([n.value]) } : n.kind === "class" ? { to: b, chars: n.chars, negated: n.negated } : { to: b, any: true });
      return [a, b];
    }
    if (n.kind === "concat") {
      const first = build(n.parts[0] ?? { kind: "empty" });
      let end = first[1];
      for (const part of n.parts.slice(1)) {
        const x = build(part);
        add(end, { to: x[0], epsilon: true });
        end = x[1];
      }
      return [first[0], end];
    }
    if (n.kind === "alternate") {
      const a = state();
      const b = state();
      for (const option of n.alternatives) {
        const x = build(option);
        add(a, { to: x[0], epsilon: true });
        add(x[1], { to: b, epsilon: true });
      }
      return [a, b];
    }

    const a = state();
    const b = state();
    if (n.min === 0) add(a, { to: b, epsilon: true });
    const required = n.min;
    let cursor = a;
    for (let i = 0; i < required; i++) {
      const x = build(n.child);
      add(cursor, { to: x[0], epsilon: true });
      cursor = x[1];
    }
    if (n.max === null) {
      add(cursor, { to: b, epsilon: true });
      const x = build(n.child);
      add(cursor, { to: x[0], epsilon: true });
      add(x[1], { to: cursor, epsilon: true });
    } else {
      for (let i = required; i < n.max; i++) {
        add(cursor, { to: b, epsilon: true });
        const x = build(n.child);
        add(cursor, { to: x[0], epsilon: true });
        cursor = x[1];
      }
      add(cursor, { to: b, epsilon: true });
    }
    return [a, b];
  };

  const [start, accept] = build(node);
  return { start, accepts: new Set([accept]), edges, states: next };
}

function closure(nfa: Nfa, states: Set<number>): Set<number> {
  const out = new Set(states);
  const todo = [...states];
  while (todo.length) {
    const from = todo.pop()!;
    for (const edge of nfa.edges.get(from) ?? []) {
      if (edge.epsilon && !out.has(edge.to)) {
        out.add(edge.to);
        todo.push(edge.to);
      }
    }
  }
  return out;
}

function accepts(edge: NfaEdge, char: string): boolean {
  return edge.any || (!!edge.chars && (edge.negated ? !edge.chars.has(char) : edge.chars.has(char)));
}

function longestNfaMatch(nfa: Nfa, input: string, start: number): number {
  let current = closure(nfa, new Set([nfa.start]));
  let best = currentHasAccept(nfa, current) ? 0 : -1;
  for (let offset = 0; offset < input.length && current.size; offset++) {
    const next = new Set<number>();
    for (const from of current) {
      for (const edge of nfa.edges.get(from) ?? []) {
        if (!edge.epsilon && accepts(edge, input[start + offset])) next.add(edge.to);
      }
    }
    current = closure(nfa, next);
    if (currentHasAccept(nfa, current)) best = offset + 1;
  }
  return best;
}

function currentHasAccept(nfa: Nfa, states: Set<number>): boolean {
  for (const s of states) if (nfa.accepts.has(s)) return true;
  return false;
}

class LexLexer {
  private readonly compiled: { rule: LexRule; nfa: Nfa; order: number }[];
  private index = 0;
  private line = 1;
  private column = 1;

  constructor(private readonly spec: LexSpecification, private readonly source: string) {
    this.compiled = spec.rules.map((rule, order) => ({ rule, nfa: compileNfa(rule.regex), order }));
  }

  reset(): void {
    this.index = 0;
    this.line = 1;
    this.column = 1;
  }

  private nextToken(): LexToken | null {
    while (this.index < this.source.length) {
      let best: { rule: LexRule; nfa: Nfa; order: number } | null = null;
      let length = -1;
      for (const candidate of this.compiled) {
        const found = longestNfaMatch(candidate.nfa, this.source, this.index);
        if (found > length) {
          length = found;
          best = candidate;
        }
      }
      const start = this.index;
      const line = this.line;
      const column = this.column;
      if (!best || length <= 0) {
        const bad = this.source[this.index++];
        this.advance(bad);
        return { token: "INVALID", lexeme: bad, value: bad, line, column, start, end: this.index };
      }
      const lexeme = this.source.slice(this.index, this.index + length);
      this.index += length;
      this.advance(lexeme);
      if (best.rule.skip) continue;
      return { token: best.rule.token ?? "TOKEN", lexeme, value: lexeme, line, column, start, end: this.index };
    }
    return null;
  }

  tokenize(): ScanResult {
    this.reset();
    const tokens: LexToken[] = [];
    const errors: LexError[] = [];
    const logs = ["Lexer initialized", "Scanning input..."];
    let token: LexToken | null;
    while ((token = this.nextToken())) {
      if (token.token === "INVALID") {
        errors.push({ message: `Invalid character: ${JSON.stringify(token.lexeme)}`, line: token.line, column: token.column });
      } else {
        tokens.push(token);
        logs.push(`Token generated: ${token.token} (${token.lexeme})`);
      }
    }
    logs.push("Analysis completed.");
    return { tokens, errors, logs };
  }

  private advance(text: string): void {
    for (const c of text) {
      if (c === "\n") {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }
  }
}

interface ParseResult {
  specification: LexSpecification | null;
  errors: LexError[];
}

function parseLexSpecification(source: string): ParseResult {
  const errors: LexError[] = [];
  const marks: number[] = [];
  let from = 0;
  while (true) {
    const n = source.indexOf("%%", from);
    if (n < 0) break;
    marks.push(n);
    from = n + 2;
  }
  if (!marks.length) return { specification: null, errors: [{ message: "Lex specification must contain %%", line: 1, column: 1 }] };

  const definitionsRaw = source.slice(0, marks[0]);
  const rulesRaw = source.slice(marks[0] + 2, marks[1] ?? source.length);
  const userCode = marks[1] === undefined ? "" : source.slice(marks[1] + 2);
  const definitions: Record<string, string> = {};
  const definitionText = stripComments(definitionsRaw).replace(/%\{[\s\S]*?%\}/g, "");

  for (const [idx, raw] of definitionText.split(/\r?\n/).entries()) {
    const text = raw.trim();
    if (!text) continue;
    const match = text.match(/^([A-Za-z_][\w]*)\s+(.+)$/);
    if (!match) {
      errors.push({ message: `Invalid definition: ${text}`, line: idx + 1, column: 1 });
      continue;
    }
    definitions[match[1]] = match[2].trim();
  }

  const rules: LexRule[] = [];
  const cleanRules = stripComments(rulesRaw);
  let i = 0;

  while (i < cleanRules.length) {
    while (/\s/.test(cleanRules[i] ?? "")) i++;
    if (i >= cleanRules.length) break;

    const patternStart = i;
    let quote = "";
    let classDepth = false;
    let actionStart = -1;

    for (; i < cleanRules.length; i++) {
      const c = cleanRules[i];
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = "";
        continue;
      }
      if (c === '"' || c === "'") {
        quote = c;
        continue;
      }
      if (c === "[") classDepth = true;
      if (c === "]") classDepth = false;
      if (c === "{" && !classDepth) {
        const close = cleanRules.indexOf("}", i + 1);
        const inside = close >= 0 ? cleanRules.slice(i + 1, close) : "";
        if (/^[A-Za-z_][\w]*$/.test(inside)) {
          i = close;
          continue;
        }
        actionStart = i;
        break;
      }
    }

    if (actionStart < 0) {
      errors.push({ message: "Rule is missing an action block", line: lineAt(rulesRaw, patternStart), column: 1 });
      break;
    }

    const pattern = cleanRules.slice(patternStart, actionStart).trim();
    let depth = 0;
    quote = "";
    let actionEnd = -1;

    for (i = actionStart; i < cleanRules.length; i++) {
      const c = cleanRules[i];
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = "";
        continue;
      }
      if (c === '"' || c === "'") {
        quote = c;
        continue;
      }
      if (c === "{") depth++;
      if (c === "}" && --depth === 0) {
        actionEnd = i;
        break;
      }
    }

    if (actionEnd < 0) {
      errors.push({ message: "Unclosed rule action", line: lineAt(rulesRaw, actionStart), column: 1 });
      break;
    }

    const action = cleanRules.slice(actionStart + 1, actionEnd).trim();
    try {
      const regex = new RegexParser(pattern, definitions).parse();
      const returnMatch = action.match(/\breturn\s*(?:\(\s*)?(?:['\"]([^'\"]+)['\"]|([A-Za-z_$][\w$]*))/);
      const token = returnMatch ? returnMatch[1] ?? returnMatch[2] : null;
      rules.push({
        pattern,
        regex,
        action,
        token,
        skip: token === null || /\b(continue|skip|whitespace)\b/i.test(action) || /^\s*\/?\//.test(action),
        line: lineAt(rulesRaw, patternStart),
      });
    } catch (error) {
      errors.push({ message: error instanceof Error ? error.message : String(error), line: lineAt(rulesRaw, patternStart), column: 1 });
    }

    i = actionEnd + 1;
  }

  return { specification: { definitions, rules, userCode, source }, errors };
}

export function tokenizeLex(lexSpecification: string, source: string): AnalysisResult {
  const parsed = parseLexSpecification(lexSpecification);
  if (!parsed.specification) {
    return {
      tokens: [],
      errors: parsed.errors,
      logs: ["Parsing Lex specification...", "Lex specification failed to parse."],
    };
  }

  const result = new LexLexer(parsed.specification, source).tokenize();
  return {
    tokens: result.tokens.map(({ token, lexeme, line, column }) => ({ token, lexeme, line, column })),
    errors: [...parsed.errors, ...result.errors],
    logs: [
      "Parsing Lex specification...",
      `Parsed ${parsed.specification.rules.length} rule${parsed.specification.rules.length === 1 ? "" : "s"}.`,
      "Generating lexer...",
      "Lexer generated.",
      "Tokenizing source...",
      ...result.logs.filter((log) => log !== "Lexer initialized" && log !== "Scanning input..."),
    ],
  };
}
