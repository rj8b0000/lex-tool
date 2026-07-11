import { RequestHandler } from "express";
import { parseLexSpecification } from "../parser/lex";
import { generateLexer as generateLexerData } from "../generator/generator";
import { tokenizeLex } from "../tokenizer";

function bodyOf(req: Parameters<RequestHandler>[0]): { lexSpecification?: string; source?: string } { return (req.body ?? {}) as { lexSpecification?: string; source?: string }; }

export const parseLex: RequestHandler = (req, res) => {
  const { lexSpecification = "" } = bodyOf(req); const result = parseLexSpecification(lexSpecification);
  res.status(200).json({ success: result.errors.length === 0, valid: result.errors.length === 0, ast: result.specification, definitions: result.specification?.definitions ?? {}, rules: result.specification?.rules.length ?? 0, userCode: result.specification?.userCode ?? "", errors: result.errors, message: result.errors.length ? "Lex specification has errors" : "Lex specification parsed" });
};

export const generateLexer: RequestHandler = (req, res) => {
  const { lexSpecification = "" } = bodyOf(req); const result = generateLexerData(lexSpecification);
  res.status(200).json({ ...result, message: result.generated ? "Lexer generated" : "Lexer generation failed" });
};

export const tokenizeSource: RequestHandler = (req, res) => {
  const { lexSpecification = "", source = "" } = bodyOf(req); const result = tokenizeLex(lexSpecification, source);
  res.status(200).json({ success: result.success, tokens: result.tokens.map(({ token, lexeme, value, line, column, start, end }) => ({ token, lexeme, value, line, column, start, end })), errors: result.errors, logs: result.logs });
};
