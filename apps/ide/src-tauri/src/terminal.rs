use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSession {
    pub id: String,
    pub title: String,
    pub cwd: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutputEvent {
    pub session_id: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalExitEvent {
    pub session_id: String,
    pub code: Option<i32>,
}

struct PtySession {
    writer: Box<dyn Write + Send>,
}

pub struct TerminalState {
    sessions: Mutex<HashMap<String, PtySession>>,
    counter: Mutex<u32>,
}

impl Default for TerminalState {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            counter: Mutex::new(0),
        }
    }
}

/// Resolve the default shell and display label for the host OS.
fn resolve_shell() -> (PathBuf, String) {
    #[cfg(target_os = "windows")]
    {
        if std::env::var("VASTORIA_TERMINAL_SHELL")
            .map(|v| v.eq_ignore_ascii_case("git-bash"))
            .unwrap_or(false)
        {
            if let Ok(pf) = std::env::var("ProgramFiles") {
                let bash = PathBuf::from(pf).join("Git").join("bin").join("bash.exe");
                if bash.is_file() {
                    return (bash, "Git Bash".to_string());
                }
            }
        }

        if let Ok(wt) = std::env::var("LOCALAPPDATA") {
            let wt_exe = PathBuf::from(wt)
                .join("Microsoft")
                .join("WindowsApps")
                .join("wt.exe");
            if wt_exe.is_file() {
                return (wt_exe, "Windows Terminal".to_string());
            }
        }

        let pwsh = PathBuf::from(
            std::env::var("ProgramFiles")
                .unwrap_or_else(|_| "C:\\Program Files".to_string()),
        )
        .join("PowerShell")
        .join("7")
        .join("pwsh.exe");
        if pwsh.is_file() {
            return (pwsh, "PowerShell 7".to_string());
        }

        if let Ok(comspec) = std::env::var("COMSPEC") {
            let cmd = PathBuf::from(&comspec);
            if cmd.is_file() {
                return (cmd, "Command Prompt".to_string());
            }
        }

        (
            PathBuf::from(r"C:\Windows\System32\cmd.exe"),
            "Command Prompt".to_string(),
        )
    }

    #[cfg(not(target_os = "windows"))]
    {
        (
            PathBuf::from("/bin/sh"),
            "shell".to_string(),
        )
    }
}

#[tauri::command]
pub fn terminal_create(
    app: AppHandle,
    state: State<'_, TerminalState>,
    cwd: String,
) -> Result<TerminalSession, String> {
    let mut counter = state.counter.lock().map_err(|e| e.to_string())?;
    *counter += 1;
    let n = *counter;
    drop(counter);

    let id = uuid::Uuid::new_v4().to_string();
    let (shell_path, shell_label) = resolve_shell();

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(&shell_path);
    cmd.cwd(&cwd);

    #[cfg(target_os = "windows")]
    {
        if shell_path.extension().and_then(|e| e.to_str()) == Some("exe") {
            let name = shell_path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if name.eq_ignore_ascii_case("pwsh.exe") {
                cmd.arg("-NoLogo");
            }
        }
    }

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| e.to_string())?;

    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| e.to_string())?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| e.to_string())?;

    let session_id = id.clone();
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_handle.emit(
                        "terminal://output",
                        TerminalOutputEvent {
                            session_id: session_id.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        let code = child
            .try_wait()
            .ok()
            .flatten()
            .map(|s| s.exit_code() as i32);
        let _ = app_handle.emit(
            "terminal://exit",
            TerminalExitEvent {
                session_id: session_id.clone(),
                code: code.map(|c| c as i32),
            },
        );
    });

    state
        .sessions
        .lock()
        .map_err(|e| e.to_string())?
        .insert(id.clone(), PtySession { writer });

    Ok(TerminalSession {
        id,
        title: format!("{shell_label} {n}"),
        cwd,
    })
}

#[tauri::command]
pub fn terminal_write(
    state: State<'_, TerminalState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(session) = sessions.get_mut(&session_id) {
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn terminal_resize(
    _state: State<'_, TerminalState>,
    _session_id: String,
    _cols: u32,
    _rows: u32,
) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn terminal_close(
    state: State<'_, TerminalState>,
    session_id: String,
) -> Result<(), String> {
    state
        .sessions
        .lock()
        .map_err(|e| e.to_string())?
        .remove(&session_id);
    Ok(())
}
