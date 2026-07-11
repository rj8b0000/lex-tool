import { useRef, useState } from "react";
import { EditorPane } from "@/components/layout/EditorPane";
import { AnalysisPanel } from "@/components/tabs/AnalysisPanel";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { tokenize } from "@/services/lexApi";
import type { AnalysisResult, OutputTab } from "@/types/lex";

const starterLex = `DIGIT      [0-9]
LETTER     [a-zA-Z]

%%

{DIGIT}+       { return NUMBER; }
{LETTER}+      { return IDENTIFIER; }
"+"            { return PLUS; }
"-"            { return MINUS; }`;
const starterSource = "sum = value + 25";
const initialResult: AnalysisResult = { tokens: [{ token: "IDENTIFIER", lexeme: "sum", line: 1, column: 1 }, { token: "ASSIGN", lexeme: "=", line: 1, column: 5 }, { token: "IDENTIFIER", lexeme: "value", line: 1, column: 7 }, { token: "PLUS", lexeme: "+", line: 1, column: 13 }, { token: "NUMBER", lexeme: "25", line: 1, column: 15 }], errors: [], logs: ["Lexer initialized", "Scanning input...", "Token generated...", "Analysis completed."] };

export default function Index() {
  const [lexSpecification, setLexSpecification] = useState(starterLex);
  const [source, setSource] = useState(starterSource);
  const [activeTab, setActiveTab] = useState<OutputTab>("tokens");
  const [result, setResult] = useState<AnalysisResult>(initialResult);
  const [analyzing, setAnalyzing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAnalyze() {
    setAnalyzing(true);
    try { setResult(await tokenize(lexSpecification, source)); setActiveTab("tokens"); }
    catch { setResult({ tokens: [], errors: [{ message: "Could not reach the analysis service", line: 1, column: 1 }], logs: ["Analysis request failed."] }); setActiveTab("errors"); }
    finally { setAnalyzing(false); }
  }
  function handleClear() { setSource(""); setResult({ tokens: [], errors: [], logs: ["Input cleared."] }); }
  function handleImport(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setLexSpecification(String(reader.result)); reader.readAsText(file); event.target.value = ""; }
  function handleExport() { const blob = new Blob([JSON.stringify(result.tokens, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "lex-tokens.json"; anchor.click(); URL.revokeObjectURL(url); }

  return <main className="flex h-[100dvh] min-h-[640px] flex-col overflow-hidden bg-[#0d111b] text-slate-100">
    <Toolbar onAnalyze={handleAnalyze} onClear={handleClear} onImport={() => inputRef.current?.click()} onExport={handleExport} analyzing={analyzing} />
    <input ref={inputRef} type="file" accept=".l,.lex,.txt" className="hidden" onChange={handleImport} />
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-[1.06] flex-col border-b border-[#242b3d] lg:border-b-0 lg:border-r"><EditorPane title="Lex specification" fileName="rules.lex" language="plaintext" value={lexSpecification} onChange={setLexSpecification} /><EditorPane title="Source input" fileName="input.txt" language="plaintext" value={source} onChange={setSource} /></div>
      <div className="flex min-h-[260px] min-w-0 flex-1 flex-col"><div className="flex h-11 shrink-0 items-center border-b border-[#242b3d] bg-[#111725] px-4"><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Analysis output</span><span className="ml-auto rounded bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-300">MOCK MODE</span></div><AnalysisPanel activeTab={activeTab} onTabChange={setActiveTab} result={result} /></div>
    </div>
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[#242b3d] bg-[#111725] px-4 text-[10px] text-slate-500"><span>UTF-8</span><span className="hidden sm:inline">Lex Studio · Phase 1 UI</span><span>Ln 1, Col 1</span></footer>
  </main>;
}
