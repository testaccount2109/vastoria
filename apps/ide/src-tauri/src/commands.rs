use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadFileResult {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProject {
    pub path: String,
    pub name: String,
    pub opened_at: i64,
}

const SKIP_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    ".venv",
    "__pycache__",
];

fn should_skip(name: &str) -> bool {
    SKIP_DIRS.contains(&name)
}

fn recent_path() -> PathBuf {
    dirs::data_local_dir()
        .or_else(dirs::config_dir)
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Vastoria")
        .join("recent.json")
}

#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    read_dir_flat(&path)
}

#[tauri::command]
pub fn read_directory_recursive(root: String) -> Result<Vec<FileEntry>, String> {
    read_dir_recursive(&root, 0)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<ReadFileResult, String> {
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(ReadFileResult { path, content })
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let folder = app
        .dialog()
        .file()
        .set_title("Open Folder")
        .blocking_pick_folder();

    Ok(folder.map(|p| p.to_string()))
}

#[tauri::command]
pub fn get_recent_projects() -> Result<Vec<RecentProject>, String> {
    load_recent()
}

#[tauri::command]
pub fn add_recent_project(path: String) -> Result<(), String> {
    let mut recent = load_recent()?;
    let name = Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&path)
        .to_string();
    recent.retain(|p| p.path != path);
    recent.insert(
        0,
        RecentProject {
            path: path.clone(),
            name,
            opened_at: chrono::Utc::now().timestamp_millis(),
        },
    );
    recent.truncate(10);
    save_recent(&recent)
}

fn read_dir_flat(path: &str) -> Result<Vec<FileEntry>, String> {
    let dir = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut entries: Vec<FileEntry> = dir
        .filter_map(|e| e.ok())
        .filter(|e| !should_skip(&e.file_name().to_string_lossy()))
        .map(|e| {
            let path = e.path();
            let is_directory = path.is_dir();
            FileEntry {
                name: e.file_name().to_string_lossy().to_string(),
                path: path.to_string_lossy().to_string(),
                is_directory,
                children: None,
            }
        })
        .collect();
    entries.sort_by(|a, b| {
        b.is_directory
            .cmp(&a.is_directory)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

fn read_dir_recursive(path: &str, depth: u32) -> Result<Vec<FileEntry>, String> {
    if depth > 12 {
        return Ok(vec![]);
    }
    let dir = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut entries: Vec<FileEntry> = Vec::new();

    for entry in dir.filter_map(|e| e.ok()) {
        let name = entry.file_name().to_string_lossy().to_string();
        if should_skip(&name) {
            continue;
        }
        let full = entry.path();
        let full_str = full.to_string_lossy().to_string();
        let is_directory = full.is_dir();
        let children = if is_directory {
            Some(read_dir_recursive(&full_str, depth + 1)?)
        } else {
            None
        };
        entries.push(FileEntry {
            name,
            path: full_str,
            is_directory,
            children,
        });
    }

    entries.sort_by(|a, b| {
        b.is_directory
            .cmp(&a.is_directory)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

fn load_recent() -> Result<Vec<RecentProject>, String> {
    let path = recent_path();
    if !path.exists() {
        return Ok(vec![]);
    }
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

fn save_recent(projects: &[RecentProject]) -> Result<(), String> {
    let path = recent_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(projects).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())
}
