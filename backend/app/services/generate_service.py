import os
import json
import shutil
import zipfile
import base64
import re
import mimetypes
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Union

from backend.app.models.schemas import (
    GenerateRequest, Platform, Language, 
    Banner, BannerConfig, PauseFrame, CTAButton
)
from backend.app.services.file_service import FileType

# 配置日志
logger = logging.getLogger(__name__)

# 当前文件所在目录
CURRENT_DIR = Path(__file__).parent.parent.parent

# 模板目录
TEMPLATE_DIR = CURRENT_DIR / "app" / "templates" / "video"

# 项目目录
PROJECTS_DIR = CURRENT_DIR / "projects"

# 确保目录存在
os.makedirs(PROJECTS_DIR, exist_ok=True)

def find_uploaded_file(upload_dir: Path, file_id: str, file_type: str) -> Path:
    """
    在projects目录中查找上传的文件
    """
    if not upload_dir.exists():
        return None
    
    # 遍历projects目录下的所有子目录
    for project_dir in upload_dir.iterdir():
        if project_dir.is_dir():
            # 在每个项目目录中查找文件
            for file_path in project_dir.iterdir():
                if file_path.is_file() and file_id in file_path.name:
                    return file_path
    
    return None

def find_file_by_id(project_dir: Path, file_id: str) -> Optional[Path]:
    """
    在项目目录中查找文件，基于文件ID
    """
    for file_path in project_dir.iterdir():
        if file_path.is_file():
            if file_id in file_path.name:
                return file_path
    return None

def extract_used_assets_from_config(config_data: str) -> tuple[list, list]:
    """
    从config.js中提取使用到的图片和视频文件ID
    返回 (image_ids, video_ids)
    """
    image_ids = []
    video_ids = []
    
    try:
        # 尝试提取所有引用的图片ID
        # 常见的图片引用模式: "buttonImage": "xxx.png", "image": "xxx.jpg", "guideImage": "xxx.webp"
        image_patterns = [
            r'"buttonImage"\s*:\s*"([^"]+)"',
            r'"image"\s*:\s*"([^"]+)"',
            r'"guideImage"\s*:\s*"([^"]+)"',
            r'"left_image_id"\s*:\s*"([^"]+)"',
            r'"right_image_id"\s*:\s*"([^"]+)"',
            r'"image_id"\s*:\s*"([^"]+)"'
        ]
        
        for pattern in image_patterns:
            matches = re.findall(pattern, config_data)
            for match in matches:
                # 清理文件扩展名，只保留ID部分
                file_id = match.split('.')[0]
                if file_id and file_id not in image_ids:
                    image_ids.append(file_id)
        
        # 尝试提取所有引用的视频ID
        # 常见的视频引用模式: "videoUrl": "xxx.mp4"
        video_patterns = [
            r'"videoUrl"\s*:\s*"([^"]+)"'
        ]
        
        for pattern in video_patterns:
            matches = re.findall(pattern, config_data)
            for match in matches:
                # 清理文件扩展名，只保留ID部分
                file_id = match.split('.')[0]
                if file_id and file_id not in video_ids:
                    video_ids.append(file_id)
        
    except Exception as e:
        print(f"Error extracting assets from config: {str(e)}")
    
    return image_ids, video_ids

def filter_files_by_ids(file_list: list, asset_ids: list) -> list:
    """
    根据asset_ids过滤文件列表，只保留包含这些ID的文件
    """
    if not asset_ids:  # 如果没有提供ID，返回所有文件
        return file_list
    
    filtered_files = []
    for file_name in file_list:
        file_id = Path(file_name).stem
        if file_id in asset_ids:
            filtered_files.append(file_name)
    
    return filtered_files

