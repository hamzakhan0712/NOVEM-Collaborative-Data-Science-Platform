use tauri::command;
use reqwest;
use std::time::Duration;

#[derive(serde::Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: Option<String>,
    pub timestamp: Option<String>,
    pub database: Option<String>,
}

#[derive(serde::Serialize)]
pub struct SystemResources {
    pub cpu_percent: f32,
    pub memory_percent: f32,
    pub memory_available_gb: f32,
    pub memory_total_gb: f32,
    pub disk_available_gb: f32,
    pub disk_total_gb: f32,
}

// Health check commands
#[command]
pub async fn check_compute_engine_health() -> Result<HealthResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    
    match client.get("http://127.0.0.1:8001/health").send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(data) => Ok(HealthResponse {
                        status: data.get("status").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
                        service: data.get("service").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        timestamp: data.get("timestamp").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        database: data.get("duckdb_connected").and_then(|v| v.as_bool()).map(|b| if b { "connected".to_string() } else { "disconnected".to_string() }),
                    }),
                    Err(e) => Err(format!("Failed to parse response: {}", e)),
                }
            } else {
                Err(format!("Compute engine returned status: {}", response.status()))
            }
        }
        Err(e) => Err(format!("Compute engine unreachable: {}", e)),
    }
}

#[command]
pub async fn check_backend_health() -> Result<HealthResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    
    match client.get("http://localhost:8000/api/health/").send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(data) => Ok(HealthResponse {
                        status: data.get("status").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
                        service: data.get("service").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        timestamp: data.get("timestamp").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        database: data.get("database").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    }),
                    Err(_) => Ok(HealthResponse {
                        status: "healthy".to_string(),
                        service: Some("novem-backend".to_string()),
                        timestamp: None,
                        database: None,
                    }),
                }
            } else {
                Err(format!("Backend returned status: {}", response.status()))
            }
        }
        Err(e) => Err(format!("Backend unreachable: {}", e)),
    }
}

#[command]
pub async fn get_system_resources() -> Result<SystemResources, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))  // Increase timeout to 5 seconds
        .build()
        .map_err(|e| e.to_string())?;
    
    match client.get("http://127.0.0.1:8001/health/system").send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(data) => {
                        let cpu = data.get("cpu").and_then(|v| v.as_object());
                        let memory = data.get("memory").and_then(|v| v.as_object());
                        let disk = data.get("disk").and_then(|v| v.as_object());
                        
                        // Extract CPU percent
                        let cpu_percent = cpu
                            .and_then(|c| c.get("percent"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0) as f32;
                        
                        // Extract memory values
                        let memory_percent = memory
                            .and_then(|m| m.get("percent"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0) as f32;
                        
                        let memory_available_gb = memory
                            .and_then(|m| m.get("available_gb"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0) as f32;
                        
                        let memory_total_gb = memory
                            .and_then(|m| m.get("limit_gb"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0) as f32;
                        
                        // Extract disk values
                        let disk_available_gb = disk
                            .and_then(|d| d.get("available_gb"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0) as f32;
                        
                        let disk_used_gb = disk
                            .and_then(|d| d.get("used_gb"))
                            .and_then(|v| v.as_f64())
                            .unwrap_or(0.0) as f32;
                        
                        let disk_total_gb = disk_used_gb + disk_available_gb;
                        
                        Ok(SystemResources {
                            cpu_percent,
                            memory_percent,
                            memory_available_gb,
                            memory_total_gb,
                            disk_available_gb,
                            disk_total_gb,
                        })
                    }
                    Err(e) => Err(format!("Failed to parse system resources: {}", e)),
                }
            } else {
                Err(format!("System resources returned status: {}", response.status()))
            }
        }
        Err(e) => Err(format!("Failed to get system resources: {}", e)),
    }
}

// Generic compute engine API call
#[command]
pub async fn call_compute_engine(endpoint: String, method: String, data: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    
    let url = format!("http://127.0.0.1:8001{}", endpoint);
    
    let response = match method.to_uppercase().as_str() {
        "GET" => client.get(&url).send().await,
        "POST" => {
            let builder = client.post(&url);
            if let Some(payload) = data {
                builder.json(&payload).send().await
            } else {
                builder.send().await
            }
        }
        "PUT" => {
            let builder = client.put(&url);
            if let Some(payload) = data {
                builder.json(&payload).send().await
            } else {
                builder.send().await
            }
        }
        "DELETE" => client.delete(&url).send().await,
        "PATCH" => {
            let builder = client.patch(&url);
            if let Some(payload) = data {
                builder.json(&payload).send().await
            } else {
                builder.send().await
            }
        }
        _ => return Err(format!("Invalid HTTP method: {}", method)),
    };
    
    match response {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                match resp.json::<serde_json::Value>().await {
                    Ok(json) => Ok(json),
                    Err(e) => Err(format!("Failed to parse response: {}", e)),
                }
            } else {
                match resp.text().await {
                    Ok(text) => Err(format!("Request failed with status {}: {}", status, text)),
                    Err(_) => Err(format!("Request failed with status: {}", status)),
                }
            }
        }
        Err(e) => Err(format!("Request failed: {}", e)),
    }
}

// Simplified health check that returns string
#[command]
pub async fn health_check() -> Result<String, String> {
    match check_compute_engine_health().await {
        Ok(_) => Ok("Healthy".to_string()),
        Err(e) => Err(e),
    }
}

// ...existing code...

// Add this new command
#[command]
pub fn check_compute_engine_path() -> Result<String, String> {
    let paths_to_check = vec![
        std::env::current_dir().ok().map(|d| d.join("compute_engine")),
        std::env::current_dir().ok().and_then(|d| d.parent().map(|p| p.join("compute_engine"))),
        std::env::current_dir().ok().and_then(|d| {
            d.parent().and_then(|p| p.parent().map(|pp| pp.join("compute_engine")))
        }),
    ];

    let mut result = String::from("Compute Engine Path Search:\n");
    
    if let Ok(current) = std::env::current_dir() {
        result.push_str(&format!("Current Dir: {:?}\n\n", current));
    }

    for (i, path) in paths_to_check.iter().enumerate() {
        if let Some(p) = path {
            let exists = p.exists();
            let has_main = p.join("main.py").exists();
            result.push_str(&format!(
                "{}. {:?}\n   Exists: {} | Has main.py: {}\n",
                i + 1,
                p,
                exists,
                has_main
            ));
        }
    }

    Ok(result)
}




