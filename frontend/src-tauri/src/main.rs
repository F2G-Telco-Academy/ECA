// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::{Command, Child, Stdio};
use std::sync::Mutex;
use tauri::{Manager, State};
use serde::{Deserialize, Serialize};

// Backend process state
struct BackendState {
    process: Mutex<Option<Child>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse<T> {
    data: Option<T>,
    error: Option<String>,
}

// ========== FILE SYSTEM COMMANDS ==========

#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<PathBuf, String> {
    app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn open_file_location(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(std::path::Path::new(&path).parent().unwrap())
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

// ========== BACKEND PROCESS MANAGEMENT ==========

#[tauri::command]
async fn start_backend(state: State<'_, BackendState>, app: tauri::AppHandle) -> Result<String, String> {
    let mut process_guard = state.process.lock().unwrap();
    
    if process_guard.is_some() {
        return Ok("Backend already running".to_string());
    }

    // Get the app directory
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let backend_dir = app_dir.parent().unwrap().parent().unwrap().join("SpringbootProjects/p2");

    // Start Spring Boot backend
    let child = Command::new("./mvnw")
        .arg("spring-boot:run")
        .current_dir(&backend_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start backend: {}", e))?;

    *process_guard = Some(child);
    Ok("Backend started successfully".to_string())
}

#[tauri::command]
async fn stop_backend(state: State<'_, BackendState>) -> Result<String, String> {
    let mut process_guard = state.process.lock().unwrap();
    
    if let Some(mut child) = process_guard.take() {
        child.kill().map_err(|e| format!("Failed to stop backend: {}", e))?;
        Ok("Backend stopped successfully".to_string())
    } else {
        Ok("Backend not running".to_string())
    }
}

#[tauri::command]
async fn check_backend_status() -> Result<bool, String> {
    // Check if backend is responding
    let client = reqwest::Client::new();
    match client.get("http://localhost:8080/actuator/health")
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await
    {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

// ========== ADB COMMANDS ==========

#[tauri::command]
async fn execute_adb_command(command: Vec<String>) -> Result<String, String> {
    let output = Command::new("adb")
        .args(&command)
        .output()
        .map_err(|e| format!("Failed to execute ADB command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn list_adb_devices() -> Result<Vec<String>, String> {
    let output = Command::new("adb")
        .arg("devices")
        .output()
        .map_err(|e| format!("Failed to list ADB devices: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let devices: Vec<String> = stdout
            .lines()
            .skip(1) // Skip "List of devices attached"
            .filter(|line| !line.is_empty())
            .map(|line| line.split_whitespace().next().unwrap_or("").to_string())
            .filter(|s| !s.is_empty())
            .collect();
        Ok(devices)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// ========== SCAT/PCAP PROCESSING ==========

#[tauri::command]
async fn convert_qmdl_to_pcap(input_path: String, output_path: String) -> Result<String, String> {
    let output = Command::new("python3")
        .arg("scat/scat.py")
        .arg("-t")
        .arg("qc")
        .arg("-d")
        .arg(&input_path)
        .arg("-F")
        .arg(&output_path)
        .output()
        .map_err(|e| format!("Failed to convert QMDL: {}", e))?;

    if output.status.success() {
        Ok(format!("Converted successfully to {}", output_path))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn convert_sdm_to_pcap(input_path: String, output_path: String) -> Result<String, String> {
    let output = Command::new("python3")
        .arg("scat/scat.py")
        .arg("-t")
        .arg("sec")
        .arg("-d")
        .arg(&input_path)
        .arg("-F")
        .arg(&output_path)
        .output()
        .map_err(|e| format!("Failed to convert SDM: {}", e))?;

    if output.status.success() {
        Ok(format!("Converted successfully to {}", output_path))
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn analyze_pcap_with_tshark(pcap_path: String) -> Result<String, String> {
    let output = Command::new("tshark")
        .arg("-r")
        .arg(&pcap_path)
        .arg("-T")
        .arg("json")
        .output()
        .map_err(|e| format!("Failed to analyze PCAP: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// ========== SYSTEM UTILITIES ==========

#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
    use sysinfo::System;
    
    let mut sys = System::new_all();
    sys.refresh_all();

    let info = serde_json::json!({
        "cpu_usage": sys.global_cpu_info().cpu_usage(),
        "memory_total": sys.total_memory(),
        "memory_used": sys.used_memory(),
        "memory_available": sys.available_memory(),
        "os": System::name().unwrap_or_default(),
        "os_version": System::os_version().unwrap_or_default(),
        "kernel_version": System::kernel_version().unwrap_or_default(),
    });

    Ok(info)
}

#[tauri::command]
async fn open_terminal(command: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        Command::new("x-terminal-emulator")
            .arg("-e")
            .arg(&command)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-a")
            .arg("Terminal")
            .arg(&command)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .arg("/c")
            .arg("start")
            .arg("cmd")
            .arg("/k")
            .arg(&command)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(BackendState {
            process: Mutex::new(None),
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Start backend in a separate thread
            tauri::async_runtime::spawn(async move {
                // Check if backend is already running
                match check_backend_status().await {
                    Ok(true) => {
                        println!("Backend already running on port 8080");
                    }
                    _ => {
                        println!("Starting Spring Boot backend...");
                        // Try to start backend
                        if let Err(e) = start_backend_process().await {
                            eprintln!("Failed to start backend: {}", e);
                        }
                    }
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // File system
            get_app_data_dir,
            open_file_location,
            // Backend management
            start_backend,
            stop_backend,
            check_backend_status,
            // ADB
            execute_adb_command,
            list_adb_devices,
            // SCAT/PCAP
            convert_qmdl_to_pcap,
            convert_sdm_to_pcap,
            analyze_pcap_with_tshark,
            // System
            get_system_info,
            open_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn start_backend_process() -> Result<(), String> {
    // Find backend directory - check multiple possible locations
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    
    let backend_paths = vec![
        current_dir.parent().and_then(|p| p.parent()).map(|p| p.to_path_buf()),
        current_dir.parent().map(|p| p.to_path_buf()),
    ];

    for base_path_opt in backend_paths {
        if let Some(base_path) = base_path_opt {
            let mvnw_path = if cfg!(target_os = "windows") {
                base_path.join("mvnw.cmd")
            } else {
                base_path.join("mvnw")
            };

            if mvnw_path.exists() {
                println!("Found backend at: {:?}", base_path);
                
                let _child = Command::new(&mvnw_path)
                    .arg("spring-boot:run")
                    .current_dir(&base_path)
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                    .map_err(|e| format!("Failed to start backend: {}", e))?;

                println!("Backend process started successfully");
                return Ok(());
            }
        }
    }

    Err("Backend mvnw not found in expected locations".to_string())
}
