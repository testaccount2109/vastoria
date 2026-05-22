import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  Download,
  ExternalLink,
  HardDrive,
  Info,
  Monitor,
  Palette,
  Play,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  SlidersHorizontal,
  Square,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isTauri } from "@/lib/tauri";
import {
  getOllamaModels,
  getOllamaStatus,
  getRuntimeInfo,
  installOllama,
  onOllamaProgress,
  pullOllamaModel,
  removeOllamaModel,
  startOllamaModel,
  stopOllamaModel,
  updateOllamaModel,
  type OllamaModel,
  type OllamaProgressEvent,
  type OllamaStatus,
  type RuntimeInfo,
} from "@/lib/ipc";
import { useI18n } from "@/i18n";
import { useSettingsStore, type AppLanguage } from "@/stores/settingsStore";

type Category =
  | "general"
  | "appearance"
  | "ai"
  | "editor"
  | "terminal"
  | "performance"
  | "downloads"
  | "updates"
  | "privacy"
  | "about";

const categories: Array<{ id: Category; icon: typeof Settings2; labelKey: string }> = [
  { id: "general", icon: Settings2, labelKey: "settings.general" },
  { id: "appearance", icon: Palette, labelKey: "settings.appearance" },
  { id: "ai", icon: Bot, labelKey: "settings.ai" },
  { id: "editor", icon: SlidersHorizontal, labelKey: "settings.editor" },
  { id: "terminal", icon: Terminal, labelKey: "settings.terminal" },
  { id: "performance", icon: Zap, labelKey: "settings.performance" },
  { id: "downloads", icon: Download, labelKey: "settings.downloads" },
  { id: "updates", icon: RefreshCw, labelKey: "settings.updates" },
  { id: "privacy", icon: Shield, labelKey: "settings.privacy" },
  { id: "about", icon: Info, labelKey: "settings.about" },
];

const modelCatalog = [
  { name: "llama3", tags: ["recommended", "general"], ram: "8 GB+", vram: "6 GB+", size: "4.7 GB" },
  { name: "qwen2.5-coder", tags: ["coding", "recommended"], ram: "8 GB+", vram: "6 GB+", size: "4.7 GB" },
  { name: "deepseek-coder", tags: ["coding", "powerful"], ram: "16 GB+", vram: "8 GB+", size: "8-14 GB" },
  { name: "mistral", tags: ["general", "lightweight"], ram: "8 GB+", vram: "6 GB+", size: "4.1 GB" },
  { name: "codellama", tags: ["coding"], ram: "8 GB+", vram: "6 GB+", size: "3.8 GB+" },
  { name: "phi3", tags: ["lightweight"], ram: "4 GB+", vram: "None", size: "2.3 GB" },
  { name: "gemma2", tags: ["general", "lightweight"], ram: "8 GB+", vram: "6 GB+", size: "5.4 GB" },
];

export function SettingsView() {
  const [active, setActive] = useState<Category>("general");
  const [query, setQuery] = useState("");
  const { t } = useI18n();
  const resetDefaults = useSettingsStore((s) => s.resetDefaults);

  const visibleCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((category) => t(category.labelKey).toLowerCase().includes(q));
  }, [query, t]);

  return (
    <main className="flex min-h-0 min-w-0 flex-1 bg-vast-bg text-vast-fg">
      <aside className="flex w-72 shrink-0 flex-col border-r border-vast-border bg-vast-sidebar">
        <div className="border-b border-vast-border p-4">
          <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
          <label className="mt-4 flex h-9 items-center gap-2 rounded-md border border-vast-border bg-vast-bg px-3 text-vast-fg-muted">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("settings.search")}
              className="min-w-0 flex-1 bg-transparent text-sm text-vast-fg outline-none placeholder:text-vast-fg-muted"
            />
          </label>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          {visibleCategories.map(({ id, icon: Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-vast-fg-muted hover:bg-vast-bg-hover hover:text-vast-fg",
                active === id && "bg-vast-bg-active text-vast-fg",
              )}
            >
              <Icon size={17} />
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-vast-border p-3">
          <button
            type="button"
            onClick={resetDefaults}
            className="w-full rounded-md border border-vast-border px-3 py-2 text-sm text-vast-fg-muted hover:bg-vast-bg-hover hover:text-vast-fg"
          >
            {t("settings.reset")}
          </button>
        </div>
      </aside>

      <section className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-7">
          {active === "general" && <GeneralSettings />}
          {active === "appearance" && <AppearanceSettings />}
          {active === "ai" && <AiModelsSettings />}
          {active === "editor" && <EditorSettings />}
          {active === "terminal" && <TerminalSettings />}
          {active === "performance" && <PerformanceSettings />}
          {active === "downloads" && <DownloadsSettings />}
          {active === "updates" && <UpdatesSettings />}
          {active === "privacy" && <PrivacySettings />}
          {active === "about" && <AboutSettings />}
        </div>
      </section>
    </main>
  );
}

