// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct Device {
    id: String,
    device_id: String,
    device_model: Option<String>,
    status: String,
}

#[tauri::command]
fn get_devices() -> Result<Vec<Device>, String> {
    let output = Command::new("adb")
        .arg("devices")
        .arg("-l")
        .output()
        .map_err(|e| format!("Failed to execute adb: {}", e))?;

    if !output.status.success() {
        return Err("ADB command failed".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut devices = Vec::new();

    for line in stdout.lines().skip(1) {
        if line.trim().is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let device_id = parts[0].to_string();
            let status = parts[1].to_string();
            
            devices.push(Device {
                id: device_id.clone(),
                device_id,
                device_model: None,
                status,
            });
        }
    }

    Ok(devices)
}

#[tauri::command]
fn check_backend_health() -> Result<bool, String> {
    // Simple health check - in production, use proper HTTP client
    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_devices,
            check_backend_health
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
