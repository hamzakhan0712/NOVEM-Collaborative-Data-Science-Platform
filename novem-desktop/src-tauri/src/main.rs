#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod python_engine;
mod database;
mod commands;

use std::sync::Mutex;
use std::path::PathBuf;
use tauri::Manager;
use python_engine::EmbeddedPythonEngine;
use database::LocalDatabase;

struct AppState {
    python_engine: Mutex<EmbeddedPythonEngine>,
    db: Mutex<Option<LocalDatabase>>,
}

fn find_compute_engine_dir() -> Option<PathBuf> {
    let current_dir = std::env::current_dir().ok()?;
    
    let dev_path = current_dir.parent()?.parent()?.join("compute_engine");
    if dev_path.exists() && dev_path.join("main.py").exists() {
        println!("[NOVEM] Found compute_engine (dev mode): {:?}", dev_path);
        return Some(dev_path);
    }

    let exe_path = std::env::current_exe().ok()?;
    let exe_dir = exe_path.parent()?;
    
    let prod_path = exe_dir.join("compute_engine");
    if prod_path.exists() && prod_path.join("main.py").exists() {
        println!("[NOVEM] Found compute_engine (prod mode): {:?}", prod_path);
        return Some(prod_path);
    }

    let resources_path = exe_dir.join("resources").join("compute_engine");
    if resources_path.exists() && resources_path.join("main.py").exists() {
        println!("[NOVEM] Found compute_engine (resources): {:?}", resources_path);
        return Some(resources_path);
    }

    None
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            println!("Initializing NOVEM Desktop...");

            let app_dir = app.path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            
            std::fs::create_dir_all(&app_dir)
                .expect("Failed to create app data directory");
            
            println!("App data directory: {:?}", app_dir);

            let db_path = app_dir.join("novem.db");
            let db = LocalDatabase::new(db_path)
                .expect("Failed to initialize database");
            
            println!("Database initialized");

            let mut python_engine = EmbeddedPythonEngine::new();
            
            if let Some(compute_engine_dir) = find_compute_engine_dir() {
                println!("[NOVEM] Starting embedded compute engine...");
                
                match python_engine.start_fastapi_server(compute_engine_dir) {
                    Ok(_) => {
                        println!("[NOVEM] Embedded compute engine started successfully");
                        println!("[NOVEM] FastAPI available at: http://127.0.0.1:{}", python_engine.get_port());
                    }
                    Err(e) => {
                        eprintln!("[ERROR] Failed to start compute engine: {}", e);
                        eprintln!("[WARNING] Application will run with limited functionality");
                    }
                }
            } else {
                eprintln!("[ERROR] Could not find compute_engine directory");
                eprintln!("[WARNING] Application will run with limited functionality");
            }

            let state = AppState {
                python_engine: Mutex::new(python_engine),
                db: Mutex::new(Some(db)),
            };
            app.manage(state);

            println!("[NOVEM] Desktop initialized");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                println!("[NOVEM] Application closing...");
                
                if let Some(state) = window.app_handle().try_state::<AppState>() {
                    let mut engine = state.python_engine.lock().unwrap();
                    let _ = engine.stop();
                }
            }
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_engine_status,
            commands::get_engine_port,
            commands::restart_engine,
            commands::check_backend_health,
            commands::check_compute_engine_health,
            commands::get_system_resources,
            commands::get_workspaces,
            commands::get_projects,
            commands::health_check,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}