function GeneralSettings() {
  const s = useSettingsStore();
  return (
    <SettingsSection title="General" description="Core IDE behavior and operating preferences.">
      <SettingRow title="Language" description="Switches UI text immediately with English fallback.">
        <Select
          value={s.general.language}
          onChange={(value) => s.updateGeneral({ language: value as AppLanguage })}
          options={[
            ["en", "English"],
            ["de", "Deutsch"],
          ]}
        />
      </SettingRow>
      <SettingRow title="Startup behavior">
        <Select
          value={s.general.startupBehavior}
          onChange={(value) => s.updateGeneral({ startupBehavior: value as never })}
          options={[
            ["restoreWorkspace", "Restore previous workspace"],
            ["welcome", "Show welcome"],
            ["newWindow", "Open empty window"],
          ]}
        />
      </SettingRow>
      <SettingRow title="Auto-save">
        <Select
          value={s.general.autoSave}
          onChange={(value) => s.updateGeneral({ autoSave: value as never })}
          options={[
            ["off", "Off"],
            ["afterDelay", "After delay"],
            ["onFocusChange", "On focus change"],
            ["onWindowChange", "On window change"],
          ]}
        />
      </SettingRow>
      <SettingRow title="Telemetry">
        <Toggle checked={s.general.telemetry} onChange={(telemetry) => s.updateGeneral({ telemetry })} />
      </SettingRow>
      <SettingRow title="Update channel">
        <Select
          value={s.general.updateChannel}
          onChange={(value) => s.updateGeneral({ updateChannel: value as never })}
          options={[
            ["stable", "Stable"],
            ["preview", "Preview"],
            ["nightly", "Nightly"],
          ]}
        />
      </SettingRow>
      <SettingRow title="Launch on startup">
        <Toggle
          checked={s.general.launchOnStartup}
          onChange={(launchOnStartup) => s.updateGeneral({ launchOnStartup })}
        />
      </SettingRow>
      <SettingRow title="Notifications">
        <Toggle
          checked={s.general.notifications}
          onChange={(notifications) => s.updateGeneral({ notifications })}
        />
      </SettingRow>
    </SettingsSection>
  );
}

