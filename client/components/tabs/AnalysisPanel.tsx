import { AlertTriangle, CheckCircle2, ChevronRight, Terminal } from "lucide-react";
import type { AnalysisResult, OutputTab } from "@/types/lex";

interface AnalysisPanelProps {
  activeTab: OutputTab;
  onTabChange: (tab: OutputTab) => void;
  result: AnalysisResult;
}

const tabs: { id: OutputTab; label: string }[] = [
  { id: "tokens", label: "Tokens" },
  { id: "errors", label: "Errors" },
  { id: "console", label: "Console" },
];

export function AnalysisPanel({ activeTab, onTabChange, result }: AnalysisPanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[#0d111b]">
      <div className="flex h-11 shrink-0 items-center border-b border-[#242b3d] bg-[#111725] px-2 sm:px-4">
        <div className="flex h-full items-center gap-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`relative h-full px-3 text-xs font-semibold transition ${activeTab === tab.id ? "text-cyan-300" : "text-slate-500 hover:text-slate-300"}`}>
              {tab.label}
              {tab.id === "errors" && result.errors.length > 0 && <span className="ml-1.5 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">{result.errors.length}</span>}
              {activeTab === tab.id && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-cyan-400" />}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">Output</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {activeTab === "tokens" && <table className="w-full border-collapse text-left text-xs"><thead className="sticky top-0 bg-[#151c2b] text-[10px] uppercase tracking-[0.12em] text-slate-500"><tr>{["Token", "Lexeme", "Line", "Column"].map((heading) => <th key={heading} className="border-b border-[#242b3d] px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody>{result.tokens.map((token, index) => <tr key={`${token.lexeme}-${index}`} className="border-b border-[#1c2333] text-slate-300 transition hover:bg-[#151c2b]"><td className="px-4 py-3 font-mono text-cyan-300">{token.token}</td><td className="px-4 py-3 font-mono text-slate-200">{token.lexeme}</td><td className="px-4 py-3 text-slate-500">{token.line}</td><td className="px-4 py-3 text-slate-500">{token.column}</td></tr>)}</tbody></table>}
        {activeTab === "errors" && <div className="p-4">{result.errors.length ? result.errors.map((error, index) => <div key={index} className="mb-2 flex items-start gap-3 rounded-lg border border-rose-400/15 bg-rose-400/5 p-3 text-xs"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" /><div><p className="font-semibold text-rose-200">{error.message}</p><p className="mt-1 font-mono text-rose-300/60">Line {error.line}, column {error.column}</p></div></div>) : <div className="flex h-full min-h-40 flex-col items-center justify-center text-center"><CheckCircle2 className="mb-3 size-7 text-emerald-400" /><p className="text-sm font-semibold text-slate-200">No lexical errors</p><p className="mt-1 text-xs text-slate-500">Your input is ready to tokenize.</p></div>}</div>}
        {activeTab === "console" && <div className="p-4 font-mono text-xs leading-7">{result.logs.map((log, index) => <div key={index} className="flex gap-3"><ChevronRight className="mt-1 size-3.5 shrink-0 text-cyan-400" /><span className="text-slate-300">{log}</span></div>)}<div className="mt-2 flex gap-3 text-slate-600"><Terminal className="mt-1 size-3.5" /><span>Awaiting command</span></div></div>}
      </div>
    </section>
  );
}
