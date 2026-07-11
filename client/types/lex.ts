export type OutputTab = "tokens" | "errors" | "console";

export interface TokenRecord {
  token: string;
  lexeme: string;
  line: number;
  column: number;
}

export interface LexError {
  message: string;
  line: number;
  column: number;
}

export interface AnalysisResult {
  tokens: TokenRecord[];
  errors: LexError[];
  logs: string[];
}
