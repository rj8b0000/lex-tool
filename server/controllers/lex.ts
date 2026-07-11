import type { RequestHandler } from "express";

const mockAnalysis = {
  tokens: [
    { token: "IDENTIFIER", lexeme: "sum", line: 1, column: 1 },
    { token: "ASSIGN", lexeme: "=", line: 1, column: 5 },
    { token: "IDENTIFIER", lexeme: "value", line: 1, column: 7 },
    { token: "PLUS", lexeme: "+", line: 1, column: 13 },
    { token: "NUMBER", lexeme: "25", line: 1, column: 15 },
  ],
  errors: [],
  logs: ["Lexer initialized", "Scanning input...", "Token generated: IDENTIFIER (sum)", "Token generated: NUMBER (25)", "Analysis completed."],
};

export const parseLex: RequestHandler = (_req, res) => res.status(200).json({ valid: true, rules: 4, message: "Lex specification parsed" });
export const generateLexer: RequestHandler = (_req, res) => res.status(200).json({ generated: true, message: "Mock lexer generated" });
export const tokenizeSource: RequestHandler = (_req, res) => res.status(200).json(mockAnalysis);
