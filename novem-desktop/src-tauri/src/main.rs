// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod compute;
mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            
            // Start compute engine
            compute::start_compute_engine(app.handle().clone());
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_compute_engine_health,
            commands::check_backend_health,
            commands::get_system_resources,
            commands::call_compute_engine,
            commands::health_check,
            // commands::check_compute_engine_path,
        ])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Stop compute engine when window closes
                compute::stop_compute_engine();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}