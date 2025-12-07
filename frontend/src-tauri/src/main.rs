// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

#[tauri::command]
fn get_app_data_dir(app_handle: tauri::AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| "Failed to get app data directory".to_string())
}

#[tauri::command]
fn open_file_location(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(std::path::Path::new(&path).parent().unwrap())
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            open_file_location
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
