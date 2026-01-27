from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import pandas as pd
import duckdb
from app.core.config import settings
import numpy as np

router = APIRouter()

class EDARequest(BaseModel):
    dataset_id: str
    options: Optional[Dict[str, Any]] = {}

class EDAResponse(BaseModel):
    dataset_id: str
    summary: Dict[str, Any]
    numeric_stats: Dict[str, Any]
    categorical_stats: Dict[str, Any]
    missing_values: Dict[str, int]
    correlations: Optional[Dict[str, Any]] = None

@router.post("/eda", response_model=EDAResponse)
async def run_eda(request: EDARequest):
    """Run Exploratory Data Analysis"""
    try:
        conn = duckdb.connect(settings.DUCKDB_PATH)
        df = conn.execute(
            f"SELECT * FROM dataset_{request.dataset_id}"
        ).fetchdf()
        conn.close()
        
        # Basic summary
        summary = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "memory_usage_mb": df.memory_usage(deep=True).sum() / (1024 * 1024)
        }
        
        # Numeric statistics
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        numeric_stats = {}
        for col in numeric_cols:
            numeric_stats[col] = {
                "mean": float(df[col].mean()),
                "median": float(df[col].median()),
                "std": float(df[col].std()),
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "q25": float(df[col].quantile(0.25)),
                "q75": float(df[col].quantile(0.75))
            }
        
        # Categorical statistics
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        categorical_stats = {}
        for col in categorical_cols:
            value_counts = df[col].value_counts().head(10)
            categorical_stats[col] = {
                "unique_count": int(df[col].nunique()),
                "top_values": value_counts.to_dict()
            }
        
        # Missing values
        missing_values = df.isnull().sum().to_dict()
        missing_values = {k: int(v) for k, v in missing_values.items()}
        
        # Correlations (only for numeric columns)
        correlations = None
        if len(numeric_cols) > 1:
            corr_matrix = df[numeric_cols].corr()
            correlations = corr_matrix.to_dict()
        
        return EDAResponse(
            dataset_id=request.dataset_id,
            summary=summary,
            numeric_stats=numeric_stats,
            categorical_stats=categorical_stats,
            missing_values=missing_values,
            correlations=correlations
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class StatisticsRequest(BaseModel):
    dataset_id: str
    columns: list[str]
    test_type: str  # 't-test', 'chi-square', 'anova'
    options: Optional[Dict[str, Any]] = {}

@router.post("/statistics")
async def run_statistics(request: StatisticsRequest):
    """Run statistical tests"""
    try:
        conn = duckdb.connect(settings.DUCKDB_PATH)
        df = conn.execute(
            f"SELECT * FROM dataset_{request.dataset_id}"
        ).fetchdf()
        conn.close()
        
        results = {
            "test_type": request.test_type,
            "columns": request.columns,
            "results": {}
        }
        
        if request.test_type == "descriptive":
            for col in request.columns:
                if col in df.columns:
                    results["results"][col] = df[col].describe().to_dict()
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clean")
async def clean_data(
    dataset_id: str,
    operations: list[Dict[str, Any]]
):
    """Apply data cleaning operations"""
    try:
        conn = duckdb.connect(settings.DUCKDB_PATH)
        df = conn.execute(
            f"SELECT * FROM dataset_{dataset_id}"
        ).fetchdf()
        
        # Apply cleaning operations
        for op in operations:
            if op["type"] == "drop_missing":
                df = df.dropna(subset=op.get("columns"))
            elif op["type"] == "fill_missing":
                df = df.fillna(op.get("value"))
            elif op["type"] == "remove_duplicates":
                df = df.drop_duplicates()
        
        # Create new version
        import hashlib
        import time
        new_dataset_id = hashlib.md5(f"{dataset_id}{time.time()}".encode()).hexdigest()
        
        conn.execute(f"CREATE TABLE dataset_{new_dataset_id} AS SELECT * FROM df")
        conn.close()
        
        return {
            "original_dataset_id": dataset_id,
            "new_dataset_id": new_dataset_id,
            "row_count": len(df),
            "operations_applied": len(operations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))