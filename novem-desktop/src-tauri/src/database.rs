use anyhow::{Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: i64,
    pub uuid: String,
    pub name: String,
    pub description: Option<String>,
    pub owner_id: i64,
    pub created_at: String,
    pub updated_at: String,
    pub is_active: bool,
    pub sync_status: String, // 'synced', 'pending', 'conflict'
    pub last_synced_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: i64,
    pub uuid: String,
    pub workspace_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub owner_id: i64,
    pub created_at: String,
    pub updated_at: String,
    pub is_active: bool,
    pub sync_status: String,
    pub last_synced_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub uuid: String,
    pub email: String,
    pub username: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub is_active: bool,
    pub last_login: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncQueue {
    pub id: i64,
    pub entity_type: String, // 'workspace', 'project', 'member', etc.
    pub entity_uuid: String,
    pub action: String, // 'create', 'update', 'delete'
    pub payload: String, // JSON
    pub status: String, // 'pending', 'processing', 'completed', 'failed'
    pub retry_count: i64,
    pub created_at: String,
    pub updated_at: String,
    pub error_message: Option<String>,
}

pub struct LocalDatabase {
    conn: Connection,
}

impl LocalDatabase {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(&db_path)
            .context(format!("Failed to open database at {:?}", db_path))?;

        let db = LocalDatabase { conn };
        db.initialize_schema()?;
        
        Ok(db)
    }

    fn initialize_schema(&self) -> Result<()> {
        // Users table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                uuid TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL UNIQUE,
                first_name TEXT,
                last_name TEXT,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                last_login TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Workspaces table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS workspaces (
                id INTEGER PRIMARY KEY,
                uuid TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                description TEXT,
                owner_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                sync_status TEXT NOT NULL DEFAULT 'pending',
                last_synced_at TEXT,
                FOREIGN KEY (owner_id) REFERENCES users(id)
            )",
            [],
        )?;

        // Projects table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY,
                uuid TEXT NOT NULL UNIQUE,
                workspace_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                owner_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                sync_status TEXT NOT NULL DEFAULT 'pending',
                last_synced_at TEXT,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
                FOREIGN KEY (owner_id) REFERENCES users(id)
            )",
            [],
        )?;

        // Sync queue table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                entity_uuid TEXT NOT NULL,
                action TEXT NOT NULL,
                payload TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                retry_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                error_message TEXT
            )",
            [],
        )?;

        // Create indexes
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)",
            [],
        )?;

        Ok(())
    }

    // User operations
    pub fn upsert_user(&self, user: &User) -> Result<()> {
        self.conn.execute(
            "INSERT INTO users (id, uuid, email, username, first_name, last_name, is_active, last_login, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(uuid) DO UPDATE SET
                email = excluded.email,
                username = excluded.username,
                first_name = excluded.first_name,
                last_name = excluded.last_name,
                is_active = excluded.is_active,
                last_login = excluded.last_login",
            params![
                user.id,
                &user.uuid,
                &user.email,
                &user.username,
                &user.first_name,
                &user.last_name,
                user.is_active,
                &user.last_login,
                &user.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_user_by_id(&self, user_id: i64) -> Result<Option<User>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, uuid, email, username, first_name, last_name, is_active, last_login, created_at
             FROM users WHERE id = ?1"
        )?;

        let user = stmt.query_row(params![user_id], |row| {
            Ok(User {
                id: row.get(0)?,
                uuid: row.get(1)?,
                email: row.get(2)?,
                username: row.get(3)?,
                first_name: row.get(4)?,
                last_name: row.get(5)?,
                is_active: row.get(6)?,
                last_login: row.get(7)?,
                created_at: row.get(8)?,
            })
        }).optional()?;

        Ok(user)
    }

    // Workspace operations
    pub fn get_workspaces(&self, user_id: i64) -> Result<Vec<Workspace>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, uuid, name, description, owner_id, created_at, updated_at, 
                    is_active, sync_status, last_synced_at
             FROM workspaces 
             WHERE owner_id = ?1 AND is_active = 1
             ORDER BY updated_at DESC"
        )?;

        let workspaces = stmt
            .query_map(params![user_id], |row| {
                Ok(Workspace {
                    id: row.get(0)?,
                    uuid: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    owner_id: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                    is_active: row.get(7)?,
                    sync_status: row.get(8)?,
                    last_synced_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(workspaces)
    }

    pub fn upsert_workspace(&self, workspace: &Workspace) -> Result<()> {
        self.conn.execute(
            "INSERT INTO workspaces (id, uuid, name, description, owner_id, created_at, updated_at, is_active, sync_status, last_synced_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(uuid) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                updated_at = excluded.updated_at,
                is_active = excluded.is_active,
                sync_status = excluded.sync_status,
                last_synced_at = excluded.last_synced_at",
            params![
                workspace.id,
                &workspace.uuid,
                &workspace.name,
                &workspace.description,
                workspace.owner_id,
                &workspace.created_at,
                &workspace.updated_at,
                workspace.is_active,
                &workspace.sync_status,
                &workspace.last_synced_at,
            ],
        )?;
        Ok(())
    }

    // Project operations
    pub fn get_projects(&self, workspace_id: i64, user_id: i64) -> Result<Vec<Project>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, uuid, workspace_id, name, description, owner_id, 
                    created_at, updated_at, is_active, sync_status, last_synced_at
             FROM projects 
             WHERE workspace_id = ?1 AND owner_id = ?2 AND is_active = 1
             ORDER BY updated_at DESC"
        )?;

        let projects = stmt
            .query_map(params![workspace_id, user_id], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    uuid: row.get(1)?,
                    workspace_id: row.get(2)?,
                    name: row.get(3)?,
                    description: row.get(4)?,
                    owner_id: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    is_active: row.get(8)?,
                    sync_status: row.get(9)?,
                    last_synced_at: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(projects)
    }

    pub fn upsert_project(&self, project: &Project) -> Result<()> {
        self.conn.execute(
            "INSERT INTO projects (id, uuid, workspace_id, name, description, owner_id, created_at, updated_at, is_active, sync_status, last_synced_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(uuid) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                updated_at = excluded.updated_at,
                is_active = excluded.is_active,
                sync_status = excluded.sync_status,
                last_synced_at = excluded.last_synced_at",
            params![
                project.id,
                &project.uuid,
                project.workspace_id,
                &project.name,
                &project.description,
                project.owner_id,
                &project.created_at,
                &project.updated_at,
                project.is_active,
                &project.sync_status,
                &project.last_synced_at,
            ],
        )?;
        Ok(())
    }

    // Sync queue operations
    pub fn add_to_sync_queue(&self, entity_type: &str, entity_uuid: &str, action: &str, payload: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO sync_queue (entity_type, entity_uuid, action, payload, status)
             VALUES (?1, ?2, ?3, ?4, 'pending')",
            params![entity_type, entity_uuid, action, payload],
        )?;
        Ok(())
    }

    pub fn get_pending_sync_items(&self) -> Result<Vec<SyncQueue>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, entity_type, entity_uuid, action, payload, status, retry_count, 
                    created_at, updated_at, error_message
             FROM sync_queue 
             WHERE status = 'pending'
             ORDER BY created_at ASC
             LIMIT 100"
        )?;

        let items = stmt
            .query_map([], |row| {
                Ok(SyncQueue {
                    id: row.get(0)?,
                    entity_type: row.get(1)?,
                    entity_uuid: row.get(2)?,
                    action: row.get(3)?,
                    payload: row.get(4)?,
                    status: row.get(5)?,
                    retry_count: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                    error_message: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    }

    pub fn update_sync_item_status(&self, id: i64, status: &str, error: Option<&str>) -> Result<()> {
        self.conn.execute(
            "UPDATE sync_queue 
             SET status = ?1, error_message = ?2, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?3",
            params![status, error, id],
        )?;
        Ok(())
    }

    pub fn increment_sync_retry(&self, id: i64) -> Result<()> {
        self.conn.execute(
            "UPDATE sync_queue 
             SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn clear_completed_sync_items(&self) -> Result<usize> {
        let count = self.conn.execute(
            "DELETE FROM sync_queue WHERE status = 'completed' AND updated_at < datetime('now', '-7 days')",
            [],
        )?;
        Ok(count)
    }
}

impl Drop for LocalDatabase {
    fn drop(&mut self) {
        // Connection will be closed automatically when dropped
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_database_creation() {
        let temp_dir = std::env::temp_dir();
        let db_path = temp_dir.join("test_novem.db");
        
        let db = LocalDatabase::new(db_path.clone()).unwrap();
        
        // Verify tables exist
        let table_count: i64 = db.conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        
        assert!(table_count >= 4); // users, workspaces, projects, sync_queue
        
        // Cleanup
        std::fs::remove_file(db_path).ok();
    }
}