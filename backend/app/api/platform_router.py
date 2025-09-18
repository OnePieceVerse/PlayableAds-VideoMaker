"""
Platform API - 提供平台相关的API接口
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pathlib import Path

from backend.app.utils.file_utils import format_file_size
from backend.app.config import PROJECTS_DIR
from fastapi.responses import JSONResponse
from backend.app.services.upload_service import UploadService
from backend.app.utils.response_utils import error_response

router = APIRouter()

@router.post("/create-project")
async def create_project():
    """
    创建新的项目ID
    
    返回:
    - project_id: 项目唯一标识符
    """
    try:
        return UploadService.create_new_project()
    except Exception as e:
        return error_response(str(e))

@router.get("/project-files-info")
async def get_project_files_info(project_id: str):
    """
    获取项目文件信息API
    
    返回项目中所有文件的大小信息，以及预估生成HTML的大小
    
    - **project_id**: 项目ID
    """
    try:
        project_dir = PROJECTS_DIR / project_id
        
        if not project_dir.exists():
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": f"Project directory not found: {project_id}"}
            )
        
        # 收集文件信息
        video_files = []
        image_files = []
        other_files = []
        
        for file_path in project_dir.iterdir():
            if not file_path.is_file():
                continue
                
            file_info = {
                "name": file_path.name,
                "size": file_path.stat().st_size,
                "human_size": format_file_size(file_path.stat().st_size)
            }
            
            if file_path.suffix.lower() in ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv']:
                video_files.append(file_info)
            elif file_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']:
                image_files.append(file_info)
            else:
                other_files.append(file_info)
        
        # 计算预估HTML大小
        total_video_size = sum(file["size"] for file in video_files)
        total_image_size = sum(file["size"] for file in image_files)
        
        # 预估HTML大小：视频大小*1.3 + 图片大小*1.3 + 50KB基础大小
        estimated_html_size = int((total_video_size + total_image_size) * 1.3 + 50 * 1024)
        
        return {
            "success": True,
            "project_id": project_id,
            "video_files": video_files,
            "image_files": image_files,
            "other_files": other_files,
            "total_video_size": total_video_size,
            "total_image_size": total_image_size,
            "human_total_video_size": format_file_size(total_video_size),
            "human_total_image_size": format_file_size(total_image_size),
            "estimated_html_size": estimated_html_size,
            "human_estimated_html_size": format_file_size(estimated_html_size)
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
