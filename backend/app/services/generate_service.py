import os
import json
import shutil
import zipfile
import base64
import re
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Union

from app.models.schemas import (
    GenerateRequest, Platform, Language, 
    Banner, BannerConfig, PauseFrame, CTAButton
)
from app.services.file_service import FileType

# 当前文件所在目录
CURRENT_DIR = Path(__file__).parent.parent.parent

# 模板目录
TEMPLATE_DIR = CURRENT_DIR / "app" / "templates" / "v1"

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
            
            print(f"Added image: {file_key} with MIME type: {mime_type}")
            
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
            
            print(f"Added video: {file_key} with MIME type: {mime_type}")
            
        except Exception as e:
            print(f"Error processing video {vid_file}: {str(e)}")
    
    # 生成JavaScript代码
    return f"window.PLAYABLE_VIDEOS = {json.dumps(videos_dict, indent=2)};"

async def generate_ad_html(request: GenerateRequest, output_id: str) -> Path:
    """
    生成广告HTML文件
    """
    try:
        # 确保项目目录存在
        project_dir = PROJECTS_DIR / output_id
        os.makedirs(project_dir, exist_ok=True)
        
        # 获取视频文件
        video_file = find_uploaded_file(PROJECTS_DIR, request.video_id, FileType.VIDEO)
        if not video_file:
            raise ValueError(f"Video file not found: {request.video_id}")
        
        # 获取平台
        platform = request.platforms[0] if request.platforms else Platform.GOOGLE
        
        # 根据平台选择模板
        if platform == Platform.GOOGLE:
            return await generate_google_ad(request, output_id, project_dir, video_file)
        elif platform == Platform.FACEBOOK:
            return await generate_facebook_ad(request, output_id, project_dir, video_file)
        elif platform == Platform.APPLOVIN:
            return await generate_applovin_ad(request, output_id, project_dir, video_file)
        elif platform == Platform.MOLOCO:
            return await generate_moloco_ad(request, output_id, project_dir, video_file)
        else:
            raise ValueError(f"Unsupported platform: {platform}")
            
    except Exception as e:
        print(f"Error generating ad HTML: {str(e)}")
        raise
    
    # 复制模板文件到项目目录（直接复制到根，不再使用 template/partners 结构）
    # 只复制不存在的文件，避免覆盖已修改的文件
    for src in TEMPLATE_DIR.glob('*'):
        dst = project_dir / src.name
        if not dst.exists():
            if src.is_file():
                shutil.copy2(src, dst)
            elif src.is_dir():
                shutil.copytree(src, dst, dirs_exist_ok=True)
    
    # 收集项目目录中的文件
    image_files = []
    video_files = []
    
    # 从项目目录读取文件
    for file_path in project_dir.iterdir():
        if file_path.is_file():
            file_name = file_path.name
            if file_path.suffix.lower() in ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv']:
                video_files.append(file_name)
            elif file_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']:
                image_files.append(file_name)
    
    # 生成config.js文件（根目录）
    config_data = generate_config_js(request)
    config_file = project_dir / "config.js"
    with open(config_file, "w", encoding="utf-8") as f:
        f.write(config_data)
    
    # 生成lang.js文件（根目录）
    lang_data = generate_lang_js(request.language)
    lang_file = project_dir / "lang.js"
    with open(lang_file, "w", encoding="utf-8") as f:
        f.write(lang_data)
    
    # 生成images.js和videos.js文件（根目录）
    print(f"image_files: {image_files}")
    print(f"video_files: {video_files}")
    images_js_content = generate_images_js(project_dir, image_files)
    videos_js_content = generate_videos_js(project_dir, video_files)
    with open(project_dir / "images.js", "w", encoding="utf-8") as f:
        f.write(images_js_content)
    with open(project_dir / "videos.js", "w", encoding="utf-8") as f:
        f.write(videos_js_content)
    
    # 执行构建（直接在Python中实现原build.sh逻辑）
    if request.platform == Platform.ALL:
        # 为所有平台生成HTML文件
        platforms = [Platform.GOOGLE, Platform.FACEBOOK, Platform.APPLOVIN, Platform.MOLOCO]
        all_platform_files = []
        
        for platform in platforms:
            # 创建一个新的请求对象，只修改平台
            platform_request = GenerateRequest(
                video_id=request.video_id,
                project_id=request.project_id,
                pause_frames=request.pause_frames,
                cta_buttons=request.cta_buttons,
                banners=request.banners,
                platform=platform,
                language=request.language,
                version=request.version,
                app_name=request.app_name
            )
            
            # 为当前平台生成HTML文件
            build_result = run_build_script(
                project_dir, 
                platform, 
                request.language,
                request.version,
                request.app_name
            )
            if not build_result["success"]:
                raise Exception(f"Build failed for platform {platform}: {build_result['error']}")
            
            # 收集生成的文件
            all_platform_files.append(build_result["output_file"])
        
        # 创建一个包含所有平台文件的ZIP包
        safe_app_name = re.sub(r'[^\w\-]', '_', request.app_name)
        lang_value = request.language.value if isinstance(request.language, Language) else str(request.language).lower()
        all_platforms_zip = project_dir / f"{safe_app_name}-all-{lang_value}-{request.version}.zip"
        with zipfile.ZipFile(all_platforms_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for platform_file in all_platform_files:
                zipf.write(platform_file, platform_file.name)
        
        return all_platforms_zip
    else:
        # 为单个平台生成HTML文件
        build_result = run_build_script(
            project_dir, 
            request.platform, 
            request.language,
            request.version,
            request.app_name
        )
        if not build_result["success"]:
            raise Exception(f"Build failed: {build_result['error']}")
        
        return build_result["output_file"]

def generate_config_js(request: GenerateRequest) -> str:
    """
    生成配置文件
    """
    # 使用project_id查找项目目录
    project_dir = PROJECTS_DIR / request.project_id
    
    if not project_dir.exists():
        print(f"Warning: Project directory not found: {project_dir}")
        project_dir = None
        # 尝试查找包含video_id的目录作为备选
        for existing_dir in PROJECTS_DIR.iterdir():
            if existing_dir.is_dir() and request.video_id in str(existing_dir):
                project_dir = existing_dir
                print(f"Found alternative project directory: {project_dir}")
                break
    
    # 获取视频文件扩展名
    video_ext = get_file_extension(project_dir, request.video_id) if project_dir else ".mp4"
    
    # 创建交互点配置
    interaction_points = []
    click_image = 'click_area.png'
    for i, frame in enumerate(request.pause_frames):
        image_ext = get_file_extension(project_dir, frame.image_id) if project_dir else ".png"
        interaction_point = {
            "id": f"interaction_{i + 1}",
                "time": frame.time,
            "duration": 0,
            "buttonImage": f"{click_image}",
            "buttonEffect": "scale",
            "buttonSize": {
                "landscape": {"width": frame.scale},
                "portrait": {"width": frame.scale}
            },
            "buttonPosition": {
                "landscape": {
                    "x": round(frame.position.left, 2),
                    "y": round(frame.position.top, 2)
                },
                "portrait": {
                    "x": round(frame.position.left, 2),
                    "y": round(frame.position.top, 2)
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
    
    # 创建配置对象
    config = {
        "appName": request.app_name,
        "version": request.version,
        "videoUrl": f"{request.video_id}{video_ext}",
        "orientation": "portrait",
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

        if request.banners.left_image_id:
                left_ext = get_file_extension(project_dir, request.banners.left_image_id) if project_dir else ".png"
                banner_config["left_image_id"] = f"{request.banners.left_image_id}{left_ext}"
                banner_config["left_position"] = {
                    "landscape": {"x": request.banners.left_position.left, "y": request.banners.left_position.top},
                    "portrait": {"x": request.banners.left_position.left, "y": request.banners.left_position.top}
                }
                banner_config["left_scale"] = request.banners.left_scale
        if request.banners.right_image_id:
                right_ext = get_file_extension(project_dir, request.banners.right_image_id) if project_dir else ".png"
                banner_config["right_image_id"] = f"{request.banners.right_image_id}{right_ext}"
                banner_config["right_position"] = {
                    "landscape": {"x": request.banners.right_position.left, "y": request.banners.right_position.top},
                    "portrait": {"x": request.banners.right_position.left, "y": request.banners.right_position.top}
                }
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
        },
        "ko": {
            "title": "플레이어블 광고",
            "click_to_play": "계속하려면 탭하세요",
            "rotate_tip": "화면이 회전됩니다",
            "loading_failed": "로딩 실패",
            "play_failed": "재생 실패",
            "resource_not_found": "리소스를 찾을 수 없음",
            "continue_button": "계속",
            "download_now": "지금 다운로드",
            "play_now": "지금 플레이",
            "install_now": "지금 설치"
        },
        "fr": {
            "title": "Publicité jouable",
            "click_to_play": "Appuyez pour continuer",
            "rotate_tip": "L'écran va pivoter",
            "loading_failed": "Échec du chargement",
            "play_failed": "Échec de la lecture",
            "resource_not_found": "Ressource introuvable",
            "continue_button": "Continuer",
            "download_now": "Télécharger maintenant",
            "play_now": "Jouer maintenant",
            "install_now": "Installer maintenant"
        },
        "de": {
            "title": "Spielbare Anzeige",
            "click_to_play": "Tippen Sie, um fortzufahren",
            "rotate_tip": "Bildschirm wird gedreht",
            "loading_failed": "Laden fehlgeschlagen",
            "play_failed": "Wiedergabe fehlgeschlagen",
            "resource_not_found": "Ressource nicht gefunden",
            "continue_button": "Weiter",
            "download_now": "Jetzt herunterladen",
            "play_now": "Jetzt spielen",
            "install_now": "Jetzt installieren"
        },
        "es": {
            "title": "Anuncio jugable",
            "click_to_play": "Toca para continuar",
            "rotate_tip": "La pantalla girará",
            "loading_failed": "Error de carga",
            "play_failed": "Error de reproducción",
            "resource_not_found": "Recurso no encontrado",
            "continue_button": "Continuar",
            "download_now": "Descargar ahora",
            "play_now": "Jugar ahora",
            "install_now": "Instalar ahora"
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

def run_build_script(project_dir: Path, platform: Platform, language: str, version: str = "v1", app_name: str = "PlayableAds") -> dict:
    """
    直接在Python中实现构建：将CSS/JS内联到index.html，并按平台输出到 project_dir/platforms/<platform>/ 下。
    """
    try:
        print(f"Building ad for platform: {platform}, language: {language}, version: {version}, app_name: {app_name}")
        
        # 输入文件（统一在项目根目录）
        index_html = project_dir / "index.html"
        main_js = project_dir / "main.js"
        style_css = project_dir / "style.css"
        config_js = project_dir / "config.js"
        lang_js = project_dir / "lang.js"
        images_js = project_dir / "images.js"
        videos_js = project_dir / "videos.js"
        
        if not all([index_html.exists(), main_js.exists(), style_css.exists(), config_js.exists(), lang_js.exists()]):
            print(f"Missing required files in {project_dir}:")
            print(f"index.html exists: {index_html.exists()}")
            print(f"main.js exists: {main_js.exists()}")
            print(f"style.css exists: {style_css.exists()}")
            print(f"config.js exists: {config_js.exists()}")
            print(f"lang.js exists: {lang_js.exists()}")
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
            print("Warning: handleCTAClick function not found in main.js")
        
        # 内联替换
        html_content = html_content.replace('<link rel="stylesheet" href="style.css">', f'<style>{style_css_content}</style>')
        html_content = html_content.replace('<script src="images.js"></script>', f'<script>{images_js_content}</script>')
        html_content = html_content.replace('<script src="videos.js"></script>', f'<script>{videos_js_content}</script>')
        html_content = html_content.replace('<script src="lang.js"></script>', f'<script>{lang_js_content}</script>')
        # config.js 可能在 main.js 之前或之后，统一替换
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
        html_content = html_content.replace('window.location.href = config.cta_start_button.url;', cta_code)

        # 设置语言
        html_content = html_content.replace('<html lang="en">', f'<html lang="{language}">')
        
        # 添加应用名称到标题
        html_content = html_content.replace('<title>Playable Ad</title>', f'<title>{app_name}</title>')
        
        # 添加iframe兼容性脚本
        iframe_compat_script = """
<script>
// 添加iframe兼容性处理
window.addEventListener('message', function(event) {
    // 处理来自父窗口的消息
    if (event.data === 'toggleOrientation') {
        // 处理屏幕旋转
        const video = document.getElementById('video');
        const guideLayer = document.getElementById('guideLayer');
        
        if (video.classList.contains('rotated')) {
            video.classList.remove('rotated');
            guideLayer.classList.remove('rotated');
        } else {
            video.classList.add('rotated');
            guideLayer.classList.add('rotated');
        }
    }
});

// 通知父窗口广告已加载
window.addEventListener('load', function() {
    if (window.parent !== window) {
        window.parent.postMessage('adLoaded', '*');
    }
});
</script>
"""
        
        # 在</body>前插入iframe兼容性脚本
        html_content = html_content.replace('</body>', f'{iframe_compat_script}</body>')
        
        # 平台特定处理
        if platform == Platform.GOOGLE:
            html_content = html_content.replace(
                '<head>',
                f'<head>\n    <meta name="ad.orientation" content="portrait">\n    <meta name="ad.language" content="{language}">\n    <script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"> </script>'
            )
        elif platform == Platform.FACEBOOK:
            html_content = html_content.replace(
                '<head>',
                f'<head>\n    <meta name="fb:language" content="{language}">'
            )
        elif platform == Platform.APPLOVIN:
            html_content = html_content.replace(
                '<head>',
                f'<head>\n    <meta name="mraid:language" content="{language}">'
            )
        elif platform == Platform.MOLOCO:
            html_content = html_content.replace(
                '<head>',
                f'<head>\n    <meta name="mraid:language" content="{language}">'
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
        
        output_file = output_html
        preview_file = None
        
        if platform == Platform.GOOGLE:
            # 为Google平台创建一个预览目录，保存HTML文件用于预览
            preview_dir = project_dir / "preview"
            os.makedirs(preview_dir, exist_ok=True)
            preview_html = preview_dir / f"{base_name}.html"
            shutil.copy2(output_html, preview_html)
            preview_file = preview_html
            
            # 创建ZIP文件
            zip_file = project_dir / f"{base_name}.zip"
            with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.write(output_html, output_html.name)
            output_html.unlink()
            output_file = zip_file
        
        return {
            "success": True, 
            "output_file": output_file,
            "preview_file": preview_file
        }
    except Exception as e:
        return {"success": False, "error": f"Build failed: {str(e)}"}

async def generate_ad_zip(request: GenerateRequest, output_id: str) -> Path:
    """
    生成ZIP格式的广告文件
    """
    html_path = await generate_ad_html(request, output_id)
    zip_filename = f"{request.platform}_{output_id}.zip"
    zip_path = html_path.parent / zip_filename
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zipf.write(html_path, html_path.name)
    html_path.unlink()
    return zip_path 

def get_file_extension(project_dir: Path, file_id: str) -> str:
    """
    根据文件ID在项目目录中查找文件，并返回其后缀名
    """
    print(f"DEBUG: get_file_extension called for file_id='{file_id}' in project_dir='{project_dir}'")
    
    # 首先尝试直接查找文件
    for file_path in project_dir.iterdir():
        if file_path.is_file():
            print(f"DEBUG: Checking file: {file_path.name}")
            if file_id in file_path.name:
                print(f"DEBUG: Found exact match: {file_path.name}, returning suffix: {file_path.suffix}")
                return file_path.suffix
    
    # 如果找不到文件，检查是否有同名但不同扩展名的文件
    possible_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi', '.mkv']
    for ext in possible_extensions:
        potential_file = project_dir / f"{file_id}{ext}"
        if potential_file.exists():
            print(f"DEBUG: Found file with exact ID and extension '{ext}': {potential_file.name}, returning suffix: {ext}")
            return ext
    
    # 尝试更严格的匹配 - 检查文件名是否完全等于file_id（忽略扩展名）
    for file_path in project_dir.iterdir():
        if file_path.is_file() and file_path.stem == file_id:
            print(f"DEBUG: Found stem match: {file_path.name}, returning suffix: {file_path.suffix}")
            return file_path.suffix
    
    # 如果仍然找不到文件，返回默认后缀
    print(f"DEBUG: File with ID '{file_id}' not found in '{project_dir}', returning default extension")
    return ".png"  # Default to .png for images, .mp4 for videos if not found 
async def generate_google_ad(request: GenerateRequest, output_id: str, project_dir: Path, video_file: Path) -> Path:
    """
    生成Google广告HTML文件
    """
    # 复制模板文件到项目目录
    for src in TEMPLATE_DIR.glob('*'):
        dst = project_dir / src.name
        if not dst.exists():
            if src.is_file():
                shutil.copy2(src, dst)
            elif src.is_dir():
                shutil.copytree(src, dst, dirs_exist_ok=True)
    
    # 收集项目目录中的文件
    image_files = []
    video_files = []
    
    # 从项目目录读取文件
    for file_path in project_dir.iterdir():
        if file_path.is_file():
            file_name = file_path.name
            if file_path.suffix.lower() in ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv']:
                video_files.append(file_name)
            elif file_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']:
                image_files.append(file_name)
    
    # 生成config.js文件
    config_data = generate_config_js(request)
    config_file = project_dir / "config.js"
    with open(config_file, "w", encoding="utf-8") as f:
        f.write(config_data)
    
    # 生成lang.js文件
    lang_data = generate_lang_js(request.language)
    lang_file = project_dir / "lang.js"
    with open(lang_file, "w", encoding="utf-8") as f:
        f.write(lang_data)
    
    # 生成images.js和videos.js文件
    print(f"image_files: {image_files}")
    print(f"video_files: {video_files}")
    images_js_content = generate_images_js(project_dir, image_files)
    videos_js_content = generate_videos_js(project_dir, video_files)
    with open(project_dir / "images.js", "w", encoding="utf-8") as f:
        f.write(images_js_content)
    with open(project_dir / "videos.js", "w", encoding="utf-8") as f:
        f.write(videos_js_content)
    
    # 执行构建
    build_result = run_build_script(
        project_dir, 
        Platform.GOOGLE, 
        request.language,
        request.version,
        request.app_name
    )
    if not build_result["success"]:
        raise Exception(f"Build failed for Google platform: {build_result['error']}")
    
    # 如果有预览文件，优先使用预览文件
    if "preview_file" in build_result and build_result["preview_file"]:
        return build_result["preview_file"]
    
    # 否则使用输出文件
    return build_result["output_file"]

async def generate_facebook_ad(request: GenerateRequest, output_id: str, project_dir: Path, video_file: Path) -> Path:
    """
    生成Facebook广告HTML文件
    """
    # 复制模板文件到项目目录
    for src in TEMPLATE_DIR.glob('*'):
        dst = project_dir / src.name
        if not dst.exists():
            if src.is_file():
                shutil.copy2(src, dst)
            elif src.is_dir():
                shutil.copytree(src, dst, dirs_exist_ok=True)
    
    # 收集项目目录中的文件
    image_files = []
    video_files = []
    
    # 从项目目录读取文件
    for file_path in project_dir.iterdir():
        if file_path.is_file():
            file_name = file_path.name
            if file_path.suffix.lower() in ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv']:
                video_files.append(file_name)
            elif file_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']:
                image_files.append(file_name)
    
    # 生成config.js文件
    config_data = generate_config_js(request)
    config_file = project_dir / "config.js"
    with open(config_file, "w", encoding="utf-8") as f:
        f.write(config_data)
    
    # 生成lang.js文件
    lang_data = generate_lang_js(request.language)
    lang_file = project_dir / "lang.js"
    with open(lang_file, "w", encoding="utf-8") as f:
        f.write(lang_data)
    
    # 生成images.js和videos.js文件
    print(f"image_files: {image_files}")
    print(f"video_files: {video_files}")
    images_js_content = generate_images_js(project_dir, image_files)
    videos_js_content = generate_videos_js(project_dir, video_files)
    with open(project_dir / "images.js", "w", encoding="utf-8") as f:
        f.write(images_js_content)
    with open(project_dir / "videos.js", "w", encoding="utf-8") as f:
        f.write(videos_js_content)
    
    # 执行构建
    build_result = run_build_script(
        project_dir, 
        Platform.FACEBOOK, 
        request.language,
        request.version,
        request.app_name
    )
    if not build_result["success"]:
        raise Exception(f"Build failed for Facebook platform: {build_result['error']}")
    
    return build_result["output_file"]

async def generate_applovin_ad(request: GenerateRequest, output_id: str, project_dir: Path, video_file: Path) -> Path:
    """
    生成AppLovin广告HTML文件
    """
    # 复制模板文件到项目目录
    for src in TEMPLATE_DIR.glob('*'):
        dst = project_dir / src.name
        if not dst.exists():
            if src.is_file():
                shutil.copy2(src, dst)
            elif src.is_dir():
                shutil.copytree(src, dst, dirs_exist_ok=True)
    
    # 收集项目目录中的文件
    image_files = []
    video_files = []
    
    # 从项目目录读取文件
    for file_path in project_dir.iterdir():
        if file_path.is_file():
            file_name = file_path.name
            if file_path.suffix.lower() in ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv']:
                video_files.append(file_name)
            elif file_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']:
                image_files.append(file_name)
    
    # 生成config.js文件
    config_data = generate_config_js(request)
    config_file = project_dir / "config.js"
    with open(config_file, "w", encoding="utf-8") as f:
        f.write(config_data)
    
    # 生成lang.js文件
    lang_data = generate_lang_js(request.language)
    lang_file = project_dir / "lang.js"
    with open(lang_file, "w", encoding="utf-8") as f:
        f.write(lang_data)
    
    # 生成images.js和videos.js文件
    print(f"image_files: {image_files}")
    print(f"video_files: {video_files}")
    images_js_content = generate_images_js(project_dir, image_files)
    videos_js_content = generate_videos_js(project_dir, video_files)
    with open(project_dir / "images.js", "w", encoding="utf-8") as f:
        f.write(images_js_content)
    with open(project_dir / "videos.js", "w", encoding="utf-8") as f:
        f.write(videos_js_content)
    
    # 执行构建
    build_result = run_build_script(
        project_dir, 
        Platform.APPLOVIN, 
        request.language,
        request.version,
        request.app_name
    )
    if not build_result["success"]:
        raise Exception(f"Build failed for AppLovin platform: {build_result['error']}")
    
    return build_result["output_file"]


async def generate_moloco_ad(request: GenerateRequest, output_id: str, project_dir: Path, video_file: Path) -> Path:
    """
    生成Moloco广告HTML文件
    """
    # 复制模板文件到项目目录
    for src in TEMPLATE_DIR.glob('*'):
        dst = project_dir / src.name
        if not dst.exists():
            if src.is_file():
                shutil.copy2(src, dst)
            elif src.is_dir():
                shutil.copytree(src, dst, dirs_exist_ok=True)
    
    # 收集项目目录中的文件
    image_files = []
    video_files = []
    
    # 从项目目录读取文件
    for file_path in project_dir.iterdir():
        if file_path.is_file():
            file_name = file_path.name
            if file_path.suffix.lower() in ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv']:
                video_files.append(file_name)
            elif file_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']:
                image_files.append(file_name)
    
    # 生成config.js文件
    config_data = generate_config_js(request)
    config_file = project_dir / "config.js"
    with open(config_file, "w", encoding="utf-8") as f:
        f.write(config_data)
    
    # 生成lang.js文件
    lang_data = generate_lang_js(request.language)
    lang_file = project_dir / "lang.js"
    with open(lang_file, "w", encoding="utf-8") as f:
        f.write(lang_data)
    
    # 生成images.js和videos.js文件
    print(f"image_files: {image_files}")
    print(f"video_files: {video_files}")
    images_js_content = generate_images_js(project_dir, image_files)
    videos_js_content = generate_videos_js(project_dir, video_files)
    with open(project_dir / "images.js", "w", encoding="utf-8") as f:
        f.write(images_js_content)
    with open(project_dir / "videos.js", "w", encoding="utf-8") as f:
        f.write(videos_js_content)
    
    # 执行构建
    build_result = run_build_script(
        project_dir, 
        Platform.MOLOCO, 
        request.language,
        request.version,
        request.app_name
    )
    if not build_result["success"]:
        raise Exception(f"Build failed for Moloco platform: {build_result['error']}")
    
    return build_result["output_file"]