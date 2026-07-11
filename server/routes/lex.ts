import { Router } from "express";
import { generateLexer, parseLex, tokenizeSource } from "../controllers/lex";

export const lexRouter = Router();

lexRouter.post("/parse", parseLex);
lexRouter.post("/generate", generateLexer);
lexRouter.post("/tokenize", tokenizeSource);
