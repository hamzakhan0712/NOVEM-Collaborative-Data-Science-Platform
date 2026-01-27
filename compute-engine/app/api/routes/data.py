from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
import pandas as pd
import duckdb
from pathlib import Path
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter()

class ImportResponse(BaseModel):
    dataset_id: str
    name: str
    row_count: int
    column_count: int
    schema: dict
    fingerprint: str

class DatasetInfo(BaseModel):
    dataset_id: str
    name: str
    row_count: int
    columns: list

@router.post("/import", response_model=ImportResponse)
async def import_data(
    file: UploadFile = File(...),
    dataset_name: Optional[str] = None
):
    """Import CSV or Excel file"""
    try:
        # Determine file type
        file_ext = Path(file.filename).suffix.lower()
        
        # Read file based on type
        if file_ext == '.csv':
            df = pd.read_csv(file.file)
        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file.file)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Generate dataset ID
        import hashlib
        import time
        dataset_id = hashlib.md5(f"{file.filename}{time.time()}".encode()).hexdigest()
        
        # Store in DuckDB
        conn = duckdb.connect(settings.DUCKDB_PATH)
        conn.execute(f"CREATE TABLE IF NOT EXISTS dataset_{dataset_id} AS SELECT * FROM df")
        
        # Calculate fingerprint
        fingerprint = hashlib.md5(df.to_csv(index=False).encode()).hexdigest()
        
        # Get schema
        schema = {col: str(dtype) for col, dtype in df.dtypes.items()}
        
        conn.close()
        
        return ImportResponse(
            dataset_id=dataset_id,
            name=dataset_name or file.filename,
            row_count=len(df),
            column_count=len(df.columns),
            schema=schema,
            fingerprint=fingerprint
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/datasets", response_model=list[DatasetInfo])
async def list_datasets():
    """List all imported datasets"""
    try:
        conn = duckdb.connect(settings.DUCKDB_PATH)
        tables = conn.execute("SHOW TABLES").fetchall()
        
        datasets = []
        for table in tables:
            table_name = table[0]
            if table_name.startswith('dataset_'):
                dataset_id = table_name.replace('dataset_', '')
                result = conn.execute(f"SELECT COUNT(*) as count FROM {table_name}").fetchone()
                columns = conn.execute(f"DESCRIBE {table_name}").fetchall()
                
                datasets.append(DatasetInfo(
                    dataset_id=dataset_id,
                    name=table_name,
                    row_count=result[0],
                    columns=[col[0] for col in columns]
                ))
        
        conn.close()
        return datasets
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/datasets/{dataset_id}/preview")
async def preview_dataset(dataset_id: str, limit: int = 100):
    """Get preview of dataset"""
    try:
        conn = duckdb.connect(settings.DUCKDB_PATH)
        result = conn.execute(
            f"SELECT * FROM dataset_{dataset_id} LIMIT {limit}"
        ).fetchdf()
        conn.close()
        
        return {
            "data": result.to_dict(orient='records'),
            "columns": result.columns.tolist()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Delete a dataset"""
    try:
        conn = duckdb.connect(settings.DUCKDB_PATH)
        conn.execute(f"DROP TABLE IF EXISTS dataset_{dataset_id}")
        conn.close()
        
        return {"message": "Dataset deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))