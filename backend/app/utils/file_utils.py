"""
文件处理工具类
"""
import os
import shutil
import hashlib
import mimetypes
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import logging
from fastapi import UploadFile
from backend.app.models.schemas import FileType

logger = logging.getLogger(__name__)


def calculate_file_hash(file_content: bytes) -> str:
    """计算文件内容的MD5哈希值"""
    return hashlib.md5(file_content).hexdigest()


def get_file_type_from_content(filename: str, content_type: str = None) -> str:
    """
    根据文件名和内容类型判断文件类型
    
    Args:
        filename: 文件名
        content_type: MIME类型
        
    Returns:
        str: 文件类型 ('images', 'videos', 'audios')
    """
    # 获取文件扩展名
    ext = Path(filename).suffix.lower()
    
    # 图片文件扩展名
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'}
    # 视频文件扩展名
    video_extensions = {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'}
    # 音频文件扩展名
    audio_extensions = {'.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'}
    
    # 根据扩展名判断
    if ext in image_extensions:
        return 'images'
    elif ext in video_extensions:
        return 'videos'
    elif ext in audio_extensions:
        return 'audios'
    
    # 根据MIME类型判断
    if content_type:
        if content_type.startswith('image/'):
            return 'images'
        elif content_type.startswith('video/'):
            return 'videos'
        elif content_type.startswith('audio/'):
            return 'audios'
    
    # 默认返回images（向后兼容）
    return 'images'


def create_directory_structure(base_dir: Path, subdirs: list) -> dict:
    """
    创建目录结构
    
    Args:
        base_dir: 基础目录
        subdirs: 子目录列表
        
    Returns:
        dict: 包含各个目录路径的字典
    """
    dirs = {'base': base_dir}
    
    # 确保基础目录存在
    os.makedirs(base_dir, exist_ok=True)
    
    # 创建子目录
    for subdir in subdirs:
        dir_path = base_dir / subdir
        os.makedirs(dir_path, exist_ok=True)
        dirs[subdir] = dir_path
    
    return dirs


def copy_file_safely(source: Path, target: Path) -> bool:
    """
    安全地复制文件
    
    Args:
        source: 源文件路径
        target: 目标文件路径
        
    Returns:
        bool: 是否成功复制
    """
    if source != target:
        try:
            shutil.copy(source, target)
            logger.info(f"Copied file from {source} to {target}")
            return True
        except (shutil.SameFileError, FileNotFoundError, PermissionError) as e:
            logger.warning(f"Failed to copy file from {source} to {target}: {str(e)}")
            return False
    else:
        logger.info(f"File already in correct location: {source}")
        return True


def move_file_safely(source: Path, target: Path) -> bool:
    """
    安全地移动文件
    
    Args:
        source: 源文件路径
        target: 目标文件路径
        
    Returns:
        bool: 是否成功移动
    """
    if source != target:
        try:
            shutil.move(source, target)
            logger.info(f"Moved file from {source} to {target}")
            return True
        except (shutil.SameFileError, FileNotFoundError, PermissionError) as e:
            logger.warning(f"Failed to move file from {source} to {target}: {str(e)}")
            return False
    else:
        logger.info(f"File already in correct location: {source}")
        return True


def get_file_mime_type(file_path: Path) -> str:
    """
    获取文件的MIME类型
    
    Args:
        file_path: 文件路径
        
    Returns:
        str: MIME类型
    """
    content_type, _ = mimetypes.guess_type(str(file_path))
    return content_type or "application/octet-stream"


def ensure_directory_exists(directory: Path) -> None:
    """
    确保目录存在
    
    Args:
        directory: 目录路径
    """
    os.makedirs(directory, exist_ok=True)


def find_files_by_extension(directory: Path, extension: str) -> list:
    """
    在目录中查找指定扩展名的文件
    
    Args:
        directory: 搜索目录
        extension: 文件扩展名（包含点号，如 '.jpg'）
        
    Returns:
        list: 文件路径列表
    """
    if not directory.exists():
        return []
    
    return list(directory.glob(f"*{extension}"))


def get_file_size(file_path: Path) -> int:
    """
    获取文件大小
    
    Args:
        file_path: 文件路径
        
    Returns:
        int: 文件大小（字节）
    """
    try:
        return os.path.getsize(file_path)
    except (FileNotFoundError, PermissionError):
        return 0

def format_file_size(size_in_bytes):
    """
    将字节大小转换为人类可读的格式
    """
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    elif size_in_bytes < 1024 * 1024:
        return f"{size_in_bytes/1024:.1f} KB"
    elif size_in_bytes < 1024 * 1024 * 1024:
        return f"{size_in_bytes/(1024*1024):.1f} MB"
    else:
        return f"{size_in_bytes/(1024*1024*1024):.1f} GB" 


def validate_file_type(file: UploadFile, file_type: FileType) -> bool:
    """
    简单的文件类型验证
    
    Args:
        file: 上传的文件
        file_type: 期望的文件类型
        
    Returns:
        bool: 验证结果
    """
    if not file.filename:
        return False
    
    filename_lower = file.filename.lower()
    
    if file_type == FileType.IMAGE:
        return any(filename_lower.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'])
    elif file_type == FileType.VIDEO:
        return any(filename_lower.endswith(ext) for ext in ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'])
    elif file_type == FileType.AUDIO:
        return any(filename_lower.endswith(ext) for ext in ['.mp3', '.wav', '.m4a', '.ogg', '.aac'])
    
    return True  # 对于其他类型，暂时通过验证


async def get_video_metadata(file_path: Path) -> Dict[str, Any]:
    """
    获取视频元数据（简化版本）
    
    Args:
        file_path: 视频文件路径
        
    Returns:
        Dict: 视频元数据
    """
    try:
        from backend.app.utils.file_utils import get_file_size
        
        # 基本元数据
        metadata = {
            "size": get_file_size(file_path),
            "format": file_path.suffix.lower(),
            "filename": file_path.name
        }
        
        # 可以在这里添加更复杂的视频元数据提取逻辑
        # 例如使用 ffprobe 获取视频时长、分辨率等
        
        return metadata
        
    except Exception as e:
        logger.warning(f"Failed to get video metadata for {file_path}: {str(e)}")
        return {"error": str(e)}       