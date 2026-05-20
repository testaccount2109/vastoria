export interface DocSection {
  id: string;
  title: string;
  paragraphs: string[];
  code?: string;
}

export const setupSections: DocSection[] = [
  {
    id: "requirements",
    title: "Requirements",
    paragraphs: [
      "Vastoria runs on Windows 10 (version 1903+) and Windows 11 on x64 hardware. You need Microsoft Edge WebView2 (installed automatically by the setup.exe when missing). For local AI features, install Ollama separately.",
    ],
  },
  {
    id: "installer",
    title: "Install with setup.exe",
    paragraphs: [
      "Download the latest installer from the Downloads page and run it. The wizard adds Vastoria to the Start Menu, optional desktop shortcut, and Windows Programs & Features for uninstall.",
    ],
    code: "# Run the downloaded installer\n.\\Vastoria-*-x64-setup.exe",
  },
  {
    id: "portable",
    title: "Portable executable",
    paragraphs: [
      "Use the portable .exe when you cannot install software or need a single file on a USB drive. Settings are stored under %LOCALAPPDATA%\\Vastoria\\.",
    ],
    code: ".\\Vastoria-*-x64-portable.exe",
  },
  {
    id: "ai-backend",
    title: "Connect the AI backend",
    paragraphs: [
      "Start Ollama, then launch the Vastoria AI service from the monorepo:",
    ],
    code: "ollama serve\ncd apps\\ai-backend\n.venv\\Scripts\\uvicorn.exe vastoria_ai.main:app --port 18420",
  },
];

export const usageSections: DocSection[] = [
  {
    id: "workspace",
    title: "Open a workspace",
    paragraphs: [
      "Use Ctrl+Shift+O or File → Open Folder to open a project directory. Vastoria keeps all state local — Git is only used when you explicitly push backups.",
    ],
  },
  {
    id: "editor",
    title: "Editor & terminal",
    paragraphs: [
      "Ctrl+S saves the active file. Ctrl+\\ splits the editor. Ctrl+` toggles the integrated terminal (PowerShell, Windows Terminal, or CMD). Ctrl+Shift+` opens a new terminal session.",
    ],
  },
  {
    id: "ai-panel",
    title: "AI panel",
    paragraphs: [
      "Toggle the AI sidebar with Ctrl+Shift+A. The panel streams responses from your configured Ollama models. Use diff staging to preview AI-suggested edits before applying them.",
    ],
  },
  {
    id: "sync",
    title: "Optional cloud sync",
    paragraphs: [
      "Configure the cloud API URL in settings to sync project snapshots to your Vastoria server. Sync never blocks local editing — the IDE remains fully usable offline.",
    ],
  },
  {
    id: "shortcuts",
    title: "Keyboard shortcuts",
    paragraphs: [
      "Ctrl+Shift+P — Command palette",
      "Ctrl+B — Toggle sidebar",
      "Ctrl+Shift+A — Toggle AI panel",
      "Ctrl+` — Toggle terminal",
    ],
  },
];
