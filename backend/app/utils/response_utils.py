"""
响应处理工具类
"""
from typing import Dict, Any, Optional
from fastapi.responses import JSONResponse


def success_response(data: Dict[str, Any] = None, message: str = "Success") -> Dict[str, Any]:
    """
    创建成功响应
    
    Args:
        data: 响应数据
        message: 响应消息
        
    Returns:
        dict: 成功响应格式
    """
    response = {
        "success": True,
        "message": message
    }
    
    if data:
        response.update(data)
    
    return response


def error_response(error: str, status_code: int = 500, details: Dict[str, Any] = None) -> JSONResponse:
    """
    创建错误响应
    
    Args:
        error: 错误信息
        status_code: HTTP状态码
        details: 额外的错误详情
        
    Returns:
        JSONResponse: 错误响应
    """
    content = {
        "success": False,
        "error": error
    }
    
    if details:
        content["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=content
    )


def validation_error_response(field: str, message: str) -> JSONResponse:
    """
    创建验证错误响应
    
    Args:
        field: 验证失败的字段
        message: 错误消息
        
    Returns:
        JSONResponse: 验证错误响应
    """
    return error_response(
        error=f"Validation error in field '{field}': {message}",
        status_code=400,
        details={"field": field, "message": message}
    )


def not_found_response(resource: str) -> JSONResponse:
    """
    创建资源未找到响应
    
    Args:
        resource: 资源名称
        
    Returns:
        JSONResponse: 404响应
    """
    return error_response(
        error=f"{resource} not found",
        status_code=404
    )
