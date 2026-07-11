import { Braces, Download, FileUp, RotateCcw, Sparkles } from "lucide-react";

interface ToolbarProps {
  onAnalyze: () => void;
  onClear: () => void;
  onImport: () => void;
  onExport: () => void;
  analyzing: boolean;
}

export function Toolbar({ onAnalyze, onClear, onImport, onExport, analyzing }: ToolbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#252d40] bg-[#121827] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-950/40"><Braces className="size-5 text-[#07111e]" strokeWidth={2.5} /></div>
        <div><h1 className="text-sm font-bold tracking-tight text-slate-100">Lex Studio</h1><p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">Analyzer workbench</p></div>
      </div>
      <div className="hidden items-center gap-2 lg:flex"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /><span className="text-xs text-slate-400">Ready to analyze</span></div>
      <div className="flex items-center gap-1.5">
        <button onClick={onImport} className="toolbar-button hidden sm:flex"><FileUp className="size-4" />Import <span className="hidden xl:inline">Lex File</span></button>
        <button onClick={onExport} className="toolbar-button hidden sm:flex"><Download className="size-4" />Export <span className="hidden xl:inline">Tokens</span></button>
        <button onClick={onClear} className="toolbar-button"><RotateCcw className="size-4" /><span className="hidden sm:inline">Clear</span></button>
        <button onClick={onAnalyze} disabled={analyzing} className="flex h-9 items-center gap-2 rounded-md bg-cyan-400 px-3 text-xs font-bold text-[#07111e] transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-70"><Sparkles className="size-4" />{analyzing ? "Analyzing" : "Analyze"}</button>
      </div>
    </header>
  );
}
