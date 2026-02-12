import { invoke } from '@tauri-apps/api/core';

class EmbeddedComputeEngine {
  async checkHealth(): Promise<boolean> {
    try {
      return await invoke<boolean>('get_engine_status');
    } catch (error) {
      console.error('Failed to check engine status:', error);
      return false;
    }
  }

  async getWorkspaces(userId: number) {
    return await invoke('get_workspaces', { userId });
  }

  async getProjects(workspaceId: number, userId: number) {
    return await invoke('get_projects', { workspaceId, userId });
  }

  async executePython(code: string): Promise<string> {
    return await invoke<string>('execute_python', { code });
  }

  // DuckDB queries
  async queryDuckDB(sql: string) {
    const pythonCode = `
import duckdb
conn = duckdb.connect('data/analytics.duckdb')
result = conn.execute("""${sql}""").fetchall()
conn.close()
result
`;
    return await this.executePython(pythonCode);
  }
}

export const embeddedEngine = new EmbeddedComputeEngine();