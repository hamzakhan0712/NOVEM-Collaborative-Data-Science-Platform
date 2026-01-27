from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import pandas as pd
import duckdb
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, mean_squared_error, r2_score
from app.core.config import settings
import joblib
from pathlib import Path

router = APIRouter()

class TrainRequest(BaseModel):
    dataset_id: str
    target_column: str
    feature_columns: List[str]
    model_type: str  # 'classification' or 'regression'
    algorithm: str = 'random_forest'
    test_size: float = 0.2
    hyperparameters: Optional[Dict[str, Any]] = {}

class TrainResponse(BaseModel):
    model_id: str
    model_type: str
    algorithm: str
    metrics: Dict[str, float]
    feature_importance: Dict[str, float]

@router.post("/train", response_model=TrainResponse)
async def train_model(request: TrainRequest):
    """Train a machine learning model"""
    try:
        # Load data
        conn = duckdb.connect(settings.DUCKDB_PATH)
        df = conn.execute(
            f"SELECT * FROM dataset_{request.dataset_id}"
        ).fetchdf()
        conn.close()
        
        # Prepare features and target
        X = df[request.feature_columns]
        y = df[request.target_column]
        
        # Handle categorical variables
        X = pd.get_dummies(X, drop_first=True)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=request.test_size, random_state=42
        )
        
        # Select and train model
        if request.model_type == 'classification':
            model = RandomForestClassifier(**request.hyperparameters)
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            
            metrics = {
                "accuracy": float(accuracy_score(y_test, y_pred)),
                "train_samples": len(X_train),
                "test_samples": len(X_test)
            }
        else:  # regression
            model = RandomForestRegressor(**request.hyperparameters)
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            
            metrics = {
                "rmse": float(mean_squared_error(y_test, y_pred, squared=False)),
                "r2": float(r2_score(y_test, y_pred)),
                "train_samples": len(X_train),
                "test_samples": len(X_test)
            }
        
        # Feature importance
        feature_importance = dict(zip(
            X.columns,
            model.feature_importances_.tolist()
        ))
        
        # Save model
        import hashlib
        import time
        model_id = hashlib.md5(f"{request.dataset_id}{time.time()}".encode()).hexdigest()
        
        model_path = Path(settings.DATA_DIR) / "models" / f"{model_id}.joblib"
        model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, model_path)
        
        return TrainResponse(
            model_id=model_id,
            model_type=request.model_type,
            algorithm=request.algorithm,
            metrics=metrics,
            feature_importance=feature_importance
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PredictRequest(BaseModel):
    model_id: str
    data: List[Dict[str, Any]]

@router.post("/predict")
async def predict(request: PredictRequest):
    """Make predictions using a trained model"""
    try:
        # Load model
        model_path = Path(settings.DATA_DIR) / "models" / f"{request.model_id}.joblib"
        model = joblib.load(model_path)
        
        # Prepare data
        df = pd.DataFrame(request.data)
        df = pd.get_dummies(df, drop_first=True)
        
        # Make predictions
        predictions = model.predict(df)
        
        return {
            "predictions": predictions.tolist()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def list_models():
    """List all trained models"""
    try:
        models_dir = Path(settings.DATA_DIR) / "models"
        if not models_dir.exists():
            return []
        
        models = []
        for model_file in models_dir.glob("*.joblib"):
            models.append({
                "model_id": model_file.stem,
                "created_at": model_file.stat().st_ctime
            })
        
        return models
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))