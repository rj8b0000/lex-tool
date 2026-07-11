import { RegexNode } from "../ast/lex";
import { unescapeLexChar } from "../utils/lex";

export class RegexParser {
  private i = 0;
  constructor(private readonly text: string, private readonly macros: Record<string, string> = {}, private readonly stack = new Set<string>()) {}
  parse(): RegexNode { const node = this.alternation(); if (this.i < this.text.length) throw new Error(`Unexpected regex character '${this.text[this.i]}'`); return node; }
  private alternation(): RegexNode { const xs = [this.concat()]; while (this.take("|")) xs.push(this.concat()); return xs.length === 1 ? xs[0] : { kind: "alternate", alternatives: xs }; }
  private concat(): RegexNode { const xs: RegexNode[] = []; while (this.i < this.text.length && !["|", ")"].includes(this.text[this.i])) xs.push(this.repeat()); return xs.length === 0 ? { kind: "empty" } : xs.length === 1 ? xs[0] : { kind: "concat", parts: xs }; }
  private repeat(): RegexNode { let node = this.atom(); while (this.i < this.text.length) { const c = this.text[this.i]; if (c === "*") { this.i++; node = { kind: "repeat", child: node, min: 0, max: null }; } else if (c === "+") { this.i++; node = { kind: "repeat", child: node, min: 1, max: null }; } else if (c === "?") { this.i++; node = { kind: "repeat", child: node, min: 0, max: 1 }; } else break; } return node; }
  private atom(): RegexNode {
    const c = this.text[this.i++];
    if (c === "(") { const n = this.alternation(); if (!this.take(")")) throw new Error("Unclosed group"); return n; }
    if (c === ".") return { kind: "any" };
    if (c === "[") return this.characterClass();
    if (c === "\\") return { kind: "literal", value: unescapeLexChar("\\" + (this.text[this.i++] ?? "")) };
    if (c === '"' || c === "'") { let value = ""; while (this.i < this.text.length && this.text[this.i] !== c) { const x = this.text[this.i++]; value += x === "\\" ? unescapeLexChar("\\" + (this.text[this.i++] ?? "")) : x; } if (!this.take(c)) throw new Error("Unclosed quoted literal"); return value.length === 1 ? { kind: "literal", value } : { kind: "concat", parts: [...value].map((value) => ({ kind: "literal", value })) }; }
    if (c === "{") { const end = this.text.indexOf("}", this.i); if (end < 0) throw new Error("Unclosed macro"); const name = this.text.slice(this.i, end); this.i = end + 1; if (!this.macros[name] || this.stack.has(name)) throw new Error(`Unknown or recursive macro: ${name}`); const next = new Set(this.stack); next.add(name); return new RegexParser(this.macros[name], this.macros, next).parse(); }
    if (c === ")" || c === "|") throw new Error(`Unexpected regex character '${c}'`);
    return { kind: "literal", value: c };
  }
  private characterClass(): RegexNode { let negated = this.take("^"); const chars = new Set<string>(); while (this.i < this.text.length && this.text[this.i] !== "]") { const first = this.classChar(); if (this.take("-") && this.text[this.i] !== "]") { const last = this.classChar(); for (let n = first.charCodeAt(0); n <= last.charCodeAt(0); n++) chars.add(String.fromCharCode(n)); } else chars.add(first); } if (!this.take("]")) throw new Error("Unclosed character class"); return { kind: "class", chars, negated }; }
  private classChar(): string { if (this.text[this.i] === "\\") { this.i++; return unescapeLexChar("\\" + (this.text[this.i++] ?? "")); } return this.text[this.i++]; }
  private take(value: string): boolean { if (this.text.startsWith(value, this.i)) { this.i += value.length; return true; } return false; }
}
