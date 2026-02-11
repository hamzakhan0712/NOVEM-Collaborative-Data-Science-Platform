use std::process::{Command, Stdio};
use tauri::{AppHandle, Manager};
use std::sync::Mutex;
use std::io::{BufRead, BufReader};

static COMPUTE_PROCESS: Mutex<Option<std::process::Child>> = Mutex::new(None);

pub fn start_compute_engine(app: AppHandle) {
    std::thread::spawn(move || {
        #[cfg(target_os = "windows")]
        let python_cmd = "python";
        
        #[cfg(not(target_os = "windows"))]
        let python_cmd = "python3";

        // Get compute engine path - try multiple locations
        let compute_paths = vec![
            // Development mode - go up from novem-desktop to repo root
            std::env::current_dir()
                .ok()
                .and_then(|d| d.parent()?.parent().map(|p| p.join("compute_engine"))),
            
            // Alternative: if current_dir() is already novem-desktop
            std::env::current_dir()
                .ok()
                .and_then(|d| d.parent().map(|p| p.join("compute_engine"))),
            
            // Tauri resource directory (for production builds)
            app.path()
                .resource_dir()
                .ok()
                .map(|d| d.join("compute_engine")),
        ];

        println!("🔍 Searching for compute_engine directory...");
        if let Ok(cwd) = std::env::current_dir() {
            println!("   Current working directory: {:?}", cwd);
        }

        let mut compute_engine_path = None;
        for (i, path) in compute_paths.iter().enumerate() {
            if let Some(p) = path {
                println!("   [{}] Checking: {:?}", i + 1, p);
                if p.exists() && p.join("main.py").exists() {
                    println!("   ✅ Found compute_engine at: {:?}", p);
                    compute_engine_path = Some(p.clone());
                    break;
                }
            }
        }

        let compute_engine_path = match compute_engine_path {
            Some(path) => path,
            None => {
                eprintln!("❌ Could not find compute_engine directory");
                eprintln!("   Searched locations:");
                for (i, path) in compute_paths.iter().enumerate() {
                    if let Some(p) = path {
                        eprintln!("   [{}] {:?} - Exists: {}", i + 1, p, p.exists());
                    }
                }
                return;
            }
        };

        let main_py = compute_engine_path.join("main.py");

        if !main_py.exists() {
            eprintln!("❌ main.py not found at: {:?}", main_py);
            return;
        }

        println!("🚀 Starting FastAPI compute engine...");
        println!("   Path: {:?}", main_py);
        println!("   Working dir: {:?}", compute_engine_path);

        match Command::new(python_cmd)
            .arg(main_py)
            .current_dir(&compute_engine_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(mut child) => {
                println!("✅ Compute engine started with PID: {}", child.id());
                
                // Read stdout in a separate thread
                if let Some(stdout) = child.stdout.take() {
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stdout);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                println!("[FastAPI] {}", line);
                            }
                        }
                    });
                }

                // Read stderr in a separate thread
                if let Some(stderr) = child.stderr.take() {
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stderr);
                        for line in reader.lines() {
                            if let Ok(line) = line {
                                eprintln!("[FastAPI] {}", line);
                            }
                        }
                    });
                }

                *COMPUTE_PROCESS.lock().unwrap() = Some(child);
            }
            Err(e) => {
                eprintln!("❌ Failed to start compute engine: {}", e);
                eprintln!("   Make sure Python is installed and accessible");
                eprintln!("   Try running: python main.py --version");
            }
        }
    });
}

pub fn stop_compute_engine() {
    if let Some(mut child) = COMPUTE_PROCESS.lock().unwrap().take() {
        println!("🛑 Stopping compute engine...");
        let _ = child.kill();
        println!("✅ Compute engine stopped");
    }
}