def generate_images_js(partner_dir: Path, image_files: list) -> str:
    """
    生成images.js文件内容
    """
    images_dict = {}
    
    for img_file in image_files:
        try:
            img_path = partner_dir / img_file
            if not img_path.exists():
                print(f"Warning: Image file not found: {img_path}")
                continue
                
            # 获取文件ID和后缀
            file_id = img_path.stem
            file_ext = img_path.suffix.lower()
            file_key = file_id + file_ext    # 使用文件ID和后缀作为键
            
            # 读取图片文件
            with open(img_path, "rb") as f:
                img_data = f.read()
            
            # 确定MIME类型
            mime_type = ""
            if file_ext == ".png":
                mime_type = "image/png"
            elif file_ext in [".jpg", ".jpeg"]:
                mime_type = "image/jpeg"
            elif file_ext == ".gif":
                mime_type = "image/gif"
            elif file_ext == ".webp":
                mime_type = "image/webp"
            elif file_ext == ".svg":
                mime_type = "image/svg+xml"
            elif file_ext == ".bmp":
                mime_type = "image/bmp"
            else:
                print(f"Warning: Unsupported image format: {file_ext}")
                continue
                
            # 转换为Base64
            img_base64 = base64.b64encode(img_data).decode('utf-8')
            img_data_uri = f"data:{mime_type};base64,{img_base64}"
            
            # 添加到字典
            images_dict[file_key] = img_data_uri
            
        except Exception as e:
            print(f"Error processing image {img_file}: {str(e)}")
    
    # 生成JavaScript代码
    return f"window.PLAYABLE_IMAGES = {json.dumps(images_dict, indent=2)};"

def generate_videos_js(partner_dir: Path, video_files: list) -> str:
    """
    生成videos.js文件内容
    """
    videos_dict = {}
    
    for vid_file in video_files:
        try:
            vid_path = partner_dir / vid_file
            if not vid_path.exists():
                print(f"Warning: Video file not found: {vid_path}")
                continue
                
            # 获取文件ID和后缀
            file_id = vid_path.stem
            file_ext = vid_path.suffix.lower()
            file_key = file_id + file_ext    # 使用文件ID和后缀作为键
            
            # 读取视频文件
            with open(vid_path, "rb") as f:
                vid_data = f.read()
            
            # 确定MIME类型
            mime_type = ""
            if file_ext == ".mp4":
                mime_type = "video/mp4"
            elif file_ext == ".webm":
                mime_type = "video/webm"
            elif file_ext == ".ogg":
                mime_type = "video/ogg"
            elif file_ext == ".mov":
                mime_type = "video/quicktime"
            elif file_ext == ".avi":
                mime_type = "video/x-msvideo"
            elif file_ext == ".mkv":
                mime_type = "video/x-matroska"
            else:
                print(f"Warning: Unsupported video format: {file_ext}")
                continue
                
            # 转换为Base64
            vid_base64 = base64.b64encode(vid_data).decode('utf-8')
            vid_data_uri = f"data:{mime_type};base64,{vid_base64}"
            
            # 添加到字典
            videos_dict[file_key] = vid_data_uri
            
        except Exception as e:
            print(f"Error processing video {vid_file}: {str(e)}")
    
    # 生成JavaScript代码
    return f"window.PLAYABLE_VIDEOS = {json.dumps(videos_dict, indent=2)};"

