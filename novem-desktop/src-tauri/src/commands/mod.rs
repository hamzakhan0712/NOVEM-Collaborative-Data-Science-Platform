use tauri::command;

#[command]
pub async fn call_compute_engine(endpoint: String, method: String, data: serde_json::Value) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let url = format!("http://127.0.0.1:8765{}", endpoint);
    
    let response = match method.as_str() {
        "GET" => client.get(&url).send().await,
        "POST" => client.post(&url).json(&data).send().await,
        "PUT" => client.put(&url).json(&data).send().await,
        "DELETE" => client.delete(&url).send().await,
        _ => return Err("Invalid HTTP method".to_string()),
    };
    
    match response {
        Ok(resp) => {
            match resp.json::<serde_json::Value>().await {
                Ok(json) => Ok(json),
                Err(e) => Err(format!("Failed to parse response: {}", e)),
            }
        }
        Err(e) => Err(format!("Request failed: {}", e)),
    }
}

#[command]
pub async fn health_check() -> Result<String, String> {
    let client = reqwest::Client::new();
    
    match client.get("http://127.0.0.1:8765/health").send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok("Healthy".to_string())
            } else {
                Err(format!("Health check failed with status: {}", resp.status()))
            }
        }
        Err(e) => Err(format!("Health check failed: {}", e)),
    }
}