function AppearanceSettings() {
  const s = useSettingsStore();
  return (
    <SettingsSection title="Appearance" description="Window, editor, and workbench presentation.">
      <SettingRow title="Theme">
        <Segmented
          value={s.appearance.theme}
          onChange={(theme) => s.updateAppearance({ theme: theme as never })}
          options={[
            ["dark", "Dark"],
            ["light", "Light"],
            ["system", "System"],
          ]}
        />
      </SettingRow>
      <SettingRow title="Accent color">
        <div className="flex gap-2">
          {["#0078d4", "#0f9d58", "#c239b3", "#d83b01", "#8764b8"].map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => s.updateAppearance({ accentColor: color })}
              className={cn(
                "h-7 w-7 rounded-md border border-vast-border",
                s.appearance.accentColor === color && "ring-2 ring-white/70",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </SettingRow>
      <SettingRow title="Font size">
        <NumberInput value={s.appearance.fontSize} min={11} max={20} onChange={(fontSize) => s.updateAppearance({ fontSize })} />
      </SettingRow>
      <SettingRow title="Editor font">
        <TextInput value={s.appearance.editorFont} onChange={(editorFont) => s.updateAppearance({ editorFont })} />
      </SettingRow>
      <SettingRow title="UI scaling">
        <NumberInput value={s.appearance.uiScale} min={0.8} max={1.5} step={0.05} onChange={(uiScale) => s.updateAppearance({ uiScale })} />
      </SettingRow>
      <SettingRow title="Sidebar density">
        <Segmented
          value={s.appearance.sidebarDensity}
          onChange={(sidebarDensity) => s.updateAppearance({ sidebarDensity: sidebarDensity as never })}
          options={[
            ["compact", "Compact"],
            ["comfortable", "Comfortable"],
          ]}
        />
      </SettingRow>
      <SettingRow title="Transparency">
        <Toggle checked={s.appearance.transparency} onChange={(transparency) => s.updateAppearance({ transparency })} />
      </SettingRow>
      <SettingRow title="Windows effects">
        <Toggle checked={s.appearance.effects} onChange={(effects) => s.updateAppearance({ effects })} />
      </SettingRow>
    </SettingsSection>
  );
}

function AiModelsSettings() {
  const s = useSettingsStore();
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [customModel, setCustomModel] = useState("");
  const [filter, setFilter] = useState("");
  const [progress, setProgress] = useState<OllamaProgressEvent | null>(null);
  const [error, setError] = useState("");

  const refresh = async () => {
    if (!isTauri()) return;
    setError("");
    try {
      const nextStatus = await getOllamaStatus();
      setStatus(nextStatus);
      setModels(nextStatus.installed ? await getOllamaModels() : []);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    void refresh();
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void onOllamaProgress((event) => {
      setProgress(event);
      if (event.done) void refresh();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  const pull = async (model: string) => {
    setError("");
    try {
      await pullOllamaModel(model);
    } catch (err) {
      setError(String(err));
    }
  };

  const filteredCatalog = modelCatalog.filter((model) => {
    const q = filter.trim().toLowerCase();
    return !q || model.name.includes(q) || model.tags.some((tag) => tag.includes(q));
  });

  return (
    <SettingsSection title="AI / Models" description="Manage local Ollama runtime, models, and generation behavior.">
      {!isTauri() && <InlineNotice text="Native Ollama management is available in the Tauri desktop app." />}
      {error && <InlineNotice tone="error" text={error} />}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-vast-border bg-vast-bg-elevated p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-medium">Ollama runtime</h3>
              <p className="mt-1 text-sm text-vast-fg-muted">
                {status?.installed ? status.executablePath : "Local AI Runtime Required"}
              </p>
            </div>
            <StatusPill ok={Boolean(status?.installed && status.serviceRunning)}>
              {status?.installed ? (status.serviceRunning ? "Running" : "Installed") : "Missing"}
            </StatusPill>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={refresh} icon={RefreshCw}>Refresh</Button>
            {!status?.installed && <Button onClick={() => installOllama().catch((err) => setError(String(err)))} icon={Download}>Install Ollama</Button>}
          </div>
          {progress && (
            <div className="mt-4 rounded-md border border-vast-border bg-vast-bg p-3 font-mono text-xs text-vast-fg-muted">
              <div className="mb-1 text-vast-fg">{progress.action}: {progress.model}</div>
              <div className="truncate">{progress.line}</div>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-vast-border bg-vast-bg-elevated p-4">
          <h3 className="font-medium">Local AI configuration</h3>
          <div className="mt-4 space-y-3">
            <LabeledNumber label="Context" value={s.ai.contextLength} min={1024} max={131072} onChange={(contextLength) => s.updateAi({ contextLength })} />
            <LabeledNumber label="Temperature" value={s.ai.temperature} min={0} max={2} step={0.1} onChange={(temperature) => s.updateAi({ temperature })} />
            <LabeledNumber label="Max tokens" value={s.ai.maxTokens} min={256} max={32768} onChange={(maxTokens) => s.updateAi({ maxTokens })} />
            <LabeledNumber label="CPU threads" value={s.ai.cpuThreads} min={0} max={64} onChange={(cpuThreads) => s.updateAi({ cpuThreads })} />
            <LabeledNumber label="Timeout" value={s.ai.timeoutSeconds} min={10} max={900} onChange={(timeoutSeconds) => s.updateAi({ timeoutSeconds })} />
            <LabeledNumber label="Parallel" value={s.ai.parallelRequests} min={1} max={8} onChange={(parallelRequests) => s.updateAi({ parallelRequests })} />
            <SettingInline label="GPU"><Toggle checked={s.ai.gpuUsage} onChange={(gpuUsage) => s.updateAi({ gpuUsage })} /></SettingInline>
            <SettingInline label="Streaming"><Toggle checked={s.ai.streaming} onChange={(streaming) => s.updateAi({ streaming })} /></SettingInline>
            <SettingInline label="Keep alive"><TextInput value={s.ai.keepAlive} onChange={(keepAlive) => s.updateAi({ keepAlive })} /></SettingInline>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-vast-border bg-vast-bg-elevated">
        <div className="flex items-center justify-between border-b border-vast-border px-4 py-3">
          <h3 className="font-medium">Installed models</h3>
          <span className="text-sm text-vast-fg-muted">{models.length} installed</span>
        </div>
        <div className="divide-y divide-vast-border">
          {models.length === 0 && <div className="p-4 text-sm text-vast-fg-muted">No Ollama models are installed.</div>}
          {models.map((model) => (
            <div key={model.name} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{model.name}</span>
                  {s.ai.defaultModel === model.name && <StatusPill ok>Default</StatusPill>}
                  {model.running && <StatusPill ok>Running</StatusPill>}
                </div>
                <div className="mt-1 text-sm text-vast-fg-muted">{model.size} · {model.modified || "Installed locally"} · {model.processor ?? "CPU/GPU auto"}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <IconButton title="Set default" onClick={() => s.updateAi({ defaultModel: model.name })} icon={Check} />
                <IconButton title="Start" onClick={() => startOllamaModel(model.name).catch((err) => setError(String(err)))} icon={Play} />
                <IconButton title="Stop" onClick={() => stopOllamaModel(model.name).then(refresh).catch((err) => setError(String(err)))} icon={Square} />
                <IconButton title="Update" onClick={() => updateOllamaModel(model.name).catch((err) => setError(String(err)))} icon={RefreshCw} />
                <IconButton title="Remove" onClick={() => removeOllamaModel(model.name).then(refresh).catch((err) => setError(String(err)))} icon={Trash2} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-vast-border bg-vast-bg-elevated p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-medium">Model browser</h3>
          <TextInput value={filter} onChange={setFilter} placeholder="Search models or tags" />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {filteredCatalog.map((model) => (
            <div key={model.name} className="rounded-md border border-vast-border bg-vast-bg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium">{model.name}</h4>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {model.tags.map((tag) => <span key={tag} className="rounded bg-vast-bg-hover px-2 py-0.5 text-xs text-vast-fg-muted">{tag}</span>)}
                  </div>
                  <p className="mt-3 text-sm text-vast-fg-muted">RAM {model.ram} · VRAM {model.vram} · Download {model.size}</p>
                </div>
                <Button onClick={() => pull(model.name)} icon={Download}>Pull</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <TextInput value={customModel} onChange={setCustomModel} placeholder="custom/model:tag" />
          <Button disabled={!customModel.trim()} onClick={() => pull(customModel.trim())} icon={Download}>Pull custom</Button>
        </div>
      </div>
    </SettingsSection>
  );
}

function EditorSettings() {
  const s = useSettingsStore();
  return (
    <SettingsSection title="Editor" description="Editing ergonomics and Monaco behavior.">
      <SettingRow title="Font family"><TextInput value={s.editor.fontFamily} onChange={(fontFamily) => s.updateEditor({ fontFamily })} /></SettingRow>
      <SettingRow title="Ligatures"><Toggle checked={s.editor.ligatures} onChange={(ligatures) => s.updateEditor({ ligatures })} /></SettingRow>
      <SettingRow title="Minimap"><Toggle checked={s.editor.minimap} onChange={(minimap) => s.updateEditor({ minimap })} /></SettingRow>
      <SettingRow title="Line height"><NumberInput value={s.editor.lineHeight} min={16} max={34} onChange={(lineHeight) => s.updateEditor({ lineHeight })} /></SettingRow>
      <SettingRow title="Word wrap"><Select value={s.editor.wordWrap} onChange={(wordWrap) => s.updateEditor({ wordWrap: wordWrap as never })} options={[["off", "Off"], ["on", "On"], ["bounded", "Bounded"]]} /></SettingRow>
      <SettingRow title="Cursor style"><Select value={s.editor.cursorStyle} onChange={(cursorStyle) => s.updateEditor({ cursorStyle: cursorStyle as never })} options={[["line", "Line"], ["block", "Block"], ["underline", "Underline"]]} /></SettingRow>
      <SettingRow title="Tab size"><NumberInput value={s.editor.tabSize} min={2} max={8} onChange={(tabSize) => s.updateEditor({ tabSize })} /></SettingRow>
      <SettingRow title="Format on save"><Toggle checked={s.editor.formatOnSave} onChange={(formatOnSave) => s.updateEditor({ formatOnSave })} /></SettingRow>
      <SettingRow title="Smooth scrolling"><Toggle checked={s.editor.smoothScrolling} onChange={(smoothScrolling) => s.updateEditor({ smoothScrolling })} /></SettingRow>
    </SettingsSection>
  );
}

function TerminalSettings() {
  const s = useSettingsStore();
  return (
    <SettingsSection title="Terminal" description="Shell integration and terminal rendering.">
      <SettingRow title="Default shell"><Select value={s.terminal.defaultShell} onChange={(defaultShell) => s.updateTerminal({ defaultShell: defaultShell as never })} options={[["powershell", "PowerShell"], ["cmd", "CMD"], ["gitBash", "Git Bash"], ["windowsTerminal", "Windows Terminal"]]} /></SettingRow>
      <SettingRow title="Terminal font"><TextInput value={s.terminal.fontFamily} onChange={(fontFamily) => s.updateTerminal({ fontFamily })} /></SettingRow>
      <SettingRow title="Transparency"><NumberInput value={s.terminal.transparency} min={0} max={60} onChange={(transparency) => s.updateTerminal({ transparency })} /></SettingRow>
      <SettingRow title="Cursor style"><Select value={s.terminal.cursorStyle} onChange={(cursorStyle) => s.updateTerminal({ cursorStyle: cursorStyle as never })} options={[["line", "Line"], ["block", "Block"], ["underline", "Underline"]]} /></SettingRow>
      <SettingRow title="Scrollback size"><NumberInput value={s.terminal.scrollbackSize} min={1000} max={100000} step={1000} onChange={(scrollbackSize) => s.updateTerminal({ scrollbackSize })} /></SettingRow>
    </SettingsSection>
  );
}

function PerformanceSettings() {
  const s = useSettingsStore();
  return (
    <SettingsSection title="Performance" description="Resource use, indexing, and background work.">
      <SettingRow title="Hardware acceleration"><Toggle checked={s.performance.hardwareAcceleration} onChange={(hardwareAcceleration) => s.updatePerformance({ hardwareAcceleration })} /></SettingRow>
      <SettingRow title="Memory optimization"><Toggle checked={s.performance.memoryOptimization} onChange={(memoryOptimization) => s.updatePerformance({ memoryOptimization })} /></SettingRow>
      <SettingRow title="Animations"><Toggle checked={s.performance.animations} onChange={(animations) => s.updatePerformance({ animations })} /></SettingRow>
      <SettingRow title="Background AI limit"><NumberInput value={s.performance.backgroundAiLimit} min={0} max={8} onChange={(backgroundAiLimit) => s.updatePerformance({ backgroundAiLimit })} /></SettingRow>
      <SettingRow title="Indexing behavior"><Select value={s.performance.indexingBehavior} onChange={(indexingBehavior) => s.updatePerformance({ indexingBehavior: indexingBehavior as never })} options={[["full", "Full"], ["workspaceOnly", "Workspace only"], ["manual", "Manual"]]} /></SettingRow>
      <SettingRow title="Cache cleanup"><Button onClick={() => localStorage.removeItem("vastoria.settings")} icon={Trash2}>Clean local settings cache</Button></SettingRow>
    </SettingsSection>
  );
}

function DownloadsSettings() {
  const s = useSettingsStore();
  return (
    <SettingsSection title="Downloads" description="Release and model download behavior.">
      <SettingRow title="Download directory"><TextInput value={s.downloads.downloadDirectory} onChange={(downloadDirectory) => s.updateDownloads({ downloadDirectory })} placeholder="Use system downloads folder" /></SettingRow>
      <SettingRow title="Concurrent downloads"><NumberInput value={s.downloads.concurrentDownloads} min={1} max={8} onChange={(concurrentDownloads) => s.updateDownloads({ concurrentDownloads })} /></SettingRow>
      <SettingRow title="Verify checksums"><Toggle checked={s.downloads.verifyChecksums} onChange={(verifyChecksums) => s.updateDownloads({ verifyChecksums })} /></SettingRow>
    </SettingsSection>
  );
}

function UpdatesSettings() {
  const s = useSettingsStore();
  const [latest, setLatest] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const check = async () => {
    setError("");
    try {
      const response = await fetch("https://vastoria.online/downloads/windows/latest.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setLatest(await response.json());
    } catch (err) {
      setError(String(err));
    }
  };
  return (
    <SettingsSection title="Updates" description="Windows release channel and update checks.">
      {error && <InlineNotice tone="error" text={error} />}
      <SettingRow title="Automatic updates"><Toggle checked={s.updates.automaticUpdates} onChange={(automaticUpdates) => s.updateUpdates({ automaticUpdates })} /></SettingRow>
      <SettingRow title="Channel"><Select value={s.updates.channel} onChange={(channel) => s.updateUpdates({ channel: channel as never })} options={[["stable", "Stable"], ["preview", "Preview"], ["nightly", "Nightly"]]} /></SettingRow>
      <SettingRow title="Installed version"><span className="text-sm text-vast-fg-muted">{import.meta.env.PACKAGE_VERSION ?? "0.1.2"}</span></SettingRow>
      <SettingRow title="Latest release"><Button onClick={check} icon={RefreshCw}>Check for updates</Button></SettingRow>
      {latest && <pre className="mt-4 overflow-auto rounded-lg border border-vast-border bg-vast-bg p-4 text-xs text-vast-fg-muted">{JSON.stringify(latest, null, 2)}</pre>}
    </SettingsSection>
  );
}

function PrivacySettings() {
  const s = useSettingsStore();
  return (
    <SettingsSection title="Privacy" description="Control what leaves this machine.">
      <SettingRow title="Telemetry"><Toggle checked={s.privacy.telemetry} onChange={(telemetry) => s.updatePrivacy({ telemetry })} /></SettingRow>
      <SettingRow title="Crash reports"><Toggle checked={s.privacy.crashReports} onChange={(crashReports) => s.updatePrivacy({ crashReports })} /></SettingRow>
      <SettingRow title="Local history"><Toggle checked={s.privacy.localHistory} onChange={(localHistory) => s.updatePrivacy({ localHistory })} /></SettingRow>
      <SettingRow title="Redact prompts"><Toggle checked={s.privacy.redactPrompts} onChange={(redactPrompts) => s.updatePrivacy({ redactPrompts })} /></SettingRow>
    </SettingsSection>
  );
}

function AboutSettings() {
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  useEffect(() => {
    if (!isTauri()) return;
    void getRuntimeInfo().then(setRuntime);
    void getOllamaModels().then(setModels).catch(() => setModels([]));
  }, []);
  return (
    <SettingsSection title="About" description="Vastoria runtime, local AI, and system diagnostics.">
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard icon={Monitor} title="Runtime versions" rows={[
          ["Vastoria", runtime?.appVersion ?? "0.1.2"],
          ["OS", runtime ? `${runtime.os} ${runtime.arch}` : navigator.platform],
          ["Rust target", runtime?.rustTarget ?? "Desktop web preview"],
        ]} />
        <InfoCard icon={HardDrive} title="System information" rows={[
          ["CPU threads", String(runtime?.cpuCount ?? navigator.hardwareConcurrency ?? "Unknown")],
          ["Installed models", String(models.length)],
          ["Ollama storage", formatBytes(runtime?.ollamaStorageBytes ?? 0)],
        ]} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <AnchorButton href="https://vastoria.online" icon={ExternalLink}>Website</AnchorButton>
        <AnchorButton href="https://vastoria.online/docs" icon={ExternalLink}>Docs</AnchorButton>
        <AnchorButton href="https://vastoria.online/changelog" icon={ExternalLink}>Changelog</AnchorButton>
      </div>
    </SettingsSection>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
        <p className="mt-1 text-sm text-vast-fg-muted">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SettingRow({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-vast-border/70 py-4 lg:grid-cols-[minmax(220px,1fr)_minmax(280px,420px)]">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="mt-1 text-sm text-vast-fg-muted">{description}</div>}
      </div>
      <div className="flex items-center justify-start lg:justify-end">{children}</div>
    </div>
  );
}

function SettingInline({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-vast-fg-muted">{label}</span>{children}</div>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 rounded-full border transition-colors", checked ? "border-vast-accent bg-vast-accent" : "border-vast-border bg-vast-bg-hover")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 min-w-56 rounded-md border border-vast-border bg-vast-bg px-3 text-sm outline-none focus:border-vast-accent">{options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 min-w-56 rounded-md border border-vast-border bg-vast-bg px-3 text-sm outline-none placeholder:text-vast-fg-muted focus:border-vast-accent" />;
}

function NumberInput({ value, onChange, min, max, step = 1 }: { value: number; onChange: (value: number) => void; min: number; max: number; step?: number }) {
  return <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="h-9 w-28 rounded-md border border-vast-border bg-vast-bg px-3 text-sm outline-none focus:border-vast-accent" />;
}

function LabeledNumber(props: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number }) {
  return <SettingInline label={props.label}><NumberInput value={props.value} onChange={props.onChange} min={props.min} max={props.max} step={props.step} /></SettingInline>;
}

function Segmented({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <div className="flex rounded-md border border-vast-border bg-vast-bg p-0.5">{options.map(([v, label]) => <button key={v} type="button" onClick={() => onChange(v)} className={cn("h-8 rounded px-3 text-sm text-vast-fg-muted", value === v && "bg-vast-bg-active text-vast-fg")}>{label}</button>)}</div>;
}

function Button({ children, icon: Icon, disabled, onClick }: { children: React.ReactNode; icon?: typeof Download; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-md bg-vast-accent px-3 text-sm text-white hover:bg-vast-accent-hover disabled:cursor-not-allowed disabled:opacity-50">{Icon && <Icon size={16} />}{children}</button>;
}

function IconButton({ title, icon: Icon, onClick }: { title: string; icon: typeof Download; onClick: () => void }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-md border border-vast-border text-vast-fg-muted hover:bg-vast-bg-hover hover:text-vast-fg"><Icon size={15} /></button>;
}

function AnchorButton({ href, icon: Icon, children }: { href: string; icon: typeof ExternalLink; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-vast-border px-3 text-sm text-vast-fg-muted hover:bg-vast-bg-hover hover:text-vast-fg"><Icon size={15} />{children}</a>;
}

function StatusPill({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs", ok ? "bg-emerald-500/15 text-emerald-300" : "bg-vast-bg-hover text-vast-fg-muted")}>{children}</span>;
}

function InlineNotice({ text, tone = "info" }: { text: string; tone?: "info" | "error" }) {
  return <div className={cn("mb-4 rounded-md border px-3 py-2 text-sm", tone === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-vast-border bg-vast-bg-elevated text-vast-fg-muted")}>{text}</div>;
}

function InfoCard({ icon: Icon, title, rows }: { icon: typeof Monitor; title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border border-vast-border bg-vast-bg-elevated p-4">
      <div className="mb-4 flex items-center gap-2 font-medium"><Icon size={18} />{title}</div>
      <div className="space-y-2">
        {rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 text-sm"><span className="text-vast-fg-muted">{label}</span><span className="text-right">{value}</span></div>)}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
