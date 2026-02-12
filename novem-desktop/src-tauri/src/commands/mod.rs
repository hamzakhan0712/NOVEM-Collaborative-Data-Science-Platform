use tauri::State;
use crate::{AppState, database::{Workspace, Project}};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: Option<String>,
    pub timestamp: Option<String>,
    pub database: Option<String>,
    pub mode: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemResources {
    pub cpu_percent: f64,
    pub memory_percent: f64,
    pub memory_available_gb: f64,
    pub memory_total_gb: f64,
    pub disk_available_gb: f64,
    pub disk_total_gb: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DetailedStatus {
    pub status: String,
    pub service: String,
    pub timestamp: String,
    pub mode: String,
    pub resources: Option<SystemResources>,
}

// ==================== ENGINE STATUS ====================

#[tauri::command]
pub async fn get_engine_status(state: State<'_, AppState>) -> Result<bool, String> {
    let engine = state.python_engine.lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;
    
    engine.check_health()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_engine_port(state: State<'_, AppState>) -> Result<u16, String> {
    let engine = state.python_engine.lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;
    
    Ok(engine.get_port())
}

#[tauri::command]
pub async fn restart_engine(state: State<'_, AppState>) -> Result<bool, String> {
    let mut engine = state.python_engine.lock()
        .map_err(|e| format!("Failed to lock engine: {}", e))?;
    
    engine.restart()
        .map_err(|e| e.to_string())?;
    
    Ok(true)
}

// ==================== HEALTH CHECKS ====================

#[tauri::command]
pub async fn check_backend_health() -> Result<HealthResponse, String> {
    use reqwest::Client;
    use std::time::Duration;
    
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    match client.get("http://localhost:8000/api/health/")
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<HealthResponse>().await {
                    Ok(health) => Ok(health),
                    Err(_) => Ok(HealthResponse {
                        status: "healthy".to_string(),
                        service: Some("novem-backend".to_string()),
                        timestamp: Some(chrono::Utc::now().to_rfc3339()),
                        database: Some("connected".to_string()),
                        mode: None,
                    }),
                }
            } else {
                Err(format!("Backend returned status: {}", response.status()))
            }
        }
        Err(e) => Err(format!("Backend unreachable: {}", e)),
    }
}

#[tauri::command]
pub async fn check_compute_engine_health(state: State<'_, AppState>) -> Result<HealthResponse, String> {
    use reqwest::Client;
    use std::time::Duration;
    
    // Get port and drop the lock immediately
    let port = {
        let engine = state.python_engine.lock()
            .map_err(|e| format!("Failed to lock engine: {}", e))?;
        engine.get_port()
    }; // Lock is dropped here
    
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    match client.get(format!("http://127.0.0.1:{}/health", port))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<HealthResponse>().await {
                    Ok(health) => Ok(health),
                    Err(_) => Ok(HealthResponse {
                        status: "healthy".to_string(),
                        service: Some("novem-compute-engine".to_string()),
                        timestamp: Some(chrono::Utc::now().to_rfc3339()),
                        database: Some("duckdb".to_string()),
                        mode: Some("embedded".to_string()),
                    }),
                }
            } else {
                Err(format!("Compute engine returned status: {}", response.status()))
            }
        }
        Err(e) => Err(format!("Compute engine unreachable: {}", e)),
    }
}

#[tauri::command]
pub async fn get_system_resources(state: State<'_, AppState>) -> Result<SystemResources, String> {
    use reqwest::Client;
    use std::time::Duration;
    
    // Get port and drop the lock immediately
    let port = {
        let engine = state.python_engine.lock()
            .map_err(|e| format!("Failed to lock engine: {}", e))?;
        engine.get_port()
    }; // Lock is dropped here
    
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    match client.get(format!("http://127.0.0.1:{}/health/status", port))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                let detailed: DetailedStatus = response.json().await
                    .map_err(|e| format!("Failed to parse response: {}", e))?;
                
                detailed.resources.ok_or_else(|| "No resources in response".to_string())
            } else {
                Err(format!("Failed to get resources: {}", response.status()))
            }
        }
        Err(e) => Err(format!("Request failed: {}", e)),
    }
}

// ==================== DATABASE ====================

#[tauri::command]
pub async fn get_workspaces(
    state: State<'_, AppState>,
    user_id: i64,
) -> Result<Vec<Workspace>, String> {
    let db_guard = state.db.lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;
    
    db.get_workspaces(user_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_projects(
    state: State<'_, AppState>,
    workspace_id: i64,
    user_id: i64,
) -> Result<Vec<Project>, String> {
    let db_guard = state.db.lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;
    
    db.get_projects(workspace_id, user_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn health_check() -> Result<String, String> {
    Ok("NOVEM Desktop is running".to_string())
}