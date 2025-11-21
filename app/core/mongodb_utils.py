"""
MongoDB utility functions for safe ObjectId handling
This provides root cause fixes for ObjectId conversion issues
"""
from bson import ObjectId
from bson.errors import InvalidId
from typing import Any, List, Optional, Union


def safe_objectid(value: Any) -> Optional[ObjectId]:
    """
    Safely convert a value to ObjectId.
    Returns None if the value cannot be converted to a valid ObjectId.
    
    Args:
        value: Can be ObjectId, string, or None
        
    Returns:
        ObjectId if valid, None otherwise
    """
    if value is None:
        return None
    
    # If already an ObjectId, return as-is
    if isinstance(value, ObjectId):
        return value
    
    # If it's a string, try to convert
    if isinstance(value, str):
        # Check if it's a valid ObjectId format (24 hex characters)
        if len(value) == 24:
            try:
                return ObjectId(value)
            except (InvalidId, ValueError, TypeError):
                return None
        else:
            return None
    
    return None


def safe_objectid_list(values: List[Any]) -> List[ObjectId]:
    """
    Safely convert a list of values to ObjectIds.
    Filters out invalid values.
    
    Args:
        values: List of values that might be ObjectIds
        
    Returns:
        List of valid ObjectIds only
    """
    result = []
    for value in values:
        obj_id = safe_objectid(value)
        if obj_id is not None:
            result.append(obj_id)
    return result


def is_valid_objectid(value: Any) -> bool:
    """
    Check if a value is a valid ObjectId (either ObjectId instance or valid string).
    
    Args:
        value: Value to check
        
    Returns:
        True if valid ObjectId, False otherwise
    """
    return safe_objectid(value) is not None

