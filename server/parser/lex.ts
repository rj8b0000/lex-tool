import { LexError, LexRule, LexSpecification } from "../ast/lex";
import { RegexParser } from "../regex/parser";
import { stripComments } from "../utils/lex";

export interface ParseResult { specification: LexSpecification | null; errors: LexError[]; }

function lineAt(source: string, index: number): number { return source.slice(0, index).split("\n").length; }

export function parseLexSpecification(source: string): ParseResult {
  const errors: LexError[] = [];
  const marks: number[] = []; let from = 0;
  while (true) { const n = source.indexOf("%%", from); if (n < 0) break; marks.push(n); from = n + 2; }
  if (!marks.length) return { specification: null, errors: [{ message: "Lex specification must contain %%", line: 1, column: 1 }] };
  const definitionsRaw = source.slice(0, marks[0]);
  const rulesRaw = source.slice(marks[0] + 2, marks[1] ?? source.length);
  const userCode = marks[1] === undefined ? "" : source.slice(marks[1] + 2);
  const definitions: Record<string, string> = {};
  const definitionText = stripComments(definitionsRaw).replace(/%\{[\s\S]*?%\}/g, "");
  for (const [idx, raw] of definitionText.split(/\r?\n/).entries()) {
    const text = raw.trim(); if (!text) continue;
    const match = text.match(/^([A-Za-z_][\w]*)\s+(.+)$/);
    if (!match) { errors.push({ message: `Invalid definition: ${text}`, line: idx + 1, column: 1 }); continue; }
    definitions[match[1]] = match[2].trim();
  }
  const rules: LexRule[] = []; const cleanRules = stripComments(rulesRaw); let i = 0;
  while (i < cleanRules.length) {
    while (/\s/.test(cleanRules[i] ?? "")) i++; if (i >= cleanRules.length) break;
    const patternStart = i; let quote = ""; let classDepth = false; let actionStart = -1;
    for (; i < cleanRules.length; i++) { const c = cleanRules[i]; if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; } if (c === '"' || c === "'") { quote = c; continue; } if (c === "[") classDepth = true; if (c === "]") classDepth = false; if (c === "{" && !classDepth) { const close = cleanRules.indexOf("}", i + 1); const inside = close >= 0 ? cleanRules.slice(i + 1, close) : ""; if (/^[A-Za-z_][\w]*$/.test(inside)) { i = close; continue; } actionStart = i; break; } }
    if (actionStart < 0) { errors.push({ message: "Rule is missing an action block", line: lineAt(rulesRaw, patternStart), column: 1 }); break; }
    const pattern = cleanRules.slice(patternStart, actionStart).trim(); let depth = 0; quote = ""; let actionEnd = -1;
    for (i = actionStart; i < cleanRules.length; i++) { const c = cleanRules[i]; if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; } if (c === '"' || c === "'") { quote = c; continue; } if (c === "{") depth++; if (c === "}" && --depth === 0) { actionEnd = i; break; } }
    if (actionEnd < 0) { errors.push({ message: "Unclosed rule action", line: lineAt(rulesRaw, actionStart), column: 1 }); break; }
    const action = cleanRules.slice(actionStart + 1, actionEnd).trim();
    try {
      const regex = new RegexParser(pattern, definitions).parse();
      const returnMatch = action.match(/\breturn\s*(?:\(\s*)?(?:['"]([^'"]+)['"]|([A-Za-z_$][\w$]*))/);
      const token = returnMatch ? returnMatch[1] ?? returnMatch[2] : null;
      rules.push({ pattern, regex, action, token, skip: token === null || /\b(continue|skip|whitespace)\b/i.test(action) || /^\s*\/?\//.test(action), line: lineAt(rulesRaw, patternStart) });
    } catch (error) { errors.push({ message: error instanceof Error ? error.message : String(error), line: lineAt(rulesRaw, patternStart), column: 1 }); }
    i = actionEnd + 1;
  }
  return { specification: { definitions, rules, userCode, source }, errors };
}
