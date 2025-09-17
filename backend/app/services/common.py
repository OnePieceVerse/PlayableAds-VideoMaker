"""
公共业务逻辑模块
"""
import base64
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from backend.app.utils.file_utils import copy_file_safely, get_file_mime_type
from backend.app.utils.validation_utils import validate_request_data as validate_request_data_util
from backend.app.config import PROJECTS_DIR
from backend.app.utils.audio_utils import get_system_audio_path

logger = logging.getLogger(__name__)


class BaseConfigGenerator:
    """基础配置生成器类"""
    
    def __init__(self, request, output_id: str, preview_dir: Path):
        """
        初始化基础配置生成器
        
        Args:
            request: 生成请求对象
            output_id: 输出项目ID
            preview_dir: 预览目录路径
        """
        self.request = request
        self.output_id = output_id
        self.preview_dir = preview_dir
        
        # 缓存处理后的数据
        self._images_data = None
        
    def add_image_to_data(self, image_path: Path, relative_path: str) -> None:
        """
        将图片添加到base64数据中
        
        Args:
            image_path: 图片文件路径
            relative_path: 相对路径
        """
        if self._images_data is None:
            self._images_data = {}
            
        try:
            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")
                image_ext = image_path.suffix.lower()[1:]  # 去掉点号
                mime_type = f"image/{image_ext}"
                if image_ext == "jpg":
                    mime_type = "image/jpeg"
                self._images_data[relative_path] = f"data:{mime_type};base64,{image_data}"
                logger.info(f"Added base64 image data for {relative_path}")
        except Exception as e:
            logger.error(f"Failed to encode image {image_path}: {str(e)}")
    
    def process_uploaded_images(self, image_ids: List[str], relative_dir: str) -> List[str]:
        """
        处理上传的图片文件
        
        Args:
            image_ids: 图片ID列表
            relative_dir: 相对目录路径
            
        Returns:
            List[str]: 相对路径列表
        """
        image_paths = []
        
        for image_id in image_ids:
            image_path = get_file_path(image_id)
            if image_path and image_path.exists():
                file_name = image_path.name
                relative_path = f"{relative_dir}/{file_name}"
                image_paths.append(relative_path)
                
                # 生成base64数据
                self.add_image_to_data(image_path, relative_path)
                logger.info(f"Processed image: {file_name}")
            else:
                logger.warning(f"Image file not found for ID: {image_id}")
        
        return image_paths
    
    def process_audio_files(self, audio_ids: List[str], relative_dir: str, audio_dir: Path) -> List[str]:
        """
        处理音频文件（包括上传文件和系统音频）
        
        Args:
            audio_ids: 音频ID列表
            relative_dir: 相对目录路径
            audio_dir: 音频目录路径
            
        Returns:
            List[str]: 相对路径列表
        """
        audio_paths = []
        
        for audio_id in audio_ids:
            # 首先尝试作为上传文件处理
            audio_path = get_file_path(audio_id)
            
            # 如果上传文件不存在，尝试作为系统音频处理
            if not audio_path or not audio_path.exists():
                audio_path = get_system_audio_path(audio_id)
                if audio_path:
                    logger.info(f"Found system audio: {audio_id}")
                    # 系统音频需要复制到预览目录
                    file_name = audio_path.name
                    target_path = audio_dir / file_name
                    if copy_file_safely(audio_path, target_path):
                        audio_paths.append(f"{relative_dir}/{file_name}")
                    continue
            
            if audio_path and audio_path.exists():
                file_name = audio_path.name
                # 上传的音频文件已经在正确位置，直接使用
                audio_paths.append(f"{relative_dir}/{file_name}")
                logger.info(f"Processed audio: {file_name}")
            else:
                logger.warning(f"Audio file not found for ID: {audio_id}")
        
        return audio_paths
    
    def create_responsive_size(self, scale: float) -> Dict[str, Dict[str, float]]:
        """
        创建响应式尺寸配置
        
        Args:
            scale: 缩放比例
            
        Returns:
            dict: 响应式尺寸配置
        """
        return {
            "landscape": {"width": scale},
            "portrait": {"width": scale}
        }
    
    def create_responsive_position(self, position) -> Dict[str, Dict[str, float]]:
        """
        创建响应式位置配置
        
        Args:
            position: 位置对象
            
        Returns:
            dict: 响应式位置配置
        """
        return {
            "landscape": {
                "x": round(position.left, 2),
                "y": round(position.top, 2)
            },
            "portrait": {
                "x": round(position.left, 2),
                "y": round(position.top, 2)
            }
        }


