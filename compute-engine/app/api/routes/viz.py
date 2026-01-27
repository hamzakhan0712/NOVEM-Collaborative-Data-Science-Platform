from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import pandas as pd
import duckdb
from app.core.config import settings

router = APIRouter()

class ChartRequest(BaseModel):
    dataset_id: str
    chart_type: str  # 'bar', 'line', 'scatter', 'histogram', 'heatmap'
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    group_by: Optional[str] = None
    options: Optional[Dict[str, Any]] = {}

@router.post("/chart")
async def generate_chart_data(request: ChartRequest):
    """Generate data for charts"""
    try:
        conn = duckdb.connect(settings.DUCKDB_PATH)
        df = conn.execute(
            f"SELECT * FROM dataset_{request.dataset_id}"
        ).fetchdf()
        conn.close()
        
        chart_data = {}
        
        if request.chart_type == 'bar':
            if request.x_column and request.y_column:
                data = df.groupby(request.x_column)[request.y_column].sum().to_dict()
                chart_data = {
                    "labels": list(data.keys()),
                    "values": list(data.values())
                }
        
        elif request.chart_type == 'histogram':
            if request.x_column:
                hist_data = df[request.x_column].value_counts().sort_index()
                chart_data = {
                    "bins": hist_data.index.tolist(),
                    "counts": hist_data.values.tolist()
                }
        
        elif request.chart_type == 'scatter':
            if request.x_column and request.y_column:
                chart_data = {
                    "x": df[request.x_column].tolist(),
                    "y": df[request.y_column].tolist()
                }
        
        elif request.chart_type == 'line':
            if request.x_column and request.y_column:
                chart_data = {
                    "x": df[request.x_column].tolist(),
                    "y": df[request.y_column].tolist()
                }
        
        return {
            "chart_type": request.chart_type,
            "data": chart_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dashboard")
async def create_dashboard(
    dataset_id: str,
    charts: List[ChartRequest]
):
    """Create a dashboard with multiple charts"""
    try:
        dashboard_data = []
        
        for chart in charts:
            chart_result = await generate_chart_data(chart)
            dashboard_data.append(chart_result)
        
        return {
            "dataset_id": dataset_id,
            "charts": dashboard_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))