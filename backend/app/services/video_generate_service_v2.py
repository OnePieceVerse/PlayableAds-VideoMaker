"""
视频广告生成服务 v2 - 重构版本
基于 image_generate_service_v2 模式，使用 video_config_service
"""
import os
import shutil
import zipfile
import logging
from pathlib import Path
from typing import Tuple, List, Dict, Any

from backend.app.models.schemas import VideoGenerateRequest, Platform
from backend.app.services.video_config_service import ConfigGenerator
from backend.app.utils.file_utils import copy_file_safely, create_directory_structure
from backend.app.utils.response_utils import success_response, error_response
from backend.app.services.common import create_assets_directory_structure, validate_request_data
from backend.app.config import PROJECTS_DIR, BACKEND_BASE_URL

logger = logging.getLogger(__name__)


class VideoAdGenerator:
    """视频广告生成器类"""
    
    def __init__(self, request: VideoGenerateRequest, output_id: str):
        """
        初始化视频广告生成器
        
        Args:
            request: 视频广告生成请求
            output_id: 输出项目ID
        """
        self.request = request
        self.output_id = output_id
        self.project_dir = PROJECTS_DIR / output_id
        
        # 验证请求数据
        is_valid, error_msg = validate_request_data(request, ['video_id', 'app_name'])
        if not is_valid:
            raise ValueError(error_msg)
    
    def generate(self) -> Tuple[List[str], str]:
        """
        生成视频广告
        
        Returns:
            tuple: (输出文件路径列表, 预览URL)
        """
        try:
            logger.info(f"Generating video ad for project: {self.output_id}")
            
            # 1. 设置项目目录
            self._setup_project_directory()
            
            # 2. 复制模板文件
            self._copy_template_files()

            # 3. 生成配置文件
            self._generate_config_files()
            
            # 4. 清理空的资源目录
            self._cleanup_empty_asset_directories()
            
            # 5. 生成平台特定文件
            output_files = self._generate_platform_files()
            
            # 6. 生成预览URL
            preview_url = f"/projects/{self.output_id}/preview/index.html"
            
            logger.info(f"Video ad generation completed: {len(output_files)} files generated")
            return output_files, preview_url
            
        except Exception as e:
            logger.error(f"Video ad generation failed: {str(e)}")
            raise
    
    def _setup_project_directory(self):
        """设置项目目录结构"""
        try:
            # 创建预览目录
            preview_dir = self.project_dir / "preview"
            preview_dir.mkdir(parents=True, exist_ok=True)
            
            # 创建assets目录结构
            create_assets_directory_structure(preview_dir)
            
            logger.info(f"Project directory setup completed: {self.project_dir}")
            
        except Exception as e:
            logger.error(f"Failed to setup project directory: {str(e)}")
            raise
    
    def _generate_config_files(self):
        """生成配置文件"""
        try:
            preview_dir = self.project_dir / "preview"
            
            # 使用 ConfigGenerator 生成配置
            config_generator = ConfigGenerator(self.request)
            config_content = config_generator.generate_config()
            
            # 写入 config.js 文件
            config_file = preview_dir / "config.js"
            with open(config_file, "w", encoding="utf-8") as f:
                f.write(config_content)
            
            logger.info(f"Config files generated: {config_file}")
            
        except Exception as e:
            logger.error(f"Failed to generate config files: {str(e)}")
            raise
    
    def _cleanup_empty_asset_directories(self) -> None:
        """清理空的资源目录"""
        asset_subdirs = ['images', 'videos', 'audios']
        preview_dir = self.project_dir / "preview"
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
    
    def _copy_template_files(self):
        """复制模板文件"""
        try:
            # 模板目录
            template_dir = Path(__file__).parent.parent / "templates" / "video"
            preview_dir = self.project_dir / "preview"
            
            # 需要复制的模板文件
            template_files = ["index.html", "main.js", "style.css"]
            
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
    
    def _generate_platform_files(self) -> List[str]:
        """生成平台特定文件"""
        try:
            output_files = []
            
            # 创建outputs目录
            outputs_dir = self.project_dir / "outputs"
            outputs_dir.mkdir(exist_ok=True)
            
            # 如果指定了平台，生成对应的平台文件
            if hasattr(self.request, 'platforms') and self.request.platforms:
                for platform in self.request.platforms:
                    platform_files = self._generate_platform_specific_files(platform, outputs_dir)
                    output_files.extend(platform_files)
            else:
                # 默认生成通用版本
                preview_file = self.project_dir / "preview" / "index.html"
                if preview_file.exists():
                    output_files.append(str(preview_file))
            
            # 如果有多个平台，创建一个包含所有平台文件的总压缩包
            if hasattr(self.request, 'platforms') and len(self.request.platforms) > 1:
                all_platforms_zip = self._create_all_platforms_package(outputs_dir)
                if all_platforms_zip:
                    # 返回总压缩包路径，而不是单个文件路径
                    return [all_platforms_zip]
            
            return output_files
            
        except Exception as e:
            logger.error(f"Failed to generate platform files: {str(e)}")
            raise
    
    def _generate_platform_specific_files(self, platform: Platform, outputs_dir: Path) -> List[str]:
        """生成特定平台的文件"""
        try:
            platform_files = []
            
            if platform == Platform.GOOGLE:
                # 生成Google平台文件
                google_file = self._generate_google_file(outputs_dir)
                if google_file:
                    platform_files.append(google_file)
            
            elif platform == Platform.FACEBOOK:
                # 生成Facebook平台文件
                facebook_file = self._generate_facebook_file(outputs_dir)
                if facebook_file:
                    platform_files.append(facebook_file)
            
            # 可以添加其他平台的支持
            
            return platform_files
            
        except Exception as e:
            logger.error(f"Failed to generate {platform} platform files: {str(e)}")
            return []
    
    def _generate_google_file(self, outputs_dir: Path) -> str:
        """生成Google平台文件"""
        try:
            preview_dir = self.project_dir / "preview"
            google_file = outputs_dir / "google.zip"
            
            # 创建ZIP文件
            with zipfile.ZipFile(google_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # 添加所有预览文件到ZIP
                for file_path in preview_dir.rglob("*"):
                    if file_path.is_file():
                        arcname = file_path.relative_to(preview_dir)
                        zipf.write(file_path, arcname)
            
            logger.info(f"Google platform file generated: {google_file}")
            return f"{BACKEND_BASE_URL}/api/file/download/{self.output_id}/outputs/google.zip"
            
        except Exception as e:
            logger.error(f"Failed to generate Google file: {str(e)}")
            return None
    
    def _generate_facebook_file(self, outputs_dir: Path) -> str:
        """生成Facebook平台文件"""
        try:
            preview_dir = self.project_dir / "preview"
            facebook_file = outputs_dir / "facebook.html"
            
            # 复制index.html作为Facebook文件
            src_file = preview_dir / "index.html"
            if src_file.exists():
                copy_file_safely(src_file, facebook_file)
                logger.info(f"Facebook platform file generated: {facebook_file}")
                return f"{BACKEND_BASE_URL}/api/file/download/{self.output_id}/outputs/facebook.html"
            else:
                logger.warning("Source index.html not found for Facebook file")
                return None
                
        except Exception as e:
            logger.error(f"Failed to generate Facebook file: {str(e)}")
            return None
    
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


async def generate_video_ad_html(request: VideoGenerateRequest, output_id: str) -> Tuple[List[str], str]:
    """
    生成视频广告HTML（异步函数版本）
    
    Args:
        request: 视频广告生成请求
        output_id: 输出项目ID
        
    Returns:
        tuple: (输出文件URL列表, 预览URL)
    """
    try:
        logger.info(f"Starting video ad generation: {output_id}")
        
        # 创建视频广告生成器
        generator = VideoAdGenerator(request, output_id)
        
        # 生成广告
        output_files, preview_url = generator.generate()
        
        # 返回结果
        logger.info(f"Video ad generation completed successfully")
        logger.info(f"Output files: {len(output_files)}")
        logger.info(f"Preview URL: {preview_url}")
        
        return output_files, preview_url
        
    except Exception as e:
        logger.error(f"Video ad generation failed: {str(e)}")
        raise


# def generate_video_ad_sync(request: VideoGenerateRequest, output_id: str) -> Dict[str, Any]:
#     """
#     生成视频广告（同步函数版本）
    
#     Args:
#         request: 视频广告生成请求
#         output_id: 输出项目ID
        
#     Returns:
#         dict: 响应结果
#     """
#     try:
#         logger.info(f"Starting sync video ad generation: {output_id}")
        
#         # 创建视频广告生成器
#         generator = VideoAdGenerator(request, output_id)
        
#         # 生成广告
#         output_files, preview_url = generator.generate()
        
#         # 构建响应
#         response_data = {
#             "output_id": output_id,
#             "preview_url": preview_url,
#             "project_dir": str(generator.project_dir),
#             "output_files": output_files,
#             "file_count": len(output_files)
#         }
        
#         return success_response(response_data, "Video ad generated successfully")
        
#     except Exception as e:
#         logger.error(f"Sync video ad generation failed: {str(e)}")
#         return error_response(f"Video ad generation failed: {str(e)}")


# # 兼容性函数，保持与旧版本的接口一致
# def generate_playable_ad(request: VideoGenerateRequest, output_id: str = None) -> Dict[str, Any]:
#     """
#     生成可玩广告（兼容性函数）
    
#     Args:
#         request: 视频广告生成请求
#         output_id: 输出项目ID（可选）
        
#     Returns:
#         dict: 响应结果
#     """
#     if not output_id:
#         from backend.app.utils.id_utils import generate_timestamped_id
#         output_id = generate_timestamped_id()
    
#     return generate_video_ad_sync(request, output_id)
