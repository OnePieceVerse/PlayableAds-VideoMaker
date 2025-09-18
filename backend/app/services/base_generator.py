"""
基础广告生成器类

包含图片和视频广告生成器的公共逻辑
"""

import os
import logging
import re
import json
import zipfile
import base64
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Tuple, Union, Optional, Any

from backend.app.models.schemas import Platform
from backend.app.config import PROJECTS_DIR, BACKEND_BASE_URL
from backend.app.models.schemas import ImageVideoGenerateRequest, VideoGenerateRequest
from backend.app.utils.file_utils import copy_file_safely, create_directory_structure
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
            
            # 复制所有模板文件
            template_files = ["index.html", "style.css", "main.js"]
            
            for filename in template_files:
                src_file = template_dir / filename
                dst_file = preview_dir / filename
                
                if src_file.exists():
                    copy_file_safely(src_file, dst_file)
                    logger.debug(f"Copied template file: {filename}")
                else:
                    logger.warning(f"Template file not found: {src_file}")
            
            logger.info("Template files copied successfully")
            
        except Exception as e:
            logger.error(f"Failed to copy template files: {str(e)}")
            raise

    def _apply_platform_modifications(self, zipf: zipfile.ZipFile, platform: str, arcname: str) -> None:
        """应用平台特定修改"""
        try:
            # 读取原始HTML内容
            html_content = zipf.read(arcname).decode('utf-8')
            
            # 获取方向
            orientation = "portrait"
            if hasattr(self.request, 'orientation') and self.request.orientation:
                orientation = self.request.orientation.value if hasattr(self.request.orientation, 'value') else str(self.request.orientation).lower()
            
            # 应用平台特定修改
            platform_service = PlatformService()
            modified_html = platform_service.apply_platform_modifications(html_content, platform, orientation)
            
            # 更新ZIP中的文件
            zipf.writestr(arcname, modified_html.encode('utf-8'))
            
        except Exception as e:
            logger.error(f"Failed to apply platform modifications for {platform}: {str(e)}")


 
    def _cleanup_empty_asset_directories(self) -> None:
        """清理空的资源目录"""
        try:
            asset_dirs = ['images', 'videos', 'audios']
            for dir_name in asset_dirs:
                asset_dir = self.assets_dirs['preview'] / "assets" / dir_name
                if asset_dir.exists() and not any(asset_dir.iterdir()):
                    asset_dir.rmdir()
                    logger.info(f"Removed empty directory: {asset_dir}")
        except Exception as e:
            logger.error(f"Failed to cleanup empty asset directories: {str(e)}")

    def _generate_platform_outputs(self) -> List[str]:
        """生成平台特定输出文件（公共逻辑）"""
        try:
            output_paths = []
            
            # 创建outputs目录
            outputs_dir = self.project_dir / "outputs"
            outputs_dir.mkdir(exist_ok=True)
            
            # 根据平台生成相应文件
            if hasattr(self.request, 'platforms') and self.request.platforms:
                for platform in self.request.platforms:
                    platform_name = platform.value if hasattr(platform, 'value') else str(platform).lower()
                    
                    if platform_name == "tiktok":
                        self._generate_tiktok_config()
                        output_path = self._create_zip_package(platform_name, outputs_dir)
                    elif platform_name in ["google", "facebook"]:
                        output_path = self._create_zip_package(platform_name, outputs_dir)
                    elif platform_name in ["applovin", "moloco"]:
                        output_path = self._create_single_html(platform_name, outputs_dir)
                    else:
                        logger.warning(f"Unknown platform: {platform_name}")
                        continue
                    
                    if output_path:
                        output_paths.append(output_path)
            
            # 如果有多个平台，创建总压缩包
            if len(self.request.platforms) > 1:
                all_platforms_zip = self._create_all_platforms_package(outputs_dir)
                if all_platforms_zip:
                    return [all_platforms_zip]
            
            return output_paths
            
        except Exception as e:
            logger.error(f"Failed to generate platform outputs: {str(e)}")
            raise
    
    def _generate_tiktok_config(self) -> None:
        """生成TikTok平台的config.json文件"""
        try:
            # 获取方向和语言
            orientation = "portrait"
            if hasattr(self.request, 'orientation') and self.request.orientation:
                orientation = self.request.orientation.value if hasattr(self.request.orientation, 'value') else str(self.request.orientation).lower()
            
            language = "en"
            if hasattr(self.request, 'language') and self.request.language:
                language = self.request.language.value if hasattr(self.request.language, 'value') else str(self.request.language).lower()
            
            config_json = {
                "playable_orientation": orientation,
                "playable_languages": [language]
            }
            
            config_file = self.assets_dirs['preview'] / "config.json"
            with open(config_file, "w", encoding="utf-8") as f:
                json.dump(config_json, f, indent=2)
            
            logger.info("Generated config.json for TikTok platform")
            
        except Exception as e:
            logger.error(f"Failed to generate config.json for TikTok: {str(e)}")
    
    def _create_zip_package(self, platform: str, outputs_dir: Path) -> str:
        """创建ZIP包"""
        try:
            preview_dir = self.assets_dirs['preview']
            zip_file_path = outputs_dir / f"{platform}.zip"
            
            with zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # 添加所有预览目录文件到ZIP
                for file_path in preview_dir.rglob('*'):
                    if file_path.is_file() and not file_path.name.startswith('.'):
                        # 计算相对路径
                        arcname = file_path.relative_to(preview_dir)
                        zipf.write(file_path, arcname)
                        
                        # 应用平台特定修改
                        if file_path.name == "index.html":
                            self._apply_platform_modifications(zipf, platform, str(arcname))
            
            download_url = f"{BACKEND_BASE_URL}/api/file/download/{self.project_dir.name}/outputs/{platform}.zip"
            logger.info(f"Created {platform} ZIP package: {zip_file_path}")
            return download_url
            
        except Exception as e:
            logger.error(f"Failed to create ZIP package for {platform}: {str(e)}")
            return ""
    
    def _create_single_html(self, platform: str, outputs_dir: Path) -> str:
        """创建单文件HTML"""
        preview_dir = self.assets_dirs['preview']
        
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
        
        # 保存单文件HTML
        html_file_path = outputs_dir / f"{platform}.html"
        with open(html_file_path, 'w', encoding='utf-8') as f:
            f.write(single_html)
        
        logger.info(f"Created single HTML file: {html_file_path}")
        return f"{BACKEND_BASE_URL}/api/file/download/{self.output_id}/outputs/{platform}.html"
    
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
                                
                                logger.info(f"Converted image to base64: {image_file.name}")
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
    
    def _create_all_platforms_package(self, outputs_dir: Path) -> str:
        """创建包含所有平台文件的总压缩包"""
        try:
            all_platforms_zip = outputs_dir / "all_platforms.zip"
            
            with zipfile.ZipFile(all_platforms_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # 遍历outputs目录中的所有文件
                for file_path in outputs_dir.iterdir():
                    if (file_path.is_file() and 
                        file_path.name != "all_platforms.zip" and
                        not file_path.name.startswith('.DS_Store') and
                        not file_path.name.startswith('._')):
                        zipf.write(file_path, file_path.name)
            
            download_url = f"{BACKEND_BASE_URL}/api/file/download/{self.project_dir.name}/outputs/all_platforms.zip"
            logger.info(f"Created all platforms package: {all_platforms_zip}")
            return download_url
            
        except Exception as e:
            logger.error(f"Failed to create all platforms package: {str(e)}")
            return ""


class PlatformService:
    """处理不同平台特定内容的服务类"""
    
    @staticmethod
    def get_platform_head_content(platform: Platform, language: str = "en", orientation: str = "portrait") -> str:
        """获取平台特定的head部分内容"""
        if platform == Platform.GOOGLE:
            return f'''    <meta name="ad.orientation" content="{orientation}">
    <meta name="ad.language" content="{language}">
    <script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"></script>'''
        
        # 其他平台暂时不需要特殊的head内容
        return ""
    
    @staticmethod
    def get_platform_body_end_content(platform: Platform) -> str:
        """获取平台特定的body结束前的内容"""
        if platform == Platform.TIKTOK:
            return '  <script src="https://sf16-muse-va.ibytedtos.com/obj/union-fe-nc-i18n/playable/sdk/playable-sdk.js"></script>'
        
        # 其他平台暂时不需要特殊的body内容
        return ""
    
    @staticmethod
    def get_platform_cta_code(platform: Platform) -> str:
        """获取平台特定的CTA点击代码"""
        cta_codes = {
            Platform.GOOGLE: "window.ExitApi.exit();",
            Platform.FACEBOOK: "window.FbPlayableAd.onCTAClick();",
            Platform.APPLOVIN: "window.mraid.open();",
            Platform.MOLOCO: "window.FbPlayableAd.onCTAClick();",
            Platform.TIKTOK: "window.openAppStore();"
        }
        
        return cta_codes.get(platform, "window.location.href = '#';")
    
    @staticmethod
    def requires_zip_packaging(platform: Platform) -> bool:
        """检查平台是否需要ZIP打包"""
        return platform in [Platform.GOOGLE, Platform.TIKTOK]
    
    @staticmethod
    def requires_config_json(platform: Platform) -> bool:
        """检查平台是否需要config.json文件"""
        return platform == Platform.TIKTOK
    
    @staticmethod
    def get_platform_file_extension(platform: Platform) -> str:
        """获取平台输出文件的扩展名"""
        if PlatformService.requires_zip_packaging(platform):
            return ".zip"
        return ".html"
    
    @staticmethod
    def apply_platform_modifications(html_content: str, platform: Platform, language: str = "en", app_name: str = "PlayableAds", orientation: str = "portrait") -> str:
        """应用平台特定的HTML修改"""
        modified_content = html_content
        
        # 1. 添加平台特定的head内容
        head_content = PlatformService.get_platform_head_content(platform, language, orientation)
        if head_content:
            modified_content = modified_content.replace(
                '<head>',
                f'<head>\n{head_content}'
            )
        
        # 2. 添加平台特定的body结束内容
        body_end_content = PlatformService.get_platform_body_end_content(platform)
        if body_end_content:
            modified_content = modified_content.replace(
                '</body>',
                f'{body_end_content}\n</body>'
            )
        
        # 3. 替换CTA代码
        cta_code = PlatformService.get_platform_cta_code(platform)
        modified_content = modified_content.replace(
            'window.location.href = config.cta_start_button.url;',
            cta_code
        )
        
        # 4. 设置语言
        modified_content = modified_content.replace(
            '<html lang="en">',
            f'<html lang="{language}">'
        )
        
        # 5. 设置应用名称
        modified_content = modified_content.replace(
            '<title>Playable Ad</title>',
            f'<title>{app_name}</title>'
        )
        
        return modified_content
    
    @staticmethod
    def get_platform_specific_files(platform: Platform, project_dir: Path) -> Dict[str, Optional[Path]]:
        """获取平台特定需要的文件"""
        files = {}
        
        if platform == Platform.TIKTOK:
            config_json = project_dir / "config.json"
            files['config_json'] = config_json if config_json.exists() else None
        
        return files
    
    @staticmethod
    def validate_platform_requirements(platform: Platform, project_dir: Path) -> Dict[str, Any]:
        """验证平台特定的要求"""
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # TikTok平台特定验证
        if platform == Platform.TIKTOK:
            config_json = project_dir / "config.json"
            if not config_json.exists():
                validation_result["warnings"].append("TikTok platform recommends including config.json file")
        
        # Google平台特定验证
        if platform == Platform.GOOGLE:
            # 可以添加Google特定的验证逻辑
            pass
        
        # Facebook平台特定验证
        if platform == Platform.FACEBOOK:
            # 可以添加Facebook特定的验证逻辑
            pass
        
        return validation_result