def get_file_path(file_id: str) -> Optional[Path]:
    """
    根据文件ID获取文件路径（简化版本）
    
    Args:
        file_id: 文件ID
        
    Returns:
        Path: 文件路径，如果未找到返回None
    """
    try:
        # 遍历所有项目目录查找文件
        for project_dir in PROJECTS_DIR.iterdir():
            if project_dir.is_dir():
                # 在项目目录及其子目录中查找文件
                for file_path in project_dir.rglob("*"):
                    if file_path.is_file() and file_path.stem == file_id:
                        return file_path
        
        logger.warning(f"File not found for ID: {file_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error finding file {file_id}: {str(e)}")
        return None
        
        
def create_assets_directory_structure(project_dir: Path) -> Dict[str, Path]:
    """
    创建预览目录的assets结构
    
    Args:
        project_dir: 项目目录
        
    Returns:
        dict: 包含各个assets子目录路径的字典
    """
    from backend.app.utils.file_utils import create_directory_structure
    
    preview_dir = project_dir / "preview"
    assets_dir = preview_dir / "assets"
    
    # 创建assets子目录
    subdirs = ["images", "videos", "audios"]
    dirs = create_directory_structure(assets_dir, subdirs)
    
    # 添加预览目录和assets目录
    dirs['preview'] = preview_dir
    dirs['assets'] = assets_dir
    
    return dirs


def find_duplicate_file_in_project(project_dir: Path, file_hash: str, file_extension: str, file_type: str) -> Tuple[bool, str, Path]:
    """
    在项目目录和preview/assets子目录中查找具有相同哈希值的文件
    
    Args:
        project_dir: 项目目录
        file_hash: 文件哈希值
        file_extension: 文件扩展名
        file_type: 文件类型 ('images', 'videos', 'audios')
    
    Returns:
        tuple: (是否找到重复文件, 文件ID, 文件路径)
    """
    from backend.app.utils.file_utils import calculate_file_hash, find_files_by_extension
    
    # 确保项目目录存在
    if not project_dir.exists():
        return False, "", Path()
    
    # 搜索路径列表
    search_paths = [
        project_dir,  # 项目根目录（向后兼容）
        project_dir / "preview" / "assets" / file_type,  # preview/assets/子目录
    ]
    
    # 在所有搜索路径中查找文件
    for search_path in search_paths:
        if not search_path.exists():
            continue
            
        files = find_files_by_extension(search_path, file_extension)
        for file_path in files:
            try:
                # 读取文件内容并计算哈希值
                with open(file_path, "rb") as f:
                    content = f.read()
                    existing_hash = calculate_file_hash(content)
                    
                    # 如果哈希值匹配，说明找到了重复文件
                    if existing_hash == file_hash:
                        file_id = file_path.stem  # 文件名不带扩展名作为ID
                        return True, file_id, file_path
            except Exception as e:
                logger.error(f"Error checking file {file_path}: {str(e)}")
    
    return False, "", Path()


def log_config_summary(config: Dict[str, Any], logger_instance: logging.Logger = None) -> None:
    """
    记录配置摘要信息
    
    Args:
        config: 配置字典
        logger_instance: 日志记录器实例
    """
    if logger_instance is None:
        logger_instance = logger
    
    logger_instance.info("Generated config summary:")
    
    # 记录基本信息
    if "title" in config:
        logger_instance.info(f"  - Title: {config['title']}")
    if "appName" in config:
        logger_instance.info(f"  - App Name: {config['appName']}")
    if "version" in config:
        logger_instance.info(f"  - Version: {config['version']}")
    
    # 记录内容统计
    if "appImgs" in config:
        logger_instance.info(f"  - Images: {len(config['appImgs'])}")
    if "hotspots" in config:
        logger_instance.info(f"  - Hotspots: {len(config['hotspots'])}")
    if "cta_buttons" in config:
        logger_instance.info(f"  - CTA Buttons: {len(config['cta_buttons'])}")
    if "interactionPoints" in config:
        logger_instance.info(f"  - Interaction Points: {len(config['interactionPoints'])}")
    if "audio" in config:
        logger_instance.info(f"  - Audio Files: {len(config['audio'])}")
    if "banners" in config:
        logger_instance.info(f"  - Banners: Yes")


def validate_request_data(request, required_fields: List[str]) -> Tuple[bool, str]:
    """
    验证请求数据（业务层包装）
    
    Args:
        request: 请求对象
        required_fields: 必需字段列表
        
    Returns:
        tuple: (是否有效, 错误信息)
    """
    return validate_request_data_util(request, required_fields)

