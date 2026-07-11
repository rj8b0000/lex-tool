import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
}

export function CodeEditor({ value, onChange, language }: CodeEditorProps) {
  return (
    <Editor
      height="100%"
      language={language}
      theme="vs-dark"
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      options={{
        automaticLayout: true,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        lineHeight: 21,
        minimap: { enabled: true, scale: 1 },
        padding: { top: 12, bottom: 12 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        folding: true,
        renderLineHighlight: "all",
        wordWrap: "on",
        tabSize: 2,
      }}
    />
  );
}
