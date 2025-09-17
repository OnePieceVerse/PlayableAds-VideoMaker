"""
Platform API - 提供平台相关的API接口
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pathlib import Path

from backend.app.models.schemas import Platform
from backend.app.services.platform_service import (
    PlatformService,
    GooglePlatformService,
    FacebookPlatformService,
    TikTokPlatformService,
    AppLovinPlatformService,
    MolocoPlatformService
)
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

@router.get("/platforms")
async def get_supported_platforms():
    """获取支持的平台列表"""
    platforms = []
    for platform in Platform:
        platforms.append({
            "name": platform.value,
            "display_name": platform.value.title(),
            "requires_zip": PlatformService.requires_zip_packaging(platform),
            "file_extension": PlatformService.get_platform_file_extension(platform),
            "requires_config_json": PlatformService.requires_config_json(platform)
        })
    
    return {
        "platforms": platforms,
        "total": len(platforms)
    }

@router.get("/platforms/{platform_name}/requirements")
async def get_platform_requirements(platform_name: str, orientation: str = "portrait"):
    """获取特定平台的要求"""
    try:
        platform = Platform(platform_name.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform_name}")
    
    return {
        "platform": platform.value,
        "head_content_template": PlatformService.get_platform_head_content(platform, "{language}", orientation),
        "body_end_content": PlatformService.get_platform_body_end_content(platform),
        "cta_code": PlatformService.get_platform_cta_code(platform),
        "requires_zip": PlatformService.requires_zip_packaging(platform),
        "requires_config_json": PlatformService.requires_config_json(platform),
        "file_extension": PlatformService.get_platform_file_extension(platform),
        "orientation": orientation
    }

@router.post("/platforms/{platform_name}/validate")
async def validate_platform_project(platform_name: str, project_path: str):
    """验证项目是否满足平台要求"""
    try:
        platform = Platform(platform_name.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform_name}")
    
    project_dir = Path(project_path)
    if not project_dir.exists():
        raise HTTPException(status_code=400, detail=f"Project directory does not exist: {project_path}")
    
    validation_result = PlatformService.validate_platform_requirements(platform, project_dir)
    
    return {
        "platform": platform.value,
        "project_path": project_path,
        "validation": validation_result
    }

@router.post("/platforms/{platform_name}/preview-html")
async def preview_platform_html(
    platform_name: str, 
    html_content: str, 
    language: str = "en", 
    app_name: str = "PlayableAds",
    orientation: str = "portrait"
):
    """预览平台特定的HTML修改"""
    try:
        platform = Platform(platform_name.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform_name}")
    
    modified_html = PlatformService.apply_platform_modifications(
        html_content, platform, language, app_name, orientation
    )
    
    return {
        "platform": platform.value,
        "language": language,
        "app_name": app_name,
        "orientation": orientation,
        "original_html": html_content,
        "modified_html": modified_html
    }

@router.get("/platforms/google/details")
async def get_google_platform_details(orientation: str = "portrait"):
    """获取Google平台的详细信息"""
    return {
        "platform": "google",
        "meta_tags": GooglePlatformService.get_required_meta_tags("en", orientation),
        "exit_api_script": GooglePlatformService.get_exit_api_script(),
        "cta_handler": GooglePlatformService.get_cta_handler(),
        "orientation": orientation,
        "documentation": "https://developers.google.com/web/fundamentals/instant-and-offline/web-app-manifest"
    }

@router.get("/platforms/facebook/details")
async def get_facebook_platform_details():
    """获取Facebook平台的详细信息"""
    return {
        "platform": "facebook",
        "cta_handler": FacebookPlatformService.get_cta_handler(),
        "documentation": "https://developers.facebook.com/docs/audience-network/playable-ads"
    }

@router.get("/platforms/tiktok/details")
async def get_tiktok_platform_details():
    """获取TikTok平台的详细信息"""
    return {
        "platform": "tiktok",
        "sdk_script": TikTokPlatformService.get_sdk_script(),
        "cta_handler": TikTokPlatformService.get_cta_handler(),
        "requires_config_json": TikTokPlatformService.requires_config_json(),
        "documentation": "https://ads.tiktok.com/help/article?aid=10001006"
    }

@router.get("/platforms/applovin/details")
async def get_applovin_platform_details():
    """获取AppLovin平台的详细信息"""
    return {
        "platform": "applovin",
        "cta_handler": AppLovinPlatformService.get_cta_handler(),
        "documentation": "https://dash.applovin.com/documentation/mediation/unity/getting-started/integration"
    }

@router.get("/platforms/moloco/details")
async def get_moloco_platform_details():
    """获取Moloco平台的详细信息"""
    return {
        "platform": "moloco",
        "cta_handler": MolocoPlatformService.get_cta_handler(),
        "documentation": "https://docs.moloco.com/"
    }


