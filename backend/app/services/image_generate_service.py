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

def get_system_audio_path(audio_id: str) -> Optional[Path]:
    """
    获取系统音频文件路径
    
    Args:
        audio_id: 系统音频ID
        
    Returns:
        Path: 系统音频文件路径，如果不存在则返回None
    """
    try:
        # 系统音频目录
        system_audio_dir = Path("app/assets/audio/image_bg")
        
        if not system_audio_dir.exists():
            logger.warning(f"System audio directory not found: {system_audio_dir}")
            return None
        
        # 遍历系统音频目录，查找匹配的文件
        for file_path in system_audio_dir.iterdir():
            if file_path.is_file():
                # 检查文件名是否匹配audio_id
                file_stem = file_path.stem.lower().replace(" ", "_").replace("-", "_")
                if file_stem == audio_id.lower():
                    logger.info(f"Found system audio file: {file_path}")
                    return file_path
        
        logger.warning(f"System audio file not found for ID: {audio_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting system audio path: {str(e)}")
        return None


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
    template_dir = Path("app/templates/image")
    if not template_dir.exists():
        logger.error(f"Template directory not found: {template_dir}")
        raise FileNotFoundError(f"Template directory not found: {template_dir}")
    
    # 复制模板文件到预览目录（用于预览）
    logger.info(f"Copying template files from {template_dir} to {preview_dir}")
    for file_path in template_dir.glob("*"):
        if file_path.is_file():
            shutil.copy(file_path, preview_dir)
            logger.info(f"Copied {file_path.name} to preview directory")
    
    # 处理图片文件
    images_data = {}
    main_images = []
    
    logger.info(f"Processing {len(request.images)} main images")
    for image_id in request.images:
        image_path = get_file_path(image_id)
        if image_path and image_path.exists():
            # 获取文件名
            file_name = image_path.name
            logger.info(f"Processing image: {file_name}")
            main_images.append(file_name)
            
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
                logger.info(f"Added base64 image data for {file_name}")
    
    # 处理热点图片
    logger.info(f"Processing {len(request.hotspots)} hotspots")
    hotspot_data = []
    
    for i, hotspot in enumerate(request.hotspots):
        logger.info(f"Processing hotspot {i+1}: type={hotspot.type}, position=({hotspot.left}, {hotspot.top})")
        
        hotspot_info = {
            "left": f"{hotspot.left}%",
            "top": f"{hotspot.top}%",
            "type": hotspot.type,
            "imgIndex": hotspot.imgIndex,
            "scale": getattr(hotspot, 'scale', 1.0)
        }
        
        # 处理跳转URL
        if hotspot.type == "jump" and hotspot.url:
            hotspot_info["url"] = hotspot.url
            logger.info(f"Hotspot {i+1} is jump type with URL: {hotspot.url}")
        
        # 处理弹窗内容
        if hotspot.type == "popup":
            if hotspot.modalText:
                hotspot_info["modalText"] = hotspot.modalText
                logger.info(f"Hotspot {i+1} has modal text: {hotspot.modalText}")
            
            if hotspot.modalImgs:
                modal_images = []
                for img_id in hotspot.modalImgs:
                    image_path = get_file_path(img_id)
                    if image_path and image_path.exists():
                        # 获取文件名
                        file_name = image_path.name
                        modal_images.append(file_name)
                        logger.info(f"Adding modal image: {file_name}")
                        
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
                
                hotspot_info["modalImgs"] = modal_images
                logger.info(f"Hotspot {i+1} has {len(modal_images)} modal images")
        
        hotspot_data.append(hotspot_info)
    
    # 处理音频文件
    audio_files = []
    logger.info(f"Processing {len(request.audio_files)} audio files")
    
    for audio_id in request.audio_files:
        # 首先尝试作为上传文件处理
        audio_path = get_file_path(audio_id)
        
        # 如果上传文件不存在，尝试作为系统音频处理
        if not audio_path or not audio_path.exists():
            audio_path = get_system_audio_path(audio_id)
            if audio_path:
                logger.info(f"Found system audio: {audio_id}")
        
        if audio_path and audio_path.exists():
            # 获取文件名
            file_name = audio_path.name
            audio_files.append(file_name)
            logger.info(f"Processing audio file: {file_name}")
            
            # 复制文件到预览目录
            shutil.copy(audio_path, preview_dir / file_name)
        else:
            logger.warning(f"Audio file not found for ID: {audio_id}")
    
    # 处理CTA按钮
    cta_buttons_data = []
    logger.info(f"Processing {len(request.cta_buttons)} CTA buttons")
    
    for i, cta_button in enumerate(request.cta_buttons):
        logger.info(f"Processing CTA button {i+1}: type={cta_button.type}")
        
        # 获取CTA按钮图片
        cta_image_path = get_file_path(cta_button.image_id)
        if cta_image_path and cta_image_path.exists():
            # 获取文件名
            file_name = cta_image_path.name
            logger.info(f"Processing CTA button image: {file_name}")
            
            # 复制文件到预览目录
            shutil.copy(cta_image_path, preview_dir / file_name)
            
            # 读取图片文件并转换为base64
            with open(cta_image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")
                image_ext = cta_image_path.suffix.lower()[1:]  # 去掉点号
                mime_type = f"image/{image_ext}"
                if image_ext == "jpg":
                    mime_type = "image/jpeg"
                images_data[file_name] = f"data:{mime_type};base64,{image_data}"
                logger.info(f"Added base64 CTA button image data for {file_name}")
            
            cta_button_info = {
                "type": cta_button.type,
                "image": file_name,
                "position": {
                    "left": f"{cta_button.position.left}%",
                    "top": f"{cta_button.position.top}%"
                },
                "scale": cta_button.scale,
                "time": cta_button.time
            }
            cta_buttons_data.append(cta_button_info)
        else:
            logger.warning(f"CTA button image not found for ID: {cta_button.image_id}")
    
    # 生成config.js文件
    config_data = {
        "title": request.app_name,
        "appImgs": main_images,
        "download": {
            "url": "https://apps.apple.com/app/id1234567890",
            "text": "Download Now"
        },
        "hotspots": hotspot_data,
        "cta_buttons": cta_buttons_data
    }
    
    # 如果有音频文件，添加到配置中
    if audio_files:
        config_data["audio"] = audio_files
        logger.info(f"Added {len(audio_files)} audio files to config")
    
    # 写入配置文件到预览目录
    logger.info("Writing config.js file to preview directory")
    with open(preview_dir / "config.js", "w", encoding="utf-8") as f:
        f.write(f"window.PLAYABLE_CONFIG = {json.dumps(config_data, indent=2)};")
    
    logger.info("Writing images.js file to preview directory")
    with open(preview_dir / "images.js", "w", encoding="utf-8") as f:
        f.write(f"window.PLAYABLE_IMAGES = {json.dumps(images_data, indent=2)};")
    
    # 为所有平台生成HTML文件
    output_paths = []
    preview_paths = []
    
    # 执行构建
    # 生成TikTok平台的config.json文件
    if Platform.TIKTOK in request.platforms:
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
            config_json_file = preview_dir / "config.json"
            with open(config_json_file, "w", encoding="utf-8") as f:
                json.dump(config_json, f, indent=2)
        except Exception as e:
            logger.error(f"Error generating config.json: {str(e)}")
    
    # 为每个平台生成文件
    for platform in request.platforms:
        platform_value = platform.value
        logger.info(f"Building for platform: {platform_value}")
        
        if platform_value in ['google', 'tiktok']:
            # Google 和 TikTok 平台生成 ZIP 文件
            logger.info(f"Creating ZIP file for platform: {platform_value}")
            
            # 从预览目录复制文件到输出目录（用于打包）
            logger.info(f"Copying files from preview directory to output directory for packaging")
            for file_path in preview_dir.glob('**/*'):
                if file_path.is_file():
                    relative_path = file_path.relative_to(preview_dir)
                    output_file_path = output_dir / relative_path
                    # 确保目标目录存在
                    output_file_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(file_path, output_file_path)
                    logger.info(f"Copied {relative_path} to output directory")
            
            # 创建zip文件
            zip_file_path = project_dir / f"{platform_value}.zip"
            with zipfile.ZipFile(zip_file_path, 'w') as zipf:
                for file_path in output_dir.glob('**/*'):
                    if file_path.is_file():
                        zipf.write(file_path, file_path.relative_to(output_dir))
                        logger.info(f"Added {file_path.name} to ZIP file")
            
            output_paths.append(f"/api/download/{output_id}/{platform_value}.zip")
            
        else:
            # 其他平台生成单文件 HTML
            logger.info(f"Creating single HTML file for platform: {platform_value}")
            
            # 读取预览目录的 HTML 模板
            html_template_path = preview_dir / "index.html"
            if not html_template_path.exists():
                logger.error(f"HTML template not found: {html_template_path}")
                continue
                
            with open(html_template_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            
            # 读取配置文件
            config_js_path = preview_dir / "config.js"
            config_content = ""
            if config_js_path.exists():
                with open(config_js_path, 'r', encoding='utf-8') as f:
                    config_content = f.read()
            
            # 读取图片数据
            images_js_path = preview_dir / "images.js"
            images_content = ""
            if images_js_path.exists():
                with open(images_js_path, 'r', encoding='utf-8') as f:
                    images_content = f.read()
            
            # 读取 CSS 文件
            css_path = preview_dir / "style.css"
            css_content = ""
            if css_path.exists():
                with open(css_path, 'r', encoding='utf-8') as f:
                    css_content = f.read()
            
            # 读取 JavaScript 文件
            js_path = preview_dir / "main.js"
            js_content = ""
            if js_path.exists():
                with open(js_path, 'r', encoding='utf-8') as f:
                    js_content = f.read()
            
            # 处理音频文件 - 转换为base64并内嵌到HTML中
            audio_base64_data = {}
            for audio_file in audio_files:
                audio_path = preview_dir / audio_file
                if audio_path.exists():
                    try:
                        with open(audio_path, 'rb') as f:
                            audio_data = base64.b64encode(f.read()).decode('utf-8')
                            audio_ext = audio_path.suffix.lower()[1:]
                            mime_type = f"audio/{audio_ext}"
                            if audio_ext == "mp3":
                                mime_type = "audio/mpeg"
                            elif audio_ext == "wav":
                                mime_type = "audio/wav"
                            elif audio_ext == "m4a":
                                mime_type = "audio/mp4"
                            elif audio_ext == "ogg":
                                mime_type = "audio/ogg"
                            
                            audio_base64_data[audio_file] = f"data:{mime_type};base64,{audio_data}"
                            logger.info(f"Added base64 audio data for {audio_file}")
                    except Exception as e:
                        logger.error(f"Failed to encode audio file {audio_file}: {str(e)}")
            
            # 如果有音频文件，更新config_content中的音频路径
            if audio_base64_data:
                # 将音频文件名替换为base64数据URI
                for audio_file, base64_data in audio_base64_data.items():
                    config_content = config_content.replace(f'"{audio_file}"', f'"{base64_data}"')
                logger.info(f"Updated config with {len(audio_base64_data)} base64 audio files")
            
            # 构建单文件 HTML
            single_html = f"""<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="format-detection" content="telephone=no">
  <title>Playable Image Ads</title>
  <style>
{css_content}
  </style>
</head>
<body>
  <!-- 主应用容器 -->
  <div id="app"></div>
  
  <!-- 弹窗容器 -->
  <div id="modal" class="hidden">
    <div class="modal-content">
      <button id="close-modal">&times;</button>
      <div id="modal-text"></div>
      <div id="modal-imgs"></div>
    </div>
  </div>
  
  <!-- 音频控制器（隐藏） -->
  <div id="audio-controls" class="hidden">
    <button id="audio-toggle">🔊</button>
  </div>
  
  <script>
{images_content}
  </script>
  <script>
{config_content}
  </script>
  <script>
{js_content}
  </script>
</body>
</html>"""
            
            # 保存单文件 HTML
            html_file_path = project_dir / f"{platform_value}.html"
            with open(html_file_path, 'w', encoding='utf-8') as f:
                f.write(single_html)
            
            logger.info(f"Created single HTML file: {html_file_path}")
            output_paths.append(f"/api/download/{output_id}/{platform_value}.html")
    
    # 创建预览链接
    preview_url = f"/projects/{output_id}/preview/index.html"
    logger.info(f"Preview URL: {preview_url}")
    
    return output_paths[0] if output_paths else "", preview_url 