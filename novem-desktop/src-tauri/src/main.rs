// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod compute;

use compute::{call_compute_engine, health_check};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            call_compute_engine,
            health_check
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}