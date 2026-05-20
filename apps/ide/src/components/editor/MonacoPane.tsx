import Editor from "@monaco-editor/react";
import type { EditorTab } from "@/stores/editorStore";

interface MonacoPaneProps {
  tab: EditorTab;
  onChange: (value: string) => void;
}

export function MonacoPane({ tab, onChange }: MonacoPaneProps) {
  return (
    <Editor
      height="100%"
      language={tab.language}
      value={tab.content}
      theme="vs-dark"
      options={{
        fontFamily: "JetBrains Mono, Fira Code, monospace",
        fontSize: 13,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "off",
        padding: { top: 8 },
      }}
      onChange={(v) => onChange(v ?? "")}
      path={tab.path}
    />
  );
}
