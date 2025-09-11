import os
import json
import logging
import shutil
import base64
import uuid
import zipfile
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional
from backend.app.models.schemas import ImageGenerateRequest, Platform, Language
from backend.app.services.file_service import get_file_path

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 项目目录
PROJECTS_DIR = Path("projects")

async def generate_image_ad_html(request: ImageGenerateRequest, output_id: str) -> Tuple[str, str]:
    """
    生成互动图片广告HTML文件
    
    Args:
        request: 生成请求
        output_id: 输出ID
        
    Returns:
        tuple: (file_url, preview_url) - 文件URL和预览URL
    """
    logger.info(f"Generating image ad for project: {output_id}")
    
    # 确保项目目录存在
    project_dir = PROJECTS_DIR / output_id
    os.makedirs(project_dir, exist_ok=True)
    
    # 创建输出目录
    output_dir = project_dir / "output"
    os.makedirs(output_dir, exist_ok=True)
    
    # 创建预览目录
    preview_dir = project_dir / "preview"
    os.makedirs(preview_dir, exist_ok=True)
    
    # 获取模板目录
    template_dir = Path("backend/app/templates/image")
    
    # 复制模板文件到输出目录
    for file_path in template_dir.glob("*"):
        if file_path.is_file():
            shutil.copy(file_path, output_dir)
    
    # 复制模板文件到预览目录
    for file_path in template_dir.glob("*"):
        if file_path.is_file():
            shutil.copy(file_path, preview_dir)
    
    # 处理图片文件
    images_data = {}
    for image_id in request.images:
        image_path = get_file_path(image_id)
        if image_path and image_path.exists():
            # 获取文件名
            file_name = image_path.name
            # 复制文件到输出目录
            shutil.copy(image_path, output_dir / file_name)
            # 复制文件到预览目录
            shutil.copy(image_path, preview_dir / file_name)
            
            # 读取图片文件并转换为base64
            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")
                image_ext = image_path.suffix.lower()[1:]  # 去掉点号
                mime_type = f"image/{image_ext}"
                if image_ext == "jpg":
                    mime_type = "image/jpeg"
                images_data[file_name] = f"data:{mime_type};base64,{image_data}"
    
    # 处理热点图片
    for hotspot in request.hotspots:
        if hotspot.modalImgs:
            for image_id in hotspot.modalImgs:
                image_path = get_file_path(image_id)
                if image_path and image_path.exists():
                    # 获取文件名
                    file_name = image_path.name
                    # 复制文件到输出目录
                    shutil.copy(image_path, output_dir / file_name)
                    # 复制文件到预览目录
                    shutil.copy(image_path, preview_dir / file_name)
                    
                    # 读取图片文件并转换为base64
                    with open(image_path, "rb") as f:
                        image_data = base64.b64encode(f.read()).decode("utf-8")
                        image_ext = image_path.suffix.lower()[1:]  # 去掉点号
                        mime_type = f"image/{image_ext}"
                        if image_ext == "jpg":
                            mime_type = "image/jpeg"
                        images_data[file_name] = f"data:{mime_type};base64,{image_data}"
    
    # 处理音频文件
    for audio_id in request.audio_files:
        audio_path = get_file_path(audio_id)
        if audio_path and audio_path.exists():
            # 获取文件名
            file_name = audio_path.name
            # 复制文件到输出目录
            shutil.copy(audio_path, output_dir / file_name)
            # 复制文件到预览目录
            shutil.copy(audio_path, preview_dir / file_name)
    
    # 生成config.js文件
    config_data = {
        "title": request.app_name,
        "appImgs": [image_path.name for image_path in [get_file_path(img_id) for img_id in request.images] if image_path],
        "download": {
            "url": "https://apps.apple.com/app/id1234567890",
            "text": "Download Now"
        },
        "hotspots": [
            {
                "left": f"{hotspot.left}%",
                "top": f"{hotspot.top}%",
                "type": hotspot.type,
                "url": hotspot.url if hotspot.type == "jump" else None,
                "modalImgs": [get_file_path(img_id).name for img_id in hotspot.modalImgs] if hotspot.modalImgs else None,
                "modalText": hotspot.modalText,
                "imgIndex": hotspot.imgIndex
            } for hotspot in request.hotspots
        ]
    }
    
    # 如果有音频文件，添加到配置中
    if request.audio_files:
        config_data["audio"] = [get_file_path(audio_id).name for audio_id in request.audio_files if get_file_path(audio_id)]
    
    # 写入config.js文件
    with open(output_dir / "config.js", "w", encoding="utf-8") as f:
        f.write(f"window.PLAYABLE_CONFIG = {json.dumps(config_data, indent=2)};")
    
    # 写入预览目录的config.js文件
    with open(preview_dir / "config.js", "w", encoding="utf-8") as f:
        f.write(f"window.PLAYABLE_CONFIG = {json.dumps(config_data, indent=2)};")
    
    # 写入images.js文件
    with open(output_dir / "images.js", "w", encoding="utf-8") as f:
        f.write(f"window.PLAYABLE_IMAGES = {json.dumps(images_data, indent=2)};")
    
    # 写入预览目录的images.js文件
    with open(preview_dir / "images.js", "w", encoding="utf-8") as f:
        f.write(f"window.PLAYABLE_IMAGES = {json.dumps(images_data, indent=2)};")
    
    # 为所有平台生成HTML文件
    output_paths = []
    preview_paths = []
    
    # 执行构建
    if Platform.ALL in request.platforms:
        logger.info("Generating for ALL platforms")
        platforms = [Platform.GOOGLE, Platform.FACEBOOK, Platform.APPLOVIN, Platform.MOLOCO, Platform.TIKTOK]
    else:
        platforms = request.platforms
    
    # 生成TikTok平台的config.json文件
    if Platform.TIKTOK in platforms:
        logger.info("Generating config.json for TikTok platform")
        try:
            # 确保orientation存在
            orientation = "portrait"
            if hasattr(request, 'orientation') and request.orientation:
                orientation = request.orientation.value if hasattr(request.orientation, 'value') else str(request.orientation).lower()
            
            # 确保language存在
            language = "en"
            if hasattr(request, 'language') and request.language:
                language = request.language.value if hasattr(request.language, 'value') else str(request.language).lower()
            
            config_json = {
                "playable_orientation": orientation,
                "playable_languages": [language]
            }
            config_json_file = output_dir / "config.json"
            with open(config_json_file, "w", encoding="utf-8") as f:
                json.dump(config_json, f, indent=2)
        except Exception as e:
            logger.error(f"Error generating config.json: {str(e)}")
    
    # 为每个平台创建zip文件
    for platform in platforms:
        platform_value = platform.value
        
        # 创建zip文件
        zip_file_path = project_dir / f"{platform_value}.zip"
        with zipfile.ZipFile(zip_file_path, 'w') as zipf:
            for file_path in output_dir.glob('**/*'):
                if file_path.is_file():
                    zipf.write(file_path, file_path.relative_to(output_dir))
        
        output_paths.append(f"/api/download/{output_id}/{platform_value}.zip")
    
    # 创建预览链接
    preview_url = f"/api/preview/{output_id}/index.html"
    
    return output_paths[0] if output_paths else "", preview_url 