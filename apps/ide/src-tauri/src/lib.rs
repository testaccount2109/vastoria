mod commands;
mod ollama;
mod terminal;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(terminal::TerminalState::default())
        .manage(ollama::OllamaOperationState::default())
        .invoke_handler(tauri::generate_handler![
            commands::read_directory,
            commands::read_directory_recursive,
            commands::read_file,
            commands::write_file,
            commands::pick_folder,
            commands::get_recent_projects,
            commands::add_recent_project,
            ollama::ollama_status,
            ollama::ollama_models,
            ollama::ollama_pull_model,
            ollama::ollama_remove_model,
            ollama::ollama_update_model,
            ollama::ollama_start_model,
            ollama::ollama_stop_model,
            ollama::install_ollama,
            ollama::ollama_cancel_operation,
            ollama::runtime_info,
            terminal::terminal_create,
            terminal::terminal_write,
            terminal::terminal_resize,
            terminal::terminal_close,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Vastoria");
}
