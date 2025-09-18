"""
基础广告生成器类

包含图片和视频广告生成器的公共逻辑
"""

import logging
import re
import json
import zipfile
import base64
import shutil
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Tuple, Union, Optional, Any

from backend.app.models.schemas import Platform
from backend.app.config import PROJECTS_DIR, BACKEND_BASE_URL
from backend.app.models.schemas import ImageVideoGenerateRequest, VideoGenerateRequest
from backend.app.utils.file_utils import copy_file_safely
from backend.app.services.platform_service import PlatformService
from backend.app.services.common import create_assets_directory_structure


logger = logging.getLogger(__name__)


class BaseAdGenerator(ABC):
    """广告生成器基类"""
    
    def __init__(self, request: Union[ImageVideoGenerateRequest, VideoGenerateRequest], output_id: str):
        self.request = request
        self.output_id = output_id
        self.project_dir = PROJECTS_DIR / output_id
        self.preview_dir = self.project_dir / "preview"
        self.relative_images_dir = "assets/images"
        self.relative_videos_dir = "assets/videos"
        self.relative_audios_dir = "assets/audios"
        self.assets_dirs = self._setup_assets_dirs()
    
    def get_interaction_type(self) -> str:
        """获取交互类型（image或video）"""
        # 通过类名判断
        class_name = self.__class__.__name__
        if "Image" in class_name:
            return "image"
        elif "Video" in class_name:
            return "video"
        else:
            return "unknown"

        
    def _setup_assets_dirs(self) -> Dict[str, Path]:
        """设置资源目录"""
        return {
            'preview': self.preview_dir,
            'images': self.preview_dir / self.relative_images_dir,
            'videos': self.preview_dir / self.relative_videos_dir, 
            'audios': self.preview_dir / self.relative_audios_dir
        }
    
    @abstractmethod
    def _generate_config_files(self) -> None:
        """生成配置文件（子类必须实现）"""
        pass

    def generate(self) -> Tuple[List[str], str]:
        """
        生成广告文件
        
        Returns:
            tuple: (输出文件路径列表, 预览URL)
        """
        try:
            logger.info(f"Generating ad for project: {self.output_id}")
            
            # 1. 准备项目结构
            self._prepare_project_structure()
            
            # 2. 复制模板文件
            self._copy_template_files()
            
            # 3. 生成配置文件
            self._generate_config_files()
            
            # 4. 清理空的资源目录
            self._cleanup_empty_asset_directories()
            
            # 5. 为各平台生成输出文件
            output_paths = self._generate_platform_outputs()
            
            # 6. 创建预览URL
            preview_url = f"/projects/{self.output_id}/preview/index.html"
        
            return output_paths, preview_url
        except Exception as e:
            logger.error(f"Failed to generate ad: {str(e)}")
            raise
    
    def _prepare_project_structure(self) -> None:
        """准备项目目录结构"""
        try:
            # 创建项目目录结构
            create_assets_directory_structure(self.project_dir)
            logger.info(f"Project structure created: {self.project_dir}")
            
        except Exception as e:
            logger.error(f"Failed to create project structure: {str(e)}")
            raise
    
    def _copy_template_files(self) -> None:
        """复制模板文件（基础实现，子类可重写）"""
        try:
            # 确定模板目录
            template_type = "image" if hasattr(self.request, 'images') else "video"
            template_dir = Path(__file__).parent.parent / "templates" / template_type
            preview_dir = self.assets_dirs['preview']
            
            # 复制template_dir下的所有文件和目录
            for item in template_dir.iterdir():
                if item.is_file():
                    # 复制文件
                    dst_file = preview_dir / item.name
                    copy_file_safely(item, dst_file)
                elif item.is_dir():
                    # 复制目录
                    dst_dir = preview_dir / item.name
                    dst_dir.mkdir(parents=True, exist_ok=True)
                    # 递归复制目录内容
                    self._copy_directory_contents(item, dst_dir)
            
        except Exception as e:
            logger.error(f"Failed to copy template files: {str(e)}")
            raise
    
    def _copy_directory_contents(self, src_dir: Path, dst_dir: Path) -> None:
        """递归复制目录内容"""
        for item in src_dir.iterdir():
            if item.is_file():
                dst_file = dst_dir / item.name
                copy_file_safely(item, dst_file)
            elif item.is_dir():
                dst_subdir = dst_dir / item.name
                dst_subdir.mkdir(parents=True, exist_ok=True)
                self._copy_directory_contents(item, dst_subdir)


    def _cleanup_empty_asset_directories(self) -> None:
        """清理空的资源目录"""
        try:
            asset_dirs = ['images', 'videos', 'audios']
            for dir_name in asset_dirs:
                asset_dir = self.assets_dirs['preview'] / "assets" / dir_name
                if asset_dir.exists() and not any(asset_dir.iterdir()):
                    asset_dir.rmdir()
        except Exception as e:
            logger.error(f"Failed to cleanup empty asset directories: {str(e)}")

    def _generate_platform_outputs(self) -> List[str]:
        """生成平台特定输出文件（公共逻辑）"""
        try:
            output_paths = []
            platform_service = PlatformService()
            
            # 创建outputs目录
            outputs_dir = self.project_dir / "outputs"
            outputs_dir.mkdir(exist_ok=True)
            
            # 获取方向和语言信息
            orientation = "portrait"
            if hasattr(self.request, 'orientation') and self.request.orientation:
                orientation = self.request.orientation.value if hasattr(self.request.orientation, 'value') else str(self.request.orientation).lower()
            
            language = "en"
            if hasattr(self.request, 'language') and self.request.language:
                language = self.request.language.value if hasattr(self.request.language, 'value') else str(self.request.language).lower()
            
            app_name = "PlayableAds"
            if hasattr(self.request, 'app_name') and self.request.app_name:
                app_name = self.request.app_name
            
            version = "1.0"
            if hasattr(self.request, 'version') and self.request.version:
                version = self.request.version
            
            # 为每个平台生成独立的文件
            if hasattr(self.request, 'platforms') and self.request.platforms:
                for platform in self.request.platforms:
                    platform_name = platform.value if hasattr(platform, 'value') else str(platform).lower()
                    
                    # 检查是否为支持的平台
                    if platform_name not in platform_service.get_supported_platforms():
                        logger.warning(f"Unknown platform: {platform_name}")
                        continue
                    
                    # 为每个平台创建独立的临时文件夹
                    temp_platform_dir = self.project_dir / f"temp_{platform_name}_{int(time.time())}"
                    try:
                        # 复制预览文件到临时文件夹
                        shutil.copytree(self.assets_dirs['preview'], temp_platform_dir)
                        
                        # 为当前平台生成特定的文件
                        platform_service.generate_platform_need_files(temp_platform_dir, platform_name, orientation, language)
                        
                        # 为当前平台应用特定的修改
                        platform_service._apply_single_platform_modifications(
                            temp_platform_dir,
                            platform_name,
                            orientation,
                            language,
                            app_name
                        )
                        
                        # 根据平台类型创建文件
                        if platform_service.is_zip_platform(platform_name):
                            output_path = self._create_zip_package(platform_name, outputs_dir, temp_platform_dir, app_name, language, version, orientation)
                        elif platform_service.is_html_platform(platform_name):
                            output_path = self._create_single_html(platform_name, outputs_dir, temp_platform_dir, app_name, language, version, orientation)
                        else:
                            logger.warning(f"Unknown output format for platform: {platform_name}")
                            continue
                        
                        if output_path:
                            output_paths.append(output_path)
                            
                    except Exception as e:
                        logger.error(f"Failed to process platform {platform_name}: {str(e)}")
                        
                    finally:
                        # 清理临时文件夹
                        if temp_platform_dir.exists():
                            shutil.rmtree(temp_platform_dir)
            
            # 如果有多个平台，创建总压缩包
            if len(self.request.platforms) > 1:
                all_platforms_zip = self._create_all_platforms_package(outputs_dir, app_name, language, version)
                if all_platforms_zip:
                    return [all_platforms_zip]
            
            return output_paths
            
        except Exception as e:
            logger.error(f"Failed to generate platform outputs: {str(e)}")
            raise
    
    
    def _create_zip_package(self, platform: str, outputs_dir: Path, temp_platform_dir: Path, app_name: str, language: str, version: str, orientation: str) -> str:
        """创建ZIP包"""
        try:
            preview_dir = temp_platform_dir
            
            # 生成文件名：app_name-interaction_type-platform-language-version.zip
            safe_app_name = self._sanitize_filename(app_name)
            interaction_type = self.get_interaction_type()
            filename = f"{safe_app_name}-{interaction_type}-{platform}-{language}-{version}.zip"
            zip_file_path = outputs_dir / filename
            
            with zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # 添加所有预览目录文件到ZIP
                for file_path in preview_dir.rglob('*'):
                    if file_path.is_file() and not file_path.name.startswith('.'):
                        # 计算相对路径
                        arcname = file_path.relative_to(preview_dir)
                        zipf.write(file_path, arcname)
            
            download_url = f"{BACKEND_BASE_URL}/api/file/download/{self.project_dir.name}/outputs/{filename}"
            return download_url
            
        except Exception as e:
            logger.error(f"Failed to create ZIP package for {platform}: {str(e)}")
            return ""
    
    def _create_single_html(self, platform: str, outputs_dir: Path, temp_platform_dir: Path, app_name: str, language: str, version: str, orientation: str) -> str:
        """创建单文件HTML"""
        preview_dir = temp_platform_dir
        
        # 读取各个文件内容
        html_content = self._read_template_file(preview_dir / "index.html")
        css_content = self._read_template_file(preview_dir / "style.css")
        js_content = self._read_template_file(preview_dir / "main.js")
        config_content = self._read_template_file(preview_dir / "config.js")
        
        # 对于单文件HTML，不需要生成images.js，而是直接修改config.js中的图片路径为base64
        images_content = ""  # 单文件模式下不使用images.js
        
        # 处理音频文件（转换为base64）
        audio_base64_data = self._process_audio_files_for_html()
        
        # 修改config内容：将图片路径替换为base64数据，设置singleFileMode为true
        import json
        if config_content and config_content.strip():
            # 解析config内容
            config_start = config_content.find('{')
            config_end = config_content.rfind('}') + 1
            if config_start != -1 and config_end > config_start:
                config_json_str = config_content[config_start:config_end]
                try:
                    config_obj = json.loads(config_json_str)
                    
                    # 将图片路径替换为base64数据
                    image_base64_data = self._process_image_files_for_html(preview_dir)
                    if image_base64_data:
                        config_obj = self._replace_image_paths_with_base64(config_obj, image_base64_data)
                        logger.info("Replaced image paths with base64 data in config")
                    
                    # 设置singleFileMode为true（因为图片已经是base64格式）
                    config_obj['singleFileMode'] = True
                    
                    new_config_json = json.dumps(config_obj, indent=2, ensure_ascii=False)
                    config_content = config_content[:config_start] + new_config_json + config_content[config_end:]
                    logger.info("Modified config for single file HTML with base64 images")
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse config JSON: {e}")
        
        # 如果有音频文件，更新config内容中的音频路径
        if audio_base64_data:
            for audio_file, base64_data in audio_base64_data.items():
                config_content = config_content.replace(audio_file, base64_data)

        # 处理视频文件（转换为base64）
        video_base64_data = self._process_video_files_for_html()
        # 修改config内容：将视频路径替换为base64数据
        if video_base64_data:   
            for video_file, base64_data in video_base64_data.items():
                config_content = config_content.replace(video_file, base64_data)

        # 构建单文件HTML
        single_html = self._build_single_html(
            html_content, css_content, js_content, config_content
        )
        
        # 生成文件名：app_name-interaction_type-platform-language-version.html
        safe_app_name = self._sanitize_filename(app_name)
        interaction_type = self.get_interaction_type()
        filename = f"{safe_app_name}-{interaction_type}-{platform}-{language}-{version}.html"
        html_file_path = outputs_dir / filename
        
        # 保存单文件HTML
        with open(html_file_path, 'w', encoding='utf-8') as f:
            f.write(single_html)
        
        return f"{BACKEND_BASE_URL}/api/file/download/{self.output_id}/outputs/{filename}"
    
    def _sanitize_filename(self, filename: str) -> str:
        """
        清理文件名，移除不安全字符
        
        Args:
            filename: 原始文件名
            
        Returns:
            str: 清理后的安全文件名
        """
        import re
        # 移除或替换不安全字符
        safe_name = re.sub(r'[<>:"/\\|?*\s]', '-', filename)
        # 移除多余的连字符
        safe_name = re.sub(r'-+', '-', safe_name)
        # 移除开头和结尾的连字符
        safe_name = safe_name.strip('-')
        # 如果为空，使用默认名称
        if not safe_name:
            safe_name = "PlayableAd"
        return safe_name
    
    def _create_all_platforms_package(self, outputs_dir: Path, app_name: str, language: str, version: str) -> str:
        """
        创建包含所有平台文件的总压缩包
        
        Args:
            outputs_dir: 输出目录
            app_name: 应用名称
            language: 语言
            version: 版本
            
        Returns:
            str: 下载URL
        """
        try:
            safe_app_name = self._sanitize_filename(app_name)
            interaction_type = self.get_interaction_type()
            filename = f"{safe_app_name}-{interaction_type}-all-platforms-{language}-{version}.zip"
            all_platforms_zip = outputs_dir / filename
            
            with zipfile.ZipFile(all_platforms_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # 添加所有已生成的平台文件
                for file_path in outputs_dir.glob('*'):
                    if file_path.is_file() and file_path.name != filename:
                        zipf.write(file_path, file_path.name)
            
            download_url = f"{BACKEND_BASE_URL}/api/file/download/{self.project_dir.name}/outputs/{filename}"
            return download_url
            
        except Exception as e:
            logger.error(f"Failed to create all platforms package: {str(e)}")
            return ""
    
    def _read_template_file(self, file_path: Path) -> str:
        """读取模板文件内容"""
        try:
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                logger.warning(f"Template file not found: {file_path}")
                return ""
        except Exception as e:
            logger.error(f"Failed to read template file {file_path}: {str(e)}")
            return ""
    
    def _process_audio_files_for_html(self) -> Dict[str, str]:
        """处理音频文件，转换为base64数据"""
        audio_base64_data = {}
        audio_dir = self.assets_dirs['audios']
        
        if not audio_dir.exists():
            return audio_base64_data
        
        for audio_file in audio_dir.glob('*'):
            if audio_file.is_file():
                try:
                    with open(audio_file, 'rb') as f:
                        audio_data = base64.b64encode(f.read()).decode('utf-8')
                        audio_ext = audio_file.suffix.lower()[1:]
                        
                        # 确定MIME类型
                        mime_type = f"audio/{audio_ext}"
                        if audio_ext == "mp3":
                            mime_type = "audio/mpeg"
                        elif audio_ext == "wav":
                            mime_type = "audio/wav"
                        elif audio_ext == "m4a":
                            mime_type = "audio/mp4"
                        elif audio_ext == "ogg":
                            mime_type = "audio/ogg"
                        
                        relative_path = f"{self.relative_audios_dir}/{audio_file.name}"
                        audio_base64_data[relative_path] = f"data:{mime_type};base64,{audio_data}"
                        logger.info(f"Added base64 audio data for {audio_file.name}")
                        
                except Exception as e:
                    logger.error(f"Failed to encode audio file {audio_file}: {str(e)}")
        
        return audio_base64_data
    
    def _process_image_files_for_html(self, preview_dir: Path) -> Dict[str, str]:
        """处理图片文件，转换为base64格式用于单文件HTML"""
        image_base64_data = {}
        
        try:
            image_dir = self.assets_dirs['images']
            
            if image_dir.exists():
                for image_file in image_dir.iterdir():
                    if image_file.is_file():
                        try:
                            with open(image_file, "rb") as f:
                                image_data = f.read()
                                # 获取MIME类型
                                file_ext = image_file.suffix.lower()
                                mime_type = {
                                    '.png': 'image/png',
                                    '.jpg': 'image/jpeg',
                                    '.jpeg': 'image/jpeg',
                                    '.gif': 'image/gif',
                                    '.webp': 'image/webp',
                                    '.svg': 'image/svg+xml'
                                }.get(file_ext, 'image/png')
                                
                                base64_data = base64.b64encode(image_data).decode('utf-8')
                                data_uri = f"data:{mime_type};base64,{base64_data}"
                                
                                # 使用相对路径作为key
                                relative_path = f"{self.relative_images_dir}/{image_file.name}"
                                image_base64_data[relative_path] = data_uri
                        except Exception as e:
                            logger.error(f"Failed to convert image {image_file.name} to base64: {str(e)}")
            
        except Exception as e:
            logger.error(f"Failed to process image files for HTML: {str(e)}")
        
        return image_base64_data
    
    def _replace_image_paths_with_base64(self, config_obj: dict, image_base64_data: Dict[str, str]) -> dict:
        """在配置对象中将图片路径替换为base64数据"""
        def replace_in_value(value):
            if isinstance(value, str) and value in image_base64_data:
                return image_base64_data[value]
            elif isinstance(value, list):
                return [replace_in_value(item) for item in value]
            elif isinstance(value, dict):
                return {k: replace_in_value(v) for k, v in value.items()}
            return value
        
        return replace_in_value(config_obj)
    
    def _process_video_files_for_html(self) -> Dict[str, str]:
        """处理视频文件，转换为base64数据"""
        video_base64_data = {}
        video_dir = self.assets_dirs['videos']
        
        if not video_dir.exists():
            return video_base64_data
        
        for video_file in video_dir.glob('*'):
            logger.info('video_file: %s', video_file)
            if video_file.is_file():
                try:
                    with open(video_file, 'rb') as f:
                        video_data = base64.b64encode(f.read()).decode('utf-8')
                        video_ext = video_file.suffix.lower()[1:]
                        
                        # 确定MIME类型
                        mime_type = f"video/{video_ext}"
                        if video_ext == "mp4":
                            mime_type = "video/mp4"
                        elif video_ext == "webm":
                            mime_type = "video/webm"
                        
                        relative_path = f"{self.relative_videos_dir}/{video_file.name}"
                        video_base64_data[relative_path] = f"data:{mime_type};base64,{video_data}"
                        logger.info(f"Added base64 video data for {video_file.name}")
                        
                except Exception as e:
                    logger.error(f"Failed to encode video file {video_file}: {str(e)}")
        
        return video_base64_data
    
    def _build_single_html(self, html: str, css: str, js: str, config: str) -> str:
        """构建单文件HTML，基于传入的HTML模板进行处理"""
        # 处理CSS：将外部CSS链接替换为内联样式
        if css and css.strip():
            # 查找CSS链接标签并替换为内联样式
            css_link_pattern = r'<link[^>]*href=["\'][^"\']*style\.css["\'][^>]*>'
            css_inline = f'<style>\n{css}\n  </style>'
            html = re.sub(css_link_pattern, css_inline, html)
        
        # 处理JavaScript：替换外部JS文件引用
        if js and js.strip():
            # 替换main.js引用
            js_main_pattern = r'<script[^>]*src=["\'][^"\']*main\.js["\'][^>]*></script>'
            js_inline = f'<script>\n{js}\n  </script>'
            html = re.sub(js_main_pattern, js_inline, html)
        
        # 处理配置文件：替换config.js引用
        if config and config.strip():
            config_pattern = r'<script[^>]*src=["\'][^"\']*config\.js["\'][^>]*></script>'
            config_inline = f'<script>\n{config}\n  </script>'
            html = re.sub(config_pattern, config_inline, html)
        
        return html
    