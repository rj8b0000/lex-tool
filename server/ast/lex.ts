export type RegexNode =
  | { kind: "empty" }
  | { kind: "literal"; value: string }
  | { kind: "class"; chars: Set<string>; negated: boolean }
  | { kind: "any" }
  | { kind: "concat"; parts: RegexNode[] }
  | { kind: "alternate"; alternatives: RegexNode[] }
  | { kind: "repeat"; child: RegexNode; min: number; max: number | null };

export interface LexRule {
  pattern: string;
  regex: RegexNode;
  action: string;
  token: string | null;
  skip: boolean;
  line: number;
}

export interface LexSpecification {
  definitions: Record<string, string>;
  rules: LexRule[];
  userCode: string;
  source: string;
}

export interface LexError {
  message: string;
  line: number;
  column: number;
  index?: number;
}

export interface LexToken {
  token: string;
  lexeme: string;
  value: string;
  line: number;
  column: number;
  start: number;
  end: number;
}
