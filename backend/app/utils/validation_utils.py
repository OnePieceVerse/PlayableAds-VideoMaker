"""
验证工具类
"""
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)


def validate_request_data(request, required_fields: List[str]) -> Tuple[bool, str]:
    """
    验证请求数据
    
    Args:
        request: 请求对象
        required_fields: 必需字段列表
        
    Returns:
        tuple: (是否有效, 错误信息)
    """
    for field in required_fields:
        if not hasattr(request, field):
            return False, f"Missing required field: {field}"
        
        value = getattr(request, field)
        if value is None or (isinstance(value, (list, str)) and len(value) == 0):
            return False, f"Field '{field}' cannot be empty"
    
    return True, ""


def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
    """
    验证文件扩展名
    
    Args:
        filename: 文件名
        allowed_extensions: 允许的扩展名列表（包含点号，如['.jpg', '.png']）
        
    Returns:
        bool: 是否为有效扩展名
    """
    if not filename:
        return False
    
    from pathlib import Path
    file_ext = Path(filename).suffix.lower()
    return file_ext in [ext.lower() for ext in allowed_extensions]


def validate_file_size(file_size: int, max_size: int) -> bool:
    """
    验证文件大小
    
    Args:
        file_size: 文件大小（字节）
        max_size: 最大允许大小（字节）
        
    Returns:
        bool: 是否符合大小限制
    """
    return 0 < file_size <= max_size


def validate_project_id(project_id: str) -> bool:
    """
    验证项目ID格式
    
    Args:
        project_id: 项目ID
        
    Returns:
        bool: 是否为有效格式
    """
    if not project_id:
        return False
    
    # 项目ID应该是时间戳-UUID格式，例如：20231201123456-abc12345
    import re
    pattern = r'^\d{14}-[a-f0-9]{8}$'
    return bool(re.match(pattern, project_id))


def validate_url(url: str) -> bool:
    """
    验证URL格式
    
    Args:
        url: URL字符串
        
    Returns:
        bool: 是否为有效URL
    """
    if not url:
        return False
    
    import re
    # 简单的URL验证正则表达式
    url_pattern = r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:\w*))?)?$'
    return bool(re.match(url_pattern, url))


def validate_email(email: str) -> bool:
    """
    验证邮箱格式
    
    Args:
        email: 邮箱地址
        
    Returns:
        bool: 是否为有效邮箱
    """
    if not email:
        return False
    
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_pattern, email))


def validate_range_header(range_header: str) -> Tuple[bool, int, int]:
    """
    验证并解析Range请求头
    
    Args:
        range_header: Range请求头值
        
    Returns:
        tuple: (是否有效, 起始字节, 结束字节)
    """
    try:
        if not range_header or not range_header.startswith("bytes="):
            return False, 0, 0
        
        range_parts = range_header.replace("bytes=", "").split("-")
        if len(range_parts) != 2:
            return False, 0, 0
        
        start_bytes = int(range_parts[0]) if range_parts[0] else 0
        end_bytes = int(range_parts[1]) if range_parts[1] else -1
        
        return True, start_bytes, end_bytes
        
    except (ValueError, IndexError):
        return False, 0, 0
