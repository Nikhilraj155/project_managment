"""
Custom JSON encoder for FastAPI that handles MongoDB ObjectId and other non-serializable types
This is a root cause fix that automatically handles ObjectId serialization globally
"""
from bson import ObjectId
from datetime import datetime, date
from typing import Any
import fastapi.encoders


def _convert_objectid_recursive(obj: Any) -> Any:
    """
    Recursively convert ObjectId and datetime objects to JSON-serializable types
    """
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {key: _convert_objectid_recursive(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [_convert_objectid_recursive(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        # For custom objects with __dict__, convert recursively
        return _convert_objectid_recursive(obj.__dict__)
    else:
        return obj


def jsonable_encoder(obj: Any, **kwargs) -> Any:
    """
    Custom JSON encoder that handles MongoDB ObjectId and datetime objects
    This replaces FastAPI's default jsonable_encoder globally
    """
    # First, convert all ObjectId objects recursively
    converted_obj = _convert_objectid_recursive(obj)
    
    # Then use FastAPI's original encoder for other types (Pydantic models, etc.)
    try:
        return fastapi.encoders._original_jsonable_encoder(converted_obj, **kwargs)
    except (TypeError, ValueError, AttributeError):
        # If the original encoder fails, return the converted object
        # This handles edge cases where FastAPI's encoder can't process the object
        return converted_obj


# Store the original encoder before we override it
if not hasattr(fastapi.encoders, '_original_jsonable_encoder'):
    fastapi.encoders._original_jsonable_encoder = fastapi.encoders.jsonable_encoder

# Override FastAPI's jsonable_encoder globally
fastapi.encoders.jsonable_encoder = jsonable_encoder

