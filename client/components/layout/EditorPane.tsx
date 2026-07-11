import { FileCode2, MoreHorizontal } from "lucide-react";
import { CodeEditor } from "@/components/editor/CodeEditor";

interface EditorPaneProps {
  title: string;
  fileName: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
}

export function EditorPane({ title, fileName, language, value, onChange }: EditorPaneProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col border-b border-[#242b3d] last:border-b-0">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#242b3d] bg-[#111725] px-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</span>
          <span className="h-4 w-px bg-[#2b3347]" />
          <span className="flex items-center gap-1.5 text-xs text-slate-300"><FileCode2 className="size-3.5 text-cyan-400" />{fileName}</span>
        </div>
        <button aria-label={`${title} options`} className="rounded p-1 text-slate-500 transition hover:bg-[#202a3e] hover:text-slate-200"><MoreHorizontal className="size-4" /></button>
      </div>
      <div className="min-h-0 flex-1 bg-[#0d111b]"><CodeEditor value={value} onChange={onChange} language={language} /></div>
    </section>
  );
}
