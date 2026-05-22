use serde::Serialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncRead, AsyncReadExt};
use tokio::process::Command;
use tokio::sync::oneshot;
use tokio::time::timeout;

const OLLAMA_EVENT: &str = "ollama://progress";
#[cfg(target_os = "windows")]
const INSTALL_TIMEOUT: Duration = Duration::from_secs(20 * 60);
const COMMAND_TIMEOUT: Duration = Duration::from_secs(30);
const MODEL_OPERATION_TIMEOUT: Duration = Duration::from_secs(12 * 60 * 60);

#[derive(Clone, Default)]
pub struct OllamaOperationState {
    active: Arc<Mutex<HashMap<String, ActiveOperation>>>,
}

struct ActiveOperation {
    label: String,
    cancel: oneshot::Sender<()>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaStatus {
    pub installed: bool,
    pub executable_path: Option<String>,
    pub service_running: bool,
    pub version: Option<String>,
    pub install_candidates: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OllamaModel {
    pub name: String,
    pub id: String,
    pub size: String,
    pub modified: String,
    pub running: bool,
    pub processor: Option<String>,
    pub until: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelProgress {
    pub operation_id: String,
    pub model: String,
    pub action: String,
    pub state: String,
    pub line: String,
    pub percent: Option<f32>,
    pub speed: Option<String>,
    pub downloaded: Option<String>,
    pub total: Option<String>,
    pub eta: Option<String>,
    pub done: bool,
    pub cancelled: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeInfo {
    pub app_version: String,
    pub os: String,
    pub arch: String,
    pub cpu_count: usize,
    pub rust_target: String,
    pub ollama_storage_bytes: u64,
}

#[tauri::command]
pub async fn ollama_status() -> Result<OllamaStatus, String> {
    ollama_status_inner().await
}

#[tauri::command]
pub async fn ollama_models() -> Result<Vec<OllamaModel>, String> {
    let exe = require_ollama().await?;
    let list = run_output(&exe, &["list"], COMMAND_TIMEOUT).await?;
    let ps = run_output(&exe, &["ps"], COMMAND_TIMEOUT).await.unwrap_or_default();
    Ok(parse_models(&list, &ps))
}

#[tauri::command]
pub async fn ollama_pull_model(
    app: AppHandle,
    state: State<'_, OllamaOperationState>,
    model: String,
) -> Result<(), String> {
    start_ollama_command(
        app,
        state,
        operation_id("pull", &model),
        "pull",
        model.clone(),
        vec!["pull".to_string(), model],
        MODEL_OPERATION_TIMEOUT,
    )
    .await
}

#[tauri::command]
pub async fn ollama_remove_model(
    app: AppHandle,
    state: State<'_, OllamaOperationState>,
    model: String,
) -> Result<(), String> {
    start_ollama_command(
        app,
        state,
        operation_id("remove", &model),
        "remove",
        model.clone(),
        vec!["rm".to_string(), model],
        Duration::from_secs(10 * 60),
    )
    .await
}

#[tauri::command]
pub async fn ollama_update_model(
    app: AppHandle,
    state: State<'_, OllamaOperationState>,
    model: String,
) -> Result<(), String> {
    start_ollama_command(
        app,
        state,
        operation_id("update", &model),
        "update",
        model.clone(),
        vec!["pull".to_string(), model],
        MODEL_OPERATION_TIMEOUT,
    )
    .await
}

#[tauri::command]
pub async fn ollama_start_model(
    app: AppHandle,
    state: State<'_, OllamaOperationState>,
    model: String,
) -> Result<(), String> {
    start_ollama_command(
        app,
        state,
        operation_id("start", &model),
        "start",
        model.clone(),
        vec!["run".to_string(), model, "".to_string()],
        Duration::from_secs(10 * 60),
    )
    .await
}

#[tauri::command]
pub async fn ollama_stop_model(
    app: AppHandle,
    state: State<'_, OllamaOperationState>,
    model: String,
) -> Result<(), String> {
    start_ollama_command(
        app,
        state,
        operation_id("stop", &model),
        "stop",
        model.clone(),
        vec!["stop".to_string(), model],
        Duration::from_secs(2 * 60),
    )
    .await
}

#[tauri::command]
pub async fn install_ollama(
    app: AppHandle,
    state: State<'_, OllamaOperationState>,
) -> Result<(), String> {
    let operation_id = "install:ollama".to_string();
    let (cancel_tx, cancel_rx) = oneshot::channel();
    register_operation(&state, operation_id.clone(), "Ollama installer".to_string(), cancel_tx)?;

    let manager = state.inner().clone();
    tokio::spawn(async move {
        emit_progress(
            &app,
            ModelProgress::new(&operation_id, "ollama", "install", "downloading", "Preparing Ollama installer"),
        );
        let result = run_installer(app.clone(), operation_id.clone(), cancel_rx).await;
        finish_operation(&manager, &operation_id);
        match result {
            Ok(()) => emit_progress(
                &app,
                ModelProgress::new(&operation_id, "ollama", "install", "installed", "Ollama installed and verified").done(),
            ),
            Err(OperationError::Cancelled) => emit_progress(
                &app,
                ModelProgress::new(&operation_id, "ollama", "install", "failed", "Installation cancelled")
                    .cancelled(),
            ),
            Err(OperationError::Failed(error)) => emit_progress(
                &app,
                ModelProgress::new(&operation_id, "ollama", "install", "failed", &error)
                    .failed(error),
            ),
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn ollama_cancel_operation(
    state: State<'_, OllamaOperationState>,
    operation_id: String,
) -> Result<(), String> {
    let active = state
        .active
        .lock()
        .map_err(|_| "Ollama operation manager is unavailable.".to_string())?
        .remove(&operation_id);
    if let Some(active) = active {
        active
            .cancel
            .send(())
            .map_err(|_| format!("{} was already finishing.", active.label))?;
        Ok(())
    } else {
        Err("No active Ollama operation with that id.".to_string())
    }
}

#[tauri::command]
pub async fn runtime_info() -> Result<RuntimeInfo, String> {
    let storage = tokio::task::spawn_blocking(|| dir_size(&ollama_storage_dir()))
        .await
        .map_err(|e| e.to_string())?;
    Ok(RuntimeInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        os: env::consts::OS.to_string(),
        arch: env::consts::ARCH.to_string(),
        cpu_count: std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(1),
        rust_target: format!("{}-{}", env::consts::OS, env::consts::ARCH),
        ollama_storage_bytes: storage,
    })
}

impl ModelProgress {
    fn new(operation_id: &str, model: &str, action: &str, state: &str, line: &str) -> Self {
        Self {
            operation_id: operation_id.to_string(),
            model: model.to_string(),
            action: action.to_string(),
            state: state.to_string(),
            line: line.to_string(),
            percent: None,
            speed: None,
            downloaded: None,
            total: None,
            eta: None,
            done: false,
            cancelled: false,
            error: None,
        }
    }

    fn with_parsed_progress(mut self) -> Self {
        let parsed = parse_progress_line(&self.line);
        self.percent = parsed.percent;
        self.speed = parsed.speed;
        self.downloaded = parsed.downloaded;
        self.total = parsed.total;
        self.eta = parsed.eta;
        self
    }

    fn done(mut self) -> Self {
        self.done = true;
        self
    }

    fn cancelled(mut self) -> Self {
        self.done = true;
        self.cancelled = true;
        self.error = Some("Operation cancelled".to_string());
        self
    }

    fn failed(mut self, error: String) -> Self {
        self.done = true;
        self.error = Some(classify_error(&error));
        self
    }
}

enum OperationError {
    Cancelled,
    Failed(String),
}

async fn start_ollama_command(
    app: AppHandle,
    state: State<'_, OllamaOperationState>,
    operation_id: String,
    action: &'static str,
    model: String,
    args: Vec<String>,
    timeout_after: Duration,
) -> Result<(), String> {
    let exe = require_ollama().await?;
    let (cancel_tx, cancel_rx) = oneshot::channel();
    register_operation(&state, operation_id.clone(), format!("ollama {action} {model}"), cancel_tx)?;

    let manager = state.inner().clone();
    tokio::spawn(async move {
        emit_progress(
            &app,
            ModelProgress::new(&operation_id, &model, action, "running", "Starting operation"),
        );
        let result = run_streamed_command(
            app.clone(),
            operation_id.clone(),
            exe,
            action.to_string(),
            model.clone(),
            args,
            timeout_after,
            cancel_rx,
        )
        .await;
        finish_operation(&manager, &operation_id);
        match result {
            Ok(()) => emit_progress(
                &app,
                ModelProgress::new(&operation_id, &model, action, "complete", "Complete").done(),
            ),
            Err(OperationError::Cancelled) => emit_progress(
                &app,
                ModelProgress::new(&operation_id, &model, action, "cancelled", "Operation cancelled")
                    .cancelled(),
            ),
            Err(OperationError::Failed(error)) => emit_progress(
                &app,
                ModelProgress::new(&operation_id, &model, action, "failed", &error).failed(error),
            ),
        }
    });

    Ok(())
}

async fn run_streamed_command(
    app: AppHandle,
    operation_id: String,
    exe: String,
    action: String,
    model: String,
    args: Vec<String>,
    timeout_after: Duration,
    cancel_rx: oneshot::Receiver<()>,
) -> Result<(), OperationError> {
    let mut child = Command::new(exe)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| OperationError::Failed(classify_error(&e.to_string())))?;

    if let Some(stdout) = child.stdout.take() {
        tokio::spawn(stream_progress(
            app.clone(),
            operation_id.clone(),
            model.clone(),
            action.clone(),
            stdout,
        ));
    }
    if let Some(stderr) = child.stderr.take() {
        tokio::spawn(stream_progress(
            app.clone(),
            operation_id.clone(),
            model.clone(),
            action.clone(),
            stderr,
        ));
    }

    let started = Instant::now();
    tokio::select! {
        _ = cancel_rx => {
            let _ = child.kill().await;
            Err(OperationError::Cancelled)
        }
        status = timeout(timeout_after, child.wait()) => {
            match status {
                Ok(Ok(status)) if status.success() => Ok(()),
                Ok(Ok(status)) => Err(OperationError::Failed(format!("ollama {action} exited with status {status}"))),
                Ok(Err(error)) => Err(OperationError::Failed(classify_error(&error.to_string()))),
                Err(_) => {
                    let _ = child.kill().await;
                    Err(OperationError::Failed(format!("ollama {action} timed out after {} seconds", started.elapsed().as_secs())))
                }
            }
        }
    }
}

async fn run_installer(
    app: AppHandle,
    operation_id: String,
    cancel_rx: oneshot::Receiver<()>,
) -> Result<(), OperationError> {
    #[cfg(target_os = "windows")]
    {
        let installer = env::temp_dir().join("Vastoria-OllamaSetup.exe");
        let installer_path = installer.to_string_lossy().replace('\'', "''");
        let script = format!(
            "$ErrorActionPreference='Stop'; \
             $ProgressPreference='SilentlyContinue'; \
             Write-Output 'STATE:downloading Downloading official Ollama installer'; \
             Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '{installer_path}'; \
             Write-Output 'STATE:verifying Verifying installer'; \
             if (!(Test-Path '{installer_path}') -or ((Get-Item '{installer_path}').Length -lt 1048576)) {{ throw 'Downloaded installer is missing or incomplete.' }}; \
             Write-Output 'STATE:installing Launching Ollama installer'; \
             & '{installer_path}'; \
             if ($LASTEXITCODE -ne 0) {{ throw \"Ollama installer exited with code $LASTEXITCODE. Check Windows permissions, antivirus quarantine, or elevation prompts.\" }}; \
             Write-Output 'STATE:installed Installer finished; verifying runtime'"
        );

        let result = run_streamed_command(
            app.clone(),
            operation_id.clone(),
            "powershell".to_string(),
            "install".to_string(),
            "ollama".to_string(),
            vec![
                "-NoProfile".to_string(),
                "-ExecutionPolicy".to_string(),
                "Bypass".to_string(),
                "-Command".to_string(),
                script,
            ],
            INSTALL_TIMEOUT,
            cancel_rx,
        )
        .await;
        result?;

        emit_progress(
            &app,
            ModelProgress::new(&operation_id, "ollama", "install", "verifying", "Checking Ollama executable"),
        );
        let status = ollama_status_inner()
            .await
            .map_err(OperationError::Failed)?;
        if status.installed {
            Ok(())
        } else {
            Err(OperationError::Failed(
                "Ollama installer completed but the executable was not found. Restart Vastoria or check the Windows installation path.".to_string(),
            ))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        let _ = operation_id;
        let _ = cancel_rx;
        Err(OperationError::Failed(
            "Automatic Ollama installation is currently supported on Windows builds.".to_string(),
        ))
    }
}

async fn stream_progress<R>(
    app: AppHandle,
    operation_id: String,
    model: String,
    action: String,
    mut reader: R,
) where
    R: AsyncRead + Unpin,
{
    let mut buffer = [0_u8; 2048];
    let mut pending = Vec::new();
    loop {
        let read = match reader.read(&mut buffer).await {
            Ok(0) => break,
            Ok(n) => n,
            Err(error) => {
                emit_progress(
                    &app,
                    ModelProgress::new(
                        &operation_id,
                        &model,
                        &action,
                        "running",
                        &format!("Failed to read process output: {error}"),
                    )
                    .with_parsed_progress(),
                );
                break;
            }
        };
        for byte in &buffer[..read] {
            if *byte == b'\n' || *byte == b'\r' {
                emit_output_line(&app, &operation_id, &model, &action, &mut pending);
            } else {
                pending.push(*byte);
            }
        }
    }
    emit_output_line(&app, &operation_id, &model, &action, &mut pending);
}

fn emit_output_line(
    app: &AppHandle,
    operation_id: &str,
    model: &str,
    action: &str,
    pending: &mut Vec<u8>,
) {
    if pending.is_empty() {
        return;
    }
    let line = String::from_utf8_lossy(pending).trim().to_string();
    pending.clear();
    if line.is_empty() {
        return;
    }
    let (state, message) = line
        .strip_prefix("STATE:")
        .and_then(|rest| rest.split_once(' '))
        .map_or(("running".to_string(), line.clone()), |(state, message)| {
            (state.to_string(), message.to_string())
        });
    emit_progress(
        app,
        ModelProgress::new(operation_id, model, action, &state, &message).with_parsed_progress(),
    );
}

async fn ollama_status_inner() -> Result<OllamaStatus, String> {
    let candidates = ollama_candidates();
    let executable = candidates.iter().find(|path| Path::new(path).exists()).cloned();
    let version = match executable.as_ref() {
        Some(path) => run_output(path, &["--version"], COMMAND_TIMEOUT)
            .await
            .ok()
            .map(|s| s.trim().to_string()),
        None => None,
    };

    Ok(OllamaStatus {
        installed: executable.is_some(),
        executable_path: executable,
        service_running: service_running().await,
        version,
        install_candidates: candidates,
    })
}

async fn require_ollama() -> Result<String, String> {
    ollama_status_inner()
        .await?
        .executable_path
        .ok_or_else(|| "Ollama is not installed or not visible in PATH.".to_string())
}

async fn service_running() -> bool {
    let addr: SocketAddr = match "127.0.0.1:11434".parse() {
        Ok(addr) => addr,
        Err(_) => return false,
    };
    if timeout(Duration::from_millis(350), tokio::net::TcpStream::connect(addr))
        .await
        .map_or(false, |result| result.is_ok())
    {
        return true;
    }
    if cfg!(target_os = "windows") {
        run_output("tasklist", &[], COMMAND_TIMEOUT)
            .await
            .map_or(false, |out| out.to_lowercase().contains("ollama"))
    } else {
        run_output("pgrep", &["-f", "ollama"], COMMAND_TIMEOUT)
            .await
            .map_or(false, |out| !out.trim().is_empty())
    }
}

async fn run_output(cmd: &str, args: &[&str], timeout_after: Duration) -> Result<String, String> {
    let output = timeout(
        timeout_after,
        Command::new(cmd)
            .args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output(),
    )
    .await
    .map_err(|_| format!("{cmd} timed out after {} seconds", timeout_after.as_secs()))?
    .map_err(|e| classify_error(&e.to_string()))?;
    if !output.status.success() {
        return Err(classify_error(
            String::from_utf8_lossy(&output.stderr).trim(),
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn register_operation(
    state: &OllamaOperationState,
    operation_id: String,
    label: String,
    cancel: oneshot::Sender<()>,
) -> Result<(), String> {
    let mut active = state
        .active
        .lock()
        .map_err(|_| "Ollama operation manager is unavailable.".to_string())?;
    if active.contains_key(&operation_id) {
        return Err(format!("{label} is already running."));
    }
    active.insert(operation_id, ActiveOperation { label, cancel });
    Ok(())
}

fn finish_operation(state: &OllamaOperationState, operation_id: &str) {
    if let Ok(mut active) = state.active.lock() {
        active.remove(operation_id);
    }
}

fn emit_progress(app: &AppHandle, progress: ModelProgress) {
    app.emit(OLLAMA_EVENT, progress).ok();
}

fn operation_id(action: &str, model: &str) -> String {
    format!("{action}:{}", model.trim().to_lowercase())
}

fn ollama_candidates() -> Vec<String> {
    let mut paths = Vec::new();
    if let Ok(path) = env::var("PATH") {
        for part in env::split_paths(&path) {
            paths.push(part.join(exe_name("ollama")).to_string_lossy().to_string());
        }
    }
    if let Some(local) = dirs::data_local_dir() {
        paths.push(
            local
                .join("Programs")
                .join("Ollama")
                .join(exe_name("ollama"))
                .to_string_lossy()
                .to_string(),
        );
    }
    paths.push(format!(r"C:\Program Files\Ollama\{}", exe_name("ollama")));
    paths.push("/usr/local/bin/ollama".to_string());
    paths.push("/usr/bin/ollama".to_string());
    paths.sort();
    paths.dedup();
    paths
}

fn exe_name(base: &str) -> String {
    if cfg!(target_os = "windows") {
        format!("{base}.exe")
    } else {
        base.to_string()
    }
}

#[derive(Default)]
struct ParsedProgress {
    percent: Option<f32>,
    speed: Option<String>,
    downloaded: Option<String>,
    total: Option<String>,
    eta: Option<String>,
}

fn parse_progress_line(line: &str) -> ParsedProgress {
    let mut parsed = ParsedProgress::default();
    let tokens: Vec<&str> = line.split_whitespace().collect();
    for (idx, token) in tokens.iter().enumerate() {
        if let Some(percent) = token.strip_suffix('%').and_then(|v| v.parse::<f32>().ok()) {
            parsed.percent = Some(percent.clamp(0.0, 100.0));
        }
        if token.contains('/') && idx > 0 {
            let mut parts = token.splitn(2, '/');
            if let (Some(downloaded), Some(total)) = (parts.next(), parts.next()) {
                let unit = tokens.get(idx + 1).copied().unwrap_or_default();
                if is_size_unit(unit) {
                    parsed.downloaded = Some(format!("{downloaded} {unit}"));
                    parsed.total = Some(format!("{total} {unit}"));
                } else {
                    parsed.downloaded = Some(downloaded.to_string());
                    parsed.total = Some(total.to_string());
                }
            }
        }
        if token.ends_with("/s") && idx > 0 {
            parsed.speed = Some(format!("{} {}", tokens[idx - 1], token));
        }
        if looks_like_eta(token) {
            parsed.eta = Some((*token).to_string());
        }
    }
    parsed
}

fn is_size_unit(value: &str) -> bool {
    matches!(value, "B" | "KB" | "MB" | "GB" | "TB" | "KiB" | "MiB" | "GiB" | "TiB")
}

fn looks_like_eta(value: &str) -> bool {
    if value.is_empty() || value.ends_with("/s") {
        return false;
    }
    value.ends_with('s') || value.ends_with('m') || value.ends_with('h')
}

fn classify_error(error: &str) -> String {
    let normalized = error.trim();
    let lower = normalized.to_lowercase();
    if lower.contains("timed out") {
        format!("{normalized}. The operation timed out; retry when the network or Ollama service is responsive.")
    } else if lower.contains("access is denied") || lower.contains("permission") || lower.contains("elevation") {
        format!("{normalized}. Windows may require elevation or your antivirus may be blocking the installer/process.")
    } else if lower.contains("no space") || lower.contains("disk") {
        format!("{normalized}. Free disk space and retry the operation.")
    } else if lower.contains("connection") || lower.contains("network") || lower.contains("resolve") || lower.contains("internet") {
        format!("{normalized}. Check internet connectivity, proxy settings, and whether ollama.com is reachable.")
    } else if lower.contains("port") || lower.contains("11434") || lower.contains("address already in use") {
        format!("{normalized}. Another process may be using Ollama's local port 11434.")
    } else if lower.contains("memory") || lower.contains("ram") {
        format!("{normalized}. The selected model may require more available RAM or VRAM.")
    } else if lower.contains("corrupt") || lower.contains("checksum") || lower.contains("incomplete") {
        format!("{normalized}. Delete the partial download and retry.")
    } else if normalized.is_empty() {
        "Ollama operation failed without a detailed error. Check Windows security prompts, antivirus logs, and the Ollama service state.".to_string()
    } else {
        normalized.to_string()
    }
}

fn parse_models(list: &str, ps: &str) -> Vec<OllamaModel> {
    let running = parse_running(ps);
    list.lines()
        .skip(1)
        .filter_map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 4 {
                return None;
            }
            let name = parts[0].to_string();
            let size_idx = parts
                .iter()
                .position(|part| ["B", "KB", "MB", "GB", "TB"].contains(part))
                .unwrap_or(3);
            let size = if size_idx > 0 {
                format!("{} {}", parts[size_idx - 1], parts[size_idx])
            } else {
                parts.get(2).unwrap_or(&"").to_string()
            };
            let state = running.get(&name);
            Some(OllamaModel {
                name: name.clone(),
                id: parts.get(1).unwrap_or(&"").to_string(),
                size,
                modified: parts.get(size_idx + 1..).unwrap_or(&[]).join(" "),
                running: state.is_some(),
                processor: state.and_then(|s| s.0.clone()),
                until: state.and_then(|s| s.1.clone()),
            })
        })
        .collect()
}

fn parse_running(ps: &str) -> HashMap<String, (Option<String>, Option<String>)> {
    let mut map = HashMap::new();
    for line in ps.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }
        let processor = parts.get(2).map(|s| s.to_string());
        let until = parts.get(3..).map(|s| s.join(" "));
        map.insert(parts[0].to_string(), (processor, until));
    }
    map
}

fn ollama_storage_dir() -> PathBuf {
    if let Ok(home) = env::var("USERPROFILE").or_else(|_| env::var("HOME")) {
        return PathBuf::from(home).join(".ollama").join("models");
    }
    PathBuf::from(".ollama").join("models")
}

fn dir_size(path: &Path) -> u64 {
    let Ok(entries) = fs::read_dir(path) else {
        return 0;
    };
    entries
        .filter_map(Result::ok)
        .map(|entry| {
            let path = entry.path();
            if path.is_dir() {
                dir_size(&path)
            } else {
                entry.metadata().map(|m| m.len()).unwrap_or(0)
            }
        })
        .sum()
}