async def generate_ad_html(request: GenerateRequest, output_id: str) -> (str, str):
    """
    生成广告HTML文件
    
    Args:
        request: 生成请求
        output_id: 输出ID
        
    Returns:
        tuple: (file_url, preview_url) - 文件URL和预览URL
    """
    logger.info(f"Starting generate_ad_html for project: {output_id}, platforms: {request.platforms}")
    
    # 查找或创建项目目录
    project_dir = PROJECTS_DIR / output_id
    project_dir.mkdir(exist_ok=True)
    logger.info(f"Project directory: {project_dir}")
    
    # 查找视频文件
    video_id = request.video_id
    video_file = find_file_by_id(project_dir, video_id)
    logger.info(f"Looking for video file with ID: {video_id}")
    
    if not video_file:
        logger.info(f"Video file not found in project directory, searching in other projects")
        # 尝试在其他项目目录中查找视频文件
        for project_path in PROJECTS_DIR.iterdir():
            if project_path.is_dir() and project_path != project_dir:
                video_file = find_file_by_id(project_path, video_id)
                if video_file:
                    # 复制视频文件到当前项目目录
                    target_file = project_dir / video_file.name
                    logger.info(f"Found video file in {project_path}, copying to {target_file}")
                    shutil.copy2(video_file, target_file)
                    video_file = target_file
                    break
    
    if not video_file:
        logger.error(f"Video file with ID {video_id} not found")
        raise FileNotFoundError(f"Video file with ID {video_id} not found")
    else:
        logger.info(f"Using video file: {video_file}")
    
    # 复制模板文件到项目目录，复制不存在的文件，避免覆盖已修改的文件
    logger.info(f"Copying template files from {TEMPLATE_DIR} to {project_dir}")
    for src in TEMPLATE_DIR.glob('*'):
        dst = project_dir / src.name
        if not dst.exists():
            if src.is_file():
                shutil.copy2(src, dst)
                logger.info(f"Copied file: {src} -> {dst}")
            elif src.is_dir():
                shutil.copytree(src, dst, dirs_exist_ok=True)
                logger.info(f"Copied directory: {src} -> {dst}")
    
    # 收集项目目录中的文件
    image_files = []
    video_files = []
    
    # 生成config.js文件（根目录）
    logger.info("Generating config.js")
    config_data = generate_config_js(request)
    config_file = project_dir / "config.js"
    with open(config_file, "w", encoding="utf-8") as f:
        f.write(config_data)
    
    # 生成lang.js文件（根目录）
    logger.info(f"Generating lang.js for language: {request.language}")
    lang_data = generate_lang_js(request.language)
    lang_file = project_dir / "lang.js"
    with open(lang_file, "w", encoding="utf-8") as f:
        f.write(lang_data)
    
    # 从项目目录读取文件
    logger.info("Collecting files from project directory")
    for file_path in project_dir.iterdir():
        if file_path.is_file():
            file_name = file_path.name
            if file_path.suffix.lower() in ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv']:
                video_files.append(file_name)
                logger.info(f"Found video file: {file_name}")
            elif file_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']:
                image_files.append(file_name)
                logger.info(f"Found image file: {file_name}")

    # 从config.js中提取使用到的资源ID
    logger.info("Extracting used assets from config.js")
    used_image_ids, used_video_ids = extract_used_assets_from_config(config_data)
    logger.info(f"Used image IDs: {used_image_ids}")
    logger.info(f"Used video IDs: {used_video_ids}")
    
    # 过滤文件列表，只保留使用到的文件
    filtered_image_files = filter_files_by_ids(image_files, used_image_ids)
    filtered_video_files = filter_files_by_ids(video_files, used_video_ids)
    logger.info(f"Filtered image files: {filtered_image_files}")
    logger.info(f"Filtered video files: {filtered_video_files}")

    # 生成images.js和videos.js文件（根目录）
    logger.info("Generating images.js and videos.js")
    images_js_content = generate_images_js(project_dir, image_files)
    videos_js_content = generate_videos_js(project_dir, video_files)
    with open(project_dir / "images.js", "w", encoding="utf-8") as f:
        f.write(images_js_content)
    with open(project_dir / "videos.js", "w", encoding="utf-8") as f:
        f.write(videos_js_content)
    
    # 为所有平台生成HTML文件
    output_paths = []
    preview_paths = []
    
    # 执行构建
    if Platform.ALL in request.platforms:
        logger.info("Generating for ALL platforms")
        # 为所有平台生成HTML文件
        platforms = [Platform.GOOGLE, Platform.FACEBOOK, Platform.APPLOVIN, Platform.MOLOCO, Platform.TIKTOK]
    else:
        platforms = request.platforms
    
    # 生成TikTok平台的config.json文件
    if Platform.TIKTOK in platforms:
        logger.info("Generating config.json for TikTok platform")
        try:
            # 确保video_orientation存在
            orientation = "portrait"
            if hasattr(request, 'video_orientation') and request.video_orientation:
                orientation = request.video_orientation.value if hasattr(request.video_orientation, 'value') else str(request.video_orientation).lower()
            
            # 确保language存在
            language = "en"
            if hasattr(request, 'language') and request.language:
                language = request.language.value if hasattr(request.language, 'value') else str(request.language).lower()
            
            config_json = {
                "playable_orientation": orientation,
                "playable_languages": [language]
            }
            config_json_file = project_dir / "config.json"
            with open(config_json_file, "w", encoding="utf-8") as f:
                json.dump(config_json, f, indent=2)
            logger.info(f"Generated config.json for TikTok: {config_json}")
        except Exception as e:
            logger.error(f"Failed to generate config.json for TikTok: {str(e)}")
    
    for platform in platforms:
        logger.info(f"Building for platform: {platform}")
        # 为当前平台生成HTML文件
        build_result = run_build_script(
            project_dir, 
            platform, 
            request.language,
            request.version,
            request.app_name
        )
        if not build_result["success"]:
            logger.error(f"Build failed for platform {platform}: {build_result['error']}")
            raise Exception(f"Build failed for platform {platform}: {build_result['error']}")
        
        # 收集生成的文件
        output_paths.append(build_result["output_file"])
        logger.info(f"Build successful for {platform}, output file: {build_result['output_file']}")
        
        # 如果有预览文件，添加到预览文件列表
        if build_result.get("preview_file"):
            preview_paths.append(build_result["preview_file"])
            logger.info(f"Preview file: {build_result['preview_file']}")
    
    # 如果有多个平台，创建一个包含所有平台文件的ZIP包
    if len(platforms) > 1:
        safe_app_name = re.sub(r'[^\w\-]', '_', request.app_name)
        lang_value = request.language.value if isinstance(request.language, Language) else str(request.language).lower()
        multi_platforms_zip = project_dir / f"{safe_app_name}-multi-platforms-{lang_value}-{request.version}.zip"
        logger.info(f"Creating ZIP file with multi platforms: {multi_platforms_zip}")
        with zipfile.ZipFile(multi_platforms_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for platform_file in output_paths:
                zipf.write(platform_file, platform_file.name)
                logger.info(f"Added {platform_file} to ZIP")
        
        logger.info(f"Generation complete, returning ZIP file: {multi_platforms_zip}")
        file_url = f"/projects/{output_id}/{multi_platforms_zip.name}"
        
        # 使用第一个预览文件（如果有的话）
        preview_url = None
        if preview_paths:
            preview_path = preview_paths[0]
            preview_url = f"/projects/{preview_path.parent.parent.name}/{preview_path.parent.name}/{preview_path.name}"
        
        return file_url, preview_url
    
    # 如果只有一个平台
    logger.info(f"Generation complete, returning output path: {output_paths[0]}")
    file_url = f"/projects/{output_id}/{output_paths[0].name}"
    
    # 如果有预览文件，使用它；否则使用输出文件作为预览
    preview_url = None
    if preview_paths:
        preview_path = preview_paths[0]
        preview_url = f"/projects/{preview_path.parent.parent.name}/{preview_path.parent.name}/{preview_path.name}"
    else:
        # 如果输出文件是HTML，使用它作为预览
        if output_paths[0].suffix == ".html":
            preview_url = file_url
    
    return file_url, preview_url

def generate_config_js(request: GenerateRequest) -> str:
    """
    生成配置文件
    """
    # 使用project_id查找项目目录
    project_dir = PROJECTS_DIR / request.project_id
    
    if not project_dir.exists():
        logger.warning(f"Project directory not found: {project_dir}")
        project_dir = None
        # 尝试查找包含video_id的目录作为备选
        for existing_dir in PROJECTS_DIR.iterdir():
            if existing_dir.is_dir() and request.video_id in str(existing_dir):
                project_dir = existing_dir
                logger.info(f"Found alternative project directory: {project_dir}")
                break
    
    # 获取视频文件扩展名
    video_ext = get_file_extension(project_dir, request.video_id) if project_dir else ".mp4"
    
    # 创建交互点配置
    interaction_points = []
    click_image = 'click_area.png'
    for i, frame in enumerate(request.pause_frames):
        image_ext = get_file_extension(project_dir, frame.image_id) if project_dir else ".png"
        
        # 使用自定义按钮图片或默认图片
        button_image = click_image
        button_position = frame.position
        button_scale = frame.scale
        
        # 如果提供了自定义按钮图片，则使用它
        if frame.buttonImage_id:
            button_image_ext = get_file_extension(project_dir, frame.buttonImage_id) if project_dir else ".png"
            button_image = f"{frame.buttonImage_id}{button_image_ext}"
            
            # 如果提供了按钮位置和缩放，则使用它们
            if frame.buttonPosition:
                button_position = frame.buttonPosition
            
            if frame.buttonScale is not None:
                button_scale = frame.buttonScale
        
        interaction_point = {
            "id": f"interaction_{i + 1}",
            "time": frame.time,
            "duration": 0,
            "buttonImage": button_image,
            "buttonEffect": "scale",
            "buttonSize": {
                "landscape": {"width": button_scale},
                "portrait": {"width": button_scale}
            },
            "buttonPosition": {
                "landscape": {
                    "x": round(button_position.left, 2),
                    "y": round(button_position.top, 2)
                },
                "portrait": {
                    "x": round(button_position.left, 2),
                    "y": round(button_position.top, 2)
                }
            },
            "guideImage": f"{frame.image_id}{image_ext}",
            "guideSize": {
                "landscape": {"width": frame.scale},
                "portrait": {"width": frame.scale}
            },
            "guidePosition": {
                "landscape": {
                    "x": round(frame.position.left, 2),
                    "y": round(frame.position.top, 2)
                },
                "portrait": {
                    "x": round(frame.position.left, 2),
                    "y": round(frame.position.top, 2)
                }
            },
            "swipeDirection": "bounce"
        }
        interaction_points.append(interaction_point)
    
    # 创建CTA按钮配置
    cta_start_button = None
    cta_end_button = None
    
    for button in request.cta_buttons:
        button_ext = get_file_extension(project_dir, button.image_id) if project_dir else ".png"
        if button.type == "fulltime":
            cta_start_button = {
                "id": "cta_start",
                "displayTime": 0,
                "buttonImage": f"{button.image_id}{button_ext}",
                "buttonSize": {
                    "landscape": {"width": button.scale},
                    "portrait": {"width": button.scale}
                },
                "buttonPosition": {
                    "landscape": {
                        "x": round(button.position.left, 2),
                        "y": round(button.position.top, 2)       
                    },
                    "portrait": {   
                        "x": round(button.position.left, 2),
                        "y": round(button.position.top, 2)
                    }
                },
                "url": "https://play.google.com/store/apps"
            }
        elif button.type == "endscreen":
            cta_end_button = {
                "id": "cta_end",
                "displayTime": button.time or 0,
                "buttonImage": f"{button.image_id}{button_ext}",
                "buttonSize": {
                    "landscape": {"width": button.scale},
                    "portrait": {"width": button.scale}
                },
                "buttonPosition": {
                    "landscape": {
                        "x": round(button.position.left, 2),
                        "y": round(button.position.top, 2)
                    },
                    "portrait": {
                        "x": round(button.position.left, 2),
                        "y": round(button.position.top, 2)
                    }
                },
                "url": "https://play.google.com/store/apps"
            }
    
    # 获取视频方向
    orientation = "portrait"
    if hasattr(request, 'video_orientation'):
        orientation = request.video_orientation.value if hasattr(request.video_orientation, 'value') else str(request.video_orientation).lower()
    
    # 创建配置对象
    config = {
        "appName": request.app_name,
        "version": request.version,
        "videoUrl": f"{request.video_id}{video_ext}",
        "orientation": orientation,
        "rotateTime": -1,
        "volume": 1,
        "enableFirstClick": True,
        "interactionPoints": interaction_points
    }
    
    # 添加CTA按钮配置
    if cta_start_button:
        config["cta_start_button"] = cta_start_button
    else:
        # 提供一个默认的CTA按钮配置，避免未定义错误
        config["cta_start_button"] = {
            "displayTime": 0,
            "buttonImage": "",
            "buttonSize": {
                "landscape": {"width": 20},
                "portrait": {"width": 40}
            },
            "buttonPosition": {
                "landscape": {"left": 50, "top": 80},
                "portrait": {"left": 50, "top": 80}
            },
            "url": "https://play.google.com/store/apps"
        }
        
    if cta_end_button:
        config["cta_end_button"] = cta_end_button
    else:
        # 提供一个默认的CTA结束按钮配置
        config["cta_end_button"] = {
            "displayTime": 0,
            "buttonImage": "",
            "buttonSize": {
                "landscape": {"width": 30},
                "portrait": {"width": 60}
            },
            "buttonPosition": {
                "landscape": {"left": 50, "top": 50},
                "portrait": {"left": 50, "top": 50}
            },
            "url": "https://play.google.com/store/apps"
        }
    
    # 如果有banner配置，添加到配置对象中
    if request.banners:
        banner_config = {}
        
        if isinstance(request.banners, list):
            # 如果是列表形式，转换为对象形式
            for banner in request.banners:
                banner_ext = get_file_extension(project_dir, banner.image_id) if project_dir else ".png"
                if banner.type == "left" or banner.type == "top":
                    banner_config["left_image_id"] = f"{banner.image_id}{banner_ext}"
                    banner_config["left_position"] = {
                        "landscape": {"x": banner.position.left, "y": banner.position.top},
                        "portrait": {"x": banner.position.left, "y": banner.position.top}
                    }
                    banner_config["left_scale"] = banner.scale
                elif banner.type == "right" or banner.type == "bottom":
                    banner_config["right_image_id"] = f"{banner.image_id}{banner_ext}"
                    banner_config["right_position"] = {
                        "landscape": {"x": banner.position.left, "y": banner.position.top},
                        "portrait": {"x": banner.position.left, "y": banner.position.top}
                    }
                    banner_config["right_scale"] = banner.scale
        else:
            # 如果是BannerConfig对象
            if hasattr(request.banners, 'left_image_id') and request.banners.left_image_id:
                left_ext = get_file_extension(project_dir, request.banners.left_image_id) if project_dir else ".png"
                banner_config["left_image_id"] = f"{request.banners.left_image_id}{left_ext}"
                if hasattr(request.banners, 'left_position') and request.banners.left_position:
                    banner_config["left_position"] = {
                        "landscape": {"x": request.banners.left_position.left, "y": request.banners.left_position.top},
                        "portrait": {"x": request.banners.left_position.left, "y": request.banners.left_position.top}
                    }
                if hasattr(request.banners, 'left_scale') and request.banners.left_scale:
                    banner_config["left_scale"] = request.banners.left_scale
            
            if hasattr(request.banners, 'right_image_id') and request.banners.right_image_id:
                right_ext = get_file_extension(project_dir, request.banners.right_image_id) if project_dir else ".png"
                banner_config["right_image_id"] = f"{request.banners.right_image_id}{right_ext}"
                if hasattr(request.banners, 'right_position') and request.banners.right_position:
                    banner_config["right_position"] = {
                        "landscape": {"x": request.banners.right_position.left, "y": request.banners.right_position.top},
                        "portrait": {"x": request.banners.right_position.left, "y": request.banners.right_position.top}
                    }
                if hasattr(request.banners, 'right_scale') and request.banners.right_scale:
                    banner_config["right_scale"] = request.banners.right_scale
        
        if banner_config:
            config["banners"] = banner_config
    
    return f"""window.PLAYABLE_CONFIG = {json.dumps(config, indent=2)};"""

def generate_lang_js(language: str) -> str:
    """
    生成语言配置文件
    """
    # 语言配置
    languages = {
        "en": {
            "title": "Playable Ads",
            "click_to_play": "Tap to continue",
            "rotate_tip": "Screen will rotate",
            "loading_failed": "Loading failed",
            "play_failed": "Play failed",
            "resource_not_found": "Resource not found",
            "continue_button": "Continue",
            "download_now": "Download Now",
            "play_now": "Play Now",
            "install_now": "Install Now"
        },
        "zh": {
            "title": "互动广告",
            "click_to_play": "点击屏幕继续",
            "rotate_tip": "屏幕即将旋转",
            "loading_failed": "加载失败",
            "play_failed": "播放失败",
            "resource_not_found": "资源未找到",
            "continue_button": "继续",
            "download_now": "立即下载",
            "play_now": "立即游戏",
            "install_now": "立即安装"
        },
        "ja": {
            "title": "プレイアブル広告",
            "click_to_play": "タップして続行",
            "rotate_tip": "画面が回転します",
            "loading_failed": "読み込みに失敗しました",
            "play_failed": "再生に失敗しました",
            "resource_not_found": "リソースが見つかりません",
            "continue_button": "続ける",
            "download_now": "今すぐダウンロード",
            "play_now": "今すぐプレイ",
            "install_now": "今すぐインストール"
        }
    }
    
    # 如果请求的语言不存在，使用英语作为默认语言
    if language not in languages:
        language = "en"
    
    # 创建语言配置对象
    lang_config = {
        language: languages[language]
    }
    
    # 返回语言配置JavaScript
    return f"window.PLAYABLE_LANG = {json.dumps(lang_config, indent=2, ensure_ascii=False)};"

def get_file_extension(project_dir: Path, file_id: str) -> str:
    """
    根据文件ID查找文件并返回其扩展名
    """
    if not project_dir or not project_dir.exists():
        return ".png"  # 默认扩展名
    
    for file_path in project_dir.iterdir():
        if file_path.is_file() and file_id in file_path.stem:
            return file_path.suffix
    
    return ".png"  # 默认扩展名


def run_build_script(project_dir: Path, platform: Platform, language: str, version: str = "v1", app_name: str = "PlayableAds") -> dict:
    """
    直接在Python中实现构建：将CSS/JS内联到index.html，并按平台输出到 project_dir/platforms/<platform>/ 下。
    """
    try:
        logger.info(f"Building ad for platform: {platform}, language: {language}, version: {version}, app_name: {app_name}")
        
        # 输入文件（统一在项目根目录）
        index_html = project_dir / "index.html"
        main_js = project_dir / "main.js"
        style_css = project_dir / "style.css"
        config_js = project_dir / "config.js"
        lang_js = project_dir / "lang.js"
        images_js = project_dir / "images.js"
        videos_js = project_dir / "videos.js"
        config_json = project_dir / "config.json"
        
        if not all([index_html.exists(), main_js.exists(), style_css.exists(), config_js.exists(), lang_js.exists()]):
            logger.error(f"Missing required files in {project_dir}:")
            logger.error(f"index.html exists: {index_html.exists()}")
            logger.error(f"main.js exists: {main_js.exists()}")
            logger.error(f"style.css exists: {style_css.exists()}")
            logger.error(f"config.js exists: {config_js.exists()}")
            logger.error(f"lang.js exists: {lang_js.exists()}")
            return {"success": False, "error": "Required template files not found in project root"}
        
        html_content = index_html.read_text(encoding="utf-8")
        main_js_content = main_js.read_text(encoding="utf-8")
        style_css_content = style_css.read_text(encoding="utf-8")
        config_js_content = config_js.read_text(encoding="utf-8")
        lang_js_content = lang_js.read_text(encoding="utf-8")
        images_js_content = images_js.read_text(encoding="utf-8") if images_js.exists() else "window.PLAYABLE_IMAGES = {};"
        videos_js_content = videos_js.read_text(encoding="utf-8") if videos_js.exists() else "window.PLAYABLE_VIDEOS = {};"
        
        # 检查ctaClick函数是否已更新
        if "handleCTAClick" not in main_js_content:
            logger.warning("handleCTAClick function not found in main.js")
        
        # 内联替换
        html_content = html_content.replace('<link rel="stylesheet" href="style.css">', f'<style>{style_css_content}</style>')
        html_content = html_content.replace('<script src="images.js"></script>', f'<script>{images_js_content}</script>')
        html_content = html_content.replace('<script src="videos.js"></script>', f'<script>{videos_js_content}</script>')
        html_content = html_content.replace('<script src="lang.js"></script>', f'<script>{lang_js_content}</script>')
        html_content = html_content.replace('<script src="config.js"></script>', f'<script>{config_js_content}</script>')
        html_content = html_content.replace('<script src="main.js"></script>', f'<script>{main_js_content}</script>')
        # 替换CTA代码
        cta_code = ""
        if platform == Platform.GOOGLE:
            cta_code = "window.ExitApi.exit();"
        elif platform == Platform.FACEBOOK:
            cta_code = "window.FbPlayableAd.onCTAClick();"
        elif platform == Platform.APPLOVIN:
            cta_code = "window.mraid.open();"
        elif platform == Platform.MOLOCO:
            cta_code = "window.FbPlayableAd.onCTAClick();"
        elif platform == Platform.TIKTOK:
            cta_code = "window.openAppStore();"
        html_content = html_content.replace('window.location.href = config.cta_start_button.url;', cta_code)

        # 设置语言
        html_content = html_content.replace('<html lang="en">', f'<html lang="{language}">')
        
        # 添加应用名称到标题
        html_content = html_content.replace('<title>Playable Ad</title>', f'<title>{app_name}</title>')

        # 平台特定处理
        if platform == Platform.GOOGLE:
            html_content = html_content.replace(
                '<head>',
                f'<head>\n    <meta name="ad.orientation" content="portrait">\n    <meta name="ad.language" content="{language}">\n    <script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"> </script>'
            )
        elif platform == Platform.TIKTOK:
            html_content = html_content.replace(
                '</body>',
                f'</body>\n  <script src= "https://sf16-muse-va.ibytedtos.com/obj/union-fe-nc-i18n/playable/sdk/playable-sdk.js"></script>'
            )
        
        # 获取平台值（字符串）
        platform_value = platform.value if isinstance(platform, Platform) else str(platform).lower()
        
        # 获取语言值（字符串）
        lang_value = language.value if isinstance(language, Language) else str(language).lower()
        
        # 清理应用名称，移除特殊字符
        safe_app_name = re.sub(r'[^\w\-]', '_', app_name)
        
        # 输出目录和文件名
        base_name = f"{safe_app_name}-{platform_value}-{lang_value}-{version}"
        output_html = project_dir / f"{base_name}.html"
        output_html.write_text(html_content, encoding="utf-8")
        logger.info(f"Written HTML file to {output_html}")
        
        output_file = output_html
        preview_file = None
        
        # 为Google平台创建一个预览目录，保存HTML文件用于预览
        preview_dir = project_dir / "preview"
        os.makedirs(preview_dir, exist_ok=True)
        preview_html = preview_dir / f"{base_name}.html"
        shutil.copy2(output_html, preview_html)
        preview_file = preview_html
        logger.info(f"Created preview file: {preview_html}")
        
        if platform == Platform.GOOGLE or platform == Platform.TIKTOK:
            # 创建ZIP文件
            zip_file = project_dir / f"{base_name}.zip"
            with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.write(output_html, output_html.name)
                # 如果是TikTok平台且config.json文件存在，将其添加到ZIP包中
                if platform == Platform.TIKTOK and config_json.exists():
                    zipf.write(config_json, config_json.name)
            output_html.unlink()
            output_file = zip_file
            logger.info(f"Created ZIP file: {zip_file}")
        
        return {
            "success": True, 
            "output_file": output_file,
            "preview_file": preview_file
        }
    except Exception as e:
        logger.error(f"Build failed: {str(e)}", exc_info=True)
        return {"success": False, "error": f"Build failed: {str(e)}"}
