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

router = APIRouter()

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
