use anyhow::{Context, Result};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use reqwest::blocking::Client;

pub struct EmbeddedPythonEngine {
    process: Arc<Mutex<Option<Child>>>,
    port: u16,
    compute_engine_path: Option<PathBuf>,
}

impl EmbeddedPythonEngine {
    pub fn new() -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            port: 8765,
            compute_engine_path: None,
        }
    }

    fn find_python_executable(&self, compute_engine_dir: &PathBuf) -> Result<PathBuf> {
        // Try to find virtual environment Python first
        let venv_paths = vec![
            compute_engine_dir.join(".venv").join("Scripts").join("python.exe"), // Windows
            compute_engine_dir.join(".venv").join("bin").join("python"), // Unix
            compute_engine_dir.join("venv").join("Scripts").join("python.exe"), // Windows alt
            compute_engine_dir.join("venv").join("bin").join("python"), // Unix alt
        ];

        for venv_python in venv_paths {
            if venv_python.exists() {
                println!("[NOVEM] Found virtual environment Python: {:?}", venv_python);
                return Ok(venv_python);
            }
        }

        // Fallback to system Python
        let system_python = if cfg!(windows) {
            PathBuf::from("python")
        } else {
            PathBuf::from("python3")
        };

        println!("[NOVEM] Using system Python: {:?}", system_python);
        println!("[WARNING] Virtual environment not found. Make sure dependencies are installed.");
        
        Ok(system_python)
    }

    pub fn start_fastapi_server(&mut self, compute_engine_dir: PathBuf) -> Result<()> {
        println!("[NOVEM] Starting embedded FastAPI server...");
        
        self.compute_engine_path = Some(compute_engine_dir.clone());
        
        let main_py = compute_engine_dir.join("main.py");
        if !main_py.exists() {
            return Err(anyhow::anyhow!(
                "main.py not found at {:?}",
                main_py
            ));
        }

        // Find appropriate Python executable
        let python_exe = self.find_python_executable(&compute_engine_dir)?;

        println!("[NOVEM] Working directory: {:?}", compute_engine_dir);
        println!("[NOVEM] Python executable: {:?}", python_exe);
        println!("[NOVEM] Command: {:?} -m uvicorn main:app --host 127.0.0.1 --port {}", 
                 python_exe, self.port);

        let child = Command::new(&python_exe)
            .arg("-m")
            .arg("uvicorn")
            .arg("main:app")
            .arg("--host")
            .arg("127.0.0.1")
            .arg("--port")
            .arg(self.port.to_string())
            .arg("--log-level")
            .arg("info")
            .current_dir(&compute_engine_dir)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()
            .context(format!("Failed to spawn FastAPI process using {:?}", python_exe))?;

        println!("[NOVEM] FastAPI process spawned (PID: {:?})", child.id());
        
        let mut process_lock = self.process.lock().unwrap();
        *process_lock = Some(child);
        drop(process_lock);

        let start_time = std::time::Instant::now();
        let timeout = Duration::from_secs(30);
        
        println!("[NOVEM] Waiting for FastAPI to be ready at http://127.0.0.1:{}/health", self.port);
        
        let mut retry_count = 0;
        loop {
            if start_time.elapsed() > timeout {
                return Err(anyhow::anyhow!(
                    "FastAPI server failed to start within 30 seconds. Check logs above for errors."
                ));
            }

            match self.check_health() {
                Ok(true) => {
                    println!("[NOVEM] FastAPI server is ready!");
                    println!("[NOVEM] Health check passed after {} attempts", retry_count + 1);
                    return Ok(());
                }
                Ok(false) => {
                    retry_count += 1;
                    if retry_count % 10 == 0 {
                        println!("[NOVEM] Still waiting... (attempt {})", retry_count);
                    }
                }
                Err(e) => {
                    retry_count += 1;
                    if retry_count == 1 {
                        println!("[NOVEM] Waiting for server to start... ({})", e);
                    }
                }
            }
            
            std::thread::sleep(Duration::from_millis(1000));
        }
    }

    pub fn check_health(&self) -> Result<bool> {
        let client = Client::builder()
            .timeout(Duration::from_secs(2))
            .build()?;

        let url = format!("http://127.0.0.1:{}/health", self.port);
        
        match client.get(&url).send() {
            Ok(response) => {
                Ok(response.status().is_success())
            }
            Err(_) => Ok(false),
        }
    }

    pub fn get_port(&self) -> u16 {
        self.port
    }

    pub fn restart(&mut self) -> Result<()> {
        println!("[NOVEM] Restarting FastAPI server...");
        
        self.stop()?;
        std::thread::sleep(Duration::from_secs(2));
        
        if let Some(path) = self.compute_engine_path.clone() {
            self.start_fastapi_server(path)?;
        } else {
            return Err(anyhow::anyhow!("Cannot restart: compute engine path not set"));
        }
        
        Ok(())
    }

    pub fn stop(&mut self) -> Result<()> {
        println!("[NOVEM] Stopping FastAPI server...");
        
        let mut process_lock = self.process.lock().unwrap();
        
        if let Some(mut child) = process_lock.take() {
            child.kill().context("Failed to kill FastAPI process")?;
            child.wait().context("Failed to wait for FastAPI process")?;
            println!("[NOVEM] FastAPI server stopped");
        }
        
        Ok(())
    }
}

impl Drop for EmbeddedPythonEngine {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}