import { RegexNode } from "../ast/lex";

export interface NfaEdge { to: number; epsilon?: boolean; chars?: Set<string>; negated?: boolean; any?: boolean; }
export interface Nfa { start: number; accepts: Set<number>; edges: Map<number, NfaEdge[]>; states: number; }

export function compileNfa(node: RegexNode): Nfa {
  const edges = new Map<number, NfaEdge[]>(); let next = 0;
  const state = () => next++;
  const add = (from: number, edge: NfaEdge) => edges.set(from, [...(edges.get(from) ?? []), edge]);
  const build = (n: RegexNode): [number, number] => {
    if (n.kind === "empty") { const a = state(), b = state(); add(a, { to: b, epsilon: true }); return [a, b]; }
    if (n.kind === "literal" || n.kind === "class" || n.kind === "any") { const a = state(), b = state(); add(a, n.kind === "literal" ? { to: b, chars: new Set([n.value]) } : n.kind === "class" ? { to: b, chars: n.chars, negated: n.negated } : { to: b, any: true }); return [a, b]; }
    if (n.kind === "concat") { const first = build(n.parts[0] ?? { kind: "empty" }); let end = first[1]; for (const part of n.parts.slice(1)) { const x = build(part); add(end, { to: x[0], epsilon: true }); end = x[1]; } return [first[0], end]; }
    if (n.kind === "alternate") { const a = state(), b = state(); for (const option of n.alternatives) { const x = build(option); add(a, { to: x[0], epsilon: true }); add(x[1], { to: b, epsilon: true }); } return [a, b]; }
    const a = state(), b = state();
    if (n.min === 0) add(a, { to: b, epsilon: true });
    const required = n.min;
    let cursor = a;
    for (let i = 0; i < required; i++) { const x = build(n.child); add(cursor, { to: x[0], epsilon: true }); cursor = x[1]; }
    if (n.max === null) { add(cursor, { to: b, epsilon: true }); const x = build(n.child); add(cursor, { to: x[0], epsilon: true }); add(x[1], { to: cursor, epsilon: true }); }
    else { for (let i = required; i < n.max; i++) { add(cursor, { to: b, epsilon: true }); const x = build(n.child); add(cursor, { to: x[0], epsilon: true }); cursor = x[1]; } add(cursor, { to: b, epsilon: true }); }
    return [a, b];
  };
  const [start, accept] = build(node); return { start, accepts: new Set([accept]), edges, states: next };
}

function closure(nfa: Nfa, states: Set<number>): Set<number> { const out = new Set(states); const todo = [...states]; while (todo.length) { const from = todo.pop()!; for (const edge of nfa.edges.get(from) ?? []) if (edge.epsilon && !out.has(edge.to)) { out.add(edge.to); todo.push(edge.to); } } return out; }
function accepts(edge: NfaEdge, char: string): boolean { return edge.any || (!!edge.chars && (edge.negated ? !edge.chars.has(char) : edge.chars.has(char))); }
export function longestNfaMatch(nfa: Nfa, input: string, start: number): number {
  let current = closure(nfa, new Set([nfa.start])); let best = currentHasAccept(nfa, current) ? 0 : -1;
  for (let offset = 0; offset < input.length && current.size; offset++) { const next = new Set<number>(); for (const from of current) for (const edge of nfa.edges.get(from) ?? []) if (!edge.epsilon && accepts(edge, input[start + offset])) next.add(edge.to); current = closure(nfa, next); if (currentHasAccept(nfa, current)) best = offset + 1; }
  return best;
}
function currentHasAccept(nfa: Nfa, states: Set<number>): boolean { for (const s of states) if (nfa.accepts.has(s)) return true; return false; }
