"""
ID生成工具类
"""
import uuid
from datetime import datetime


def generate_uuid() -> str:
    """生成UUID字符串"""
    return str(uuid.uuid4())


def generate_short_uuid() -> str:
    """生成短UUID（8位）"""
    return str(uuid.uuid4())[:8]


def generate_timestamped_id(prefix: str = "") -> str:
    """
    生成带时间戳的ID
    
    Args:
        prefix: ID前缀
        
    Returns:
        str: 格式化的ID
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    short_uuid = generate_short_uuid()
    
    if prefix:
        return f"{prefix}-{timestamp}-{short_uuid}"
    return f"{timestamp}-{short_uuid}"


def generate_project_id() -> str:
    """生成项目ID"""
    return generate_timestamped_id()


def generate_file_id() -> str:
    """生成文件ID"""
    return generate_uuid()
