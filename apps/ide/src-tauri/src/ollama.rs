use serde::Serialize;
use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

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
    pub model: String,
    pub action: String,
    pub line: String,
    pub done: bool,
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
pub fn ollama_status() -> Result<OllamaStatus, String> {
    let candidates = ollama_candidates();
    let executable = candidates.iter().find(|path| Path::new(path).exists()).cloned();
    let version = executable
        .as_ref()
        .and_then(|path| run_output(path, &["--version"]).ok())
        .map(|s| s.trim().to_string());

    Ok(OllamaStatus {
        installed: executable.is_some(),
        executable_path: executable,
        service_running: service_running(),
        version,
        install_candidates: candidates,
    })
}

#[tauri::command]
pub fn ollama_models() -> Result<Vec<OllamaModel>, String> {
    let exe = require_ollama()?;
    let list = run_output(&exe, &["list"])?;
    let ps = run_output(&exe, &["ps"]).unwrap_or_default();
    Ok(parse_models(&list, &ps))
}

#[tauri::command]
pub fn ollama_pull_model(app: AppHandle, model: String) -> Result<(), String> {
    run_streamed(app, "pull", model.clone(), vec!["pull".to_string(), model])
}

#[tauri::command]
pub fn ollama_remove_model(model: String) -> Result<(), String> {
    let exe = require_ollama()?;
    run_status(&exe, &["rm", &model])
}

#[tauri::command]
pub fn ollama_update_model(app: AppHandle, model: String) -> Result<(), String> {
    run_streamed(app, "update", model.clone(), vec!["pull".to_string(), model])
}

#[tauri::command]
pub fn ollama_start_model(app: AppHandle, model: String) -> Result<(), String> {
    run_streamed(app, "start", model.clone(), vec!["run".to_string(), model, "".to_string()])
}

#[tauri::command]
pub fn ollama_stop_model(model: String) -> Result<(), String> {
    let exe = require_ollama()?;
    run_status(&exe, &["stop", &model])
}

#[tauri::command]
pub fn install_ollama(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let installer = env::temp_dir().join("Vastoria-OllamaSetup.exe");
        let script = format!(
            "$ProgressPreference='SilentlyContinue'; \
             Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '{}'; \
             Start-Process -FilePath '{}' -Wait",
            installer.display(),
            installer.display()
        );
        app.emit(
            "ollama://progress",
            ModelProgress {
                model: "ollama".to_string(),
                action: "install".to_string(),
                line: "Downloading official Ollama installer".to_string(),
                done: false,
                error: None,
            },
        )
        .ok();
        let status = Command::new("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!("Ollama installer failed with status {status}"));
        }
        app.emit(
            "ollama://progress",
            ModelProgress {
                model: "ollama".to_string(),
                action: "install".to_string(),
                line: "Installation finished; verifying runtime".to_string(),
                done: true,
                error: None,
            },
        )
        .ok();
        return ollama_status().and_then(|s| {
            if s.installed {
                Ok(())
            } else {
                Err("Ollama installer completed but the executable was not found".to_string())
            }
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Err("Automatic Ollama installation is currently supported on Windows builds.".to_string())
    }
}

#[tauri::command]
pub fn runtime_info() -> Result<RuntimeInfo, String> {
    Ok(RuntimeInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        os: env::consts::OS.to_string(),
        arch: env::consts::ARCH.to_string(),
        cpu_count: std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(1),
        rust_target: format!("{}-{}", env::consts::OS, env::consts::ARCH),
        ollama_storage_bytes: dir_size(&ollama_storage_dir()),
    })
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

fn require_ollama() -> Result<String, String> {
    ollama_status()?
        .executable_path
        .ok_or_else(|| "Ollama is not installed or not visible in PATH.".to_string())
}

fn service_running() -> bool {
    let addr: SocketAddr = match "127.0.0.1:11434".parse() {
        Ok(addr) => addr,
        Err(_) => return false,
    };
    if TcpStream::connect_timeout(&addr, Duration::from_millis(350)).is_ok() {
        return true;
    }
    if cfg!(target_os = "windows") {
        run_output("tasklist", &[]).map_or(false, |out| out.to_lowercase().contains("ollama"))
    } else {
        run_output("pgrep", &["-f", "ollama"]).map_or(false, |out| !out.trim().is_empty())
    }
}

fn run_output(cmd: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new(cmd).args(args).output().map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn run_status(cmd: &str, args: &[&str]) -> Result<(), String> {
    let status = Command::new(cmd).args(args).status().map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("{cmd} exited with status {status}"))
    }
}

fn run_streamed(app: AppHandle, action: &str, model: String, args: Vec<String>) -> Result<(), String> {
    let exe = require_ollama()?;
    let mut child = Command::new(exe)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(stdout) = child.stdout.take() {
        stream_progress(app.clone(), model.clone(), action.to_string(), stdout);
    }
    if let Some(stderr) = child.stderr.take() {
        stream_progress(app.clone(), model.clone(), action.to_string(), stderr);
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    app.emit(
        "ollama://progress",
        ModelProgress {
            model: model.clone(),
            action: action.to_string(),
            line: if status.success() { "Complete" } else { "Failed" }.to_string(),
            done: true,
            error: if status.success() {
                None
            } else {
                Some(format!("ollama {action} exited with status {status}"))
            },
        },
    )
    .ok();

    if status.success() {
        Ok(())
    } else {
        Err(format!("ollama {action} exited with status {status}"))
    }
}

fn stream_progress<R>(app: AppHandle, model: String, action: String, reader: R)
where
    R: Read + Send + 'static,
{
    std::thread::spawn(move || {
        for line in BufReader::new(reader).lines().map_while(Result::ok) {
            app.emit(
                "ollama://progress",
                ModelProgress {
                    model: model.clone(),
                    action: action.clone(),
                    line,
                    done: false,
                    error: None,
                },
            )
            .ok();
        }
    });
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

fn parse_running(ps: &str) -> std::collections::HashMap<String, (Option<String>, Option<String>)> {
    let mut map = std::collections::HashMap::new();
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
