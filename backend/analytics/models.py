from django.db import models
from django.conf import settings
from projects.models import Project

class Dataset(models.Model):
    """Dataset metadata (not the actual data)"""
    
    class DataType(models.TextChoices):
        CSV = 'csv', 'CSV'
        EXCEL = 'excel', 'Excel'
        CONNECTOR = 'connector', 'Connector'
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='datasets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    data_type = models.CharField(max_length=20, choices=DataType.choices)
    
    # Metadata only
    row_count = models.IntegerField(null=True, blank=True)
    column_count = models.IntegerField(null=True, blank=True)
    schema = models.JSONField(default=dict, blank=True)
    fingerprint = models.CharField(max_length=64)  # Hash of data
    
    # Version control
    version = models.IntegerField(default=1)
    parent_version = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} v{self.version}"

class AnalysisRun(models.Model):
    """Analysis execution metadata"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RUNNING = 'running', 'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'
    
    class AnalysisType(models.TextChoices):
        EDA = 'eda', 'Exploratory Data Analysis'
        STATS = 'stats', 'Statistical Analysis'
        ML = 'ml', 'Machine Learning'
        FORECAST = 'forecast', 'Forecasting'
        CLUSTERING = 'clustering', 'Clustering'
        CUSTOM = 'custom', 'Custom'
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='analysis_runs')
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='analysis_runs')
    name = models.CharField(max_length=255)
    analysis_type = models.CharField(max_length=20, choices=AnalysisType.choices)
    
    # Execution details
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    parameters = models.JSONField(default=dict)
    
    # Results metadata
    result_summary = models.JSONField(default=dict, blank=True)
    result_fingerprint = models.CharField(max_length=64, blank=True)
    
    # Reproducibility
    environment = models.JSONField(default=dict, blank=True)  # Python version, library versions
    
    # Resource usage
    estimated_memory_mb = models.IntegerField(null=True, blank=True)
    actual_memory_mb = models.IntegerField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} - {self.status}"

class Model(models.Model):
    """Machine learning model metadata"""
    
    class ModelType(models.TextChoices):
        CLASSIFICATION = 'classification', 'Classification'
        REGRESSION = 'regression', 'Regression'
        CLUSTERING = 'clustering', 'Clustering'
        FORECASTING = 'forecasting', 'Forecasting'
    
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='models')
    analysis_run = models.ForeignKey(AnalysisRun, on_delete=models.CASCADE, related_name='models')
    name = models.CharField(max_length=255)
    model_type = models.CharField(max_length=20, choices=ModelType.choices)
    algorithm = models.CharField(max_length=100)
    
    # Model metadata
    hyperparameters = models.JSONField(default=dict)
    metrics = models.JSONField(default=dict)
    feature_importance = models.JSONField(default=dict, blank=True)
    
    # Lineage
    training_dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='trained_models')
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.algorithm})"