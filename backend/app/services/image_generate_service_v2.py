"""
图片广告生成服务 v2 - 重构版本
基于 config_service 模式，使用函数化设计
"""
import os
import re
import shutil
import zipfile
import logging
import json
import base64
from pathlib import Path
from typing import Tuple, List, Dict, Any

from backend.app.models.schemas import ImageVideoGenerateRequest, Platform
from backend.app.services.imgae_config_service import ImageConfigGenerator
from backend.app.utils.file_utils import copy_file_safely, create_directory_structure
from backend.app.utils.response_utils import success_response, error_response
from backend.app.services.common import create_assets_directory_structure, validate_request_data
from backend.app.config import PROJECTS_DIR, BACKEND_BASE_URL

logger = logging.getLogger(__name__)


class ImageAdGenerator:
    """图片广告生成器类"""
    
    def __init__(self, request: ImageVideoGenerateRequest, output_id: str):
        """
        初始化图片广告生成器
        
        Args:
            request: 图片广告生成请求
            output_id: 输出项目ID
        """
        self.request = request
        self.output_id = output_id
        self.project_dir = PROJECTS_DIR / output_id
        
        # 验证请求数据
        is_valid, error_msg = validate_request_data(request, ['images', 'app_name'])
        if not is_valid:
            raise ValueError(error_msg)
    
    def generate(self) -> Tuple[List[str], str]:
        """
        生成图片广告
        
        Returns:
            tuple: (输出文件路径列表, 预览URL)
        """
        try:
            logger.info(f"Generating image ad for project: {self.output_id}")
            
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
            
            logger.info(f"Image ad generation completed for project: {self.output_id}")
            return output_paths, preview_url
            
        except Exception as e:
            logger.error(f"Failed to generate image ad: {str(e)}")
            raise
    
    def _prepare_project_structure(self) -> None:
        """准备项目目录结构"""
        # 确保项目目录存在
        os.makedirs(self.project_dir, exist_ok=True)
        
        # 创建预览目录的assets结构
        self.assets_dirs = create_assets_directory_structure(self.project_dir)
        
        logger.info(f"Project structure prepared for: {self.output_id}")
    
    def _copy_template_files(self) -> None:
        """复制模板文件到预览目录"""
        template_dir = Path("app/templates/image")
        if not template_dir.exists():
            raise FileNotFoundError(f"Template directory not found: {template_dir}")
        
        preview_dir = self.assets_dirs['preview']
        
        # 复制所有模板文件
        for file_path in template_dir.glob("*"):
            if file_path.is_file():
                target_path = preview_dir / file_path.name
                
                copy_file_safely(file_path, target_path)
                
                logger.info(f"Copied template file: {file_path.name}")
    
    def _generate_config_files(self) -> None:
        """生成配置文件"""
        preview_dir = self.assets_dirs['preview']
        
        # 使用ImageConfigGenerator生成配置
        config_generator = ImageConfigGenerator(
            self.request, 
            self.output_id, 
            preview_dir
        )
        
        # 生成config.js
        config_content = config_generator.generate_config()
        config_file = preview_dir / "config.js"
        with open(config_file, "w", encoding="utf-8") as f:
            f.write(config_content)
        logger.info("Generated config.js")
    
    def _cleanup_empty_asset_directories(self) -> None:
        """清理空的资源目录"""
        asset_subdirs = ['images', 'videos', 'audios']
        preview_dir = self.assets_dirs['preview']
        assets_dir = preview_dir / 'assets'
        
        for subdir_name in asset_subdirs:
            subdir_path = assets_dir / subdir_name
            if subdir_path.exists() and subdir_path.is_dir():
                # 检查目录是否为空
                if not any(subdir_path.iterdir()):
                    try:
                        subdir_path.rmdir()
                        logger.info(f"Removed empty asset directory: {subdir_name}")
                    except OSError as e:
                        logger.warning(f"Failed to remove empty directory {subdir_name}: {str(e)}")
    
    def _generate_platform_outputs(self) -> List[str]:
        """为各平台生成输出文件"""
        output_paths = []
        
        # 创建outputs目录
        outputs_dir = self.project_dir / "outputs"
        outputs_dir.mkdir(exist_ok=True)
        
        # 生成TikTok平台的config.json文件（如果需要）
        if Platform.TIKTOK in self.request.platforms:
            self._generate_tiktok_config()
        
        # 为每个平台生成文件
        for platform in self.request.platforms:
            platform_value = platform.value
            logger.info(f"Building for platform: {platform_value}")
            
            if platform_value in ["google", "facebook", "tiktok"]:
                # 需要ZIP包的平台
                output_path = self._create_zip_package(platform_value, outputs_dir)
            else:
                # 生成单文件HTML的平台
                output_path = self._create_single_html(platform_value, outputs_dir)
            
            if output_path:
                output_paths.append(output_path)
        
        # 如果有多个平台，创建一个包含所有平台文件的总压缩包
        if len(self.request.platforms) > 1:
            all_platforms_zip = self._create_all_platforms_package(outputs_dir)
            if all_platforms_zip:
                # 返回总压缩包路径，而不是单个文件路径
                return [all_platforms_zip]
        
        return output_paths
    
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
        preview_dir = self.assets_dirs['preview']
        zip_file_path = outputs_dir / f"{platform}.zip"
        
        with zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in preview_dir.glob('**/*'):
                if file_path.is_file():
                    # 使用相对路径作为ZIP内的文件名
                    arcname = file_path.relative_to(preview_dir)
                    zipf.write(file_path, arcname)
                    logger.debug(f"Added {arcname} to ZIP file")
        
        logger.info(f"Created ZIP package: {zip_file_path}")
        return f"{BACKEND_BASE_URL}/api/file/download/{self.output_id}/outputs/{platform}.zip"
    
    def _create_all_platforms_package(self, outputs_dir: Path) -> str:
        """创建包含所有平台文件的总压缩包"""
        try:
            all_platforms_zip = outputs_dir / "all_platforms.zip"
            
            with zipfile.ZipFile(all_platforms_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # 遍历outputs目录中的所有文件（除了即将创建的总压缩包和系统文件）
                for file_path in outputs_dir.glob("*"):
                    if (file_path.is_file() and 
                        file_path.name != "all_platforms.zip" and 
                        not file_path.name.startswith('.DS_Store') and 
                        not file_path.name.startswith('._')):
                        # 直接使用文件名作为ZIP内的文件名
                        zipf.write(file_path, file_path.name)
                        logger.debug(f"Added {file_path.name} to all platforms package")
            
            logger.info(f"Created all platforms package: {all_platforms_zip}")
            return f"{BACKEND_BASE_URL}/api/file/download/{self.output_id}/outputs/all_platforms.zip"
            
        except Exception as e:
            logger.error(f"Failed to create all platforms package: {str(e)}")
            return None
    
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
                # 使用json.dumps确保字符串正确转义
                old_value = json.dumps(audio_file)
                new_value = json.dumps(base64_data)
                logger.info('old_value: %s', old_value)
                # logger.info('new_value: %s', new_value)
                config_content = config_content.replace(audio_file, base64_data)
        
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
        except Exception as e:
            logger.warning(f"Failed to read template file {file_path}: {str(e)}")
        return ""
    
    def _process_audio_files_for_html(self) -> Dict[str, str]:
        """处理音频文件，转换为base64数据"""
        audio_base64_data = {}
        audio_dir = self.assets_dirs['audios']
        
        if not audio_dir.exists():
            return audio_base64_data
        
        for audio_file in audio_dir.glob('*'):
            logger.info('audio_file: %s', audio_file)
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
                        
                        relative_path = f"assets/audios/{audio_file.name}"
                        audio_base64_data[relative_path] = f"data:{mime_type};base64,{audio_data}"
                        logger.info(f"Added base64 audio data for {audio_file.name}")
                        
                except Exception as e:
                    logger.error(f"Failed to encode audio file {audio_file}: {str(e)}")
        
        return audio_base64_data
    
    def _process_image_files_for_html(self, preview_dir: Path) -> Dict[str, str]:
        """处理图片文件，转换为base64格式用于单文件HTML"""
        image_base64_data = {}
        
        try:
            image_dir = preview_dir / "assets" / "images"
            
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
                                relative_path = f"assets/images/{image_file.name}"
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
    
    def _build_single_html(self, html: str, css: str, js: str, config: str) -> str:
        """构建单文件HTML，基于传入的HTML模板进行处理"""
        # 处理CSS：将外部CSS链接替换为内联样式
        if css and css.strip():
            # 查找CSS链接标签并替换为内联样式
            css_link_pattern = r'<link[^>]*href=["\'][^"\']*style\.css["\'][^>]*>'
            css_inline = f'<style>\n{css}\n  </style>'
            html = re.sub(css_link_pattern, css_inline, html)
            
            # # 如果没找到CSS链接，在</head>前插入样式
            # if '<style>' not in html:
            #     head_end = html.find('</head>')
            #     if head_end != -1:
            #         html = html[:head_end] + f'  <style>\n{css}\n  </style>\n' + html[head_end:]
        
        # 处理JavaScript：替换外部JS文件引用
        if js and js.strip():
            # 替换main.js引用
            js_main_pattern = r'<script[^>]*src=["\'][^"\']*main\.js["\'][^>]*></script>'
            js_inline = f'<script>\n{js}\n  </script>'
            html = re.sub(js_main_pattern, js_inline, html)
            
            # # 如果没找到main.js引用，在</body>前插入脚本
            # if 'main.js' not in html:
            #     body_end = html.find('</body>')
            #     if body_end != -1:
            #         html = html[:body_end] + f'  <script>\n{js}\n  </script>\n' + html[body_end:]
        
        # 处理配置文件：替换config.js引用
        if config and config.strip():
            config_pattern = r'<script[^>]*src=["\'][^"\']*config\.js["\'][^>]*></script>'
            config_inline = f'<script>\n{config}\n  </script>'
            html = re.sub(config_pattern, config_inline, html)
            
            # # 如果没找到config.js引用，在main.js之前插入配置
            # if 'config.js' not in html:
            #     # 在最后一个</script>前插入配置
            #     last_script_end = html.rfind('</script>')
            #     if last_script_end != -1:
            #         html = html[:last_script_end + 9] + f'\n  <script>\n{config}\n  </script>' + html[last_script_end + 9:]
        
        return html


# 便捷函数
async def generate_image_ad_html(request: ImageVideoGenerateRequest, output_id: str) -> Tuple[List[str], str]:
    """
    生成互动图片广告HTML文件（便捷函数）
    
    Args:
        request: 生成请求
        output_id: 输出ID
        
    Returns:
        tuple: (输出文件路径列表, 预览URL)
    """
    try:
        generator = ImageAdGenerator(request, output_id)
        return generator.generate()
    except Exception as e:
        logger.error(f"Image ad generation failed: {str(e)}")
        raise
