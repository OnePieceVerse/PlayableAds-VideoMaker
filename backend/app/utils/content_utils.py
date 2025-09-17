"""
内容处理工具类
"""
from pathlib import Path


def determine_content_type(file_path: Path) -> str:
    """
    确定文件的Content-Type
    
    Args:
        file_path: 文件路径
        
    Returns:
        str: Content-Type
    """
    suffix = file_path.suffix.lower()
    
    # 常见文件类型映射
    content_type_map = {
        '.zip': 'application/zip',
        '.html': 'text/html',
        '.htm': 'text/html',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.json': 'application/json',
        '.css': 'text/css',
        '.js': 'application/javascript'
    }
    
    return content_type_map.get(suffix, 'application/octet-stream')


def get_file_category_by_extension(filename: str) -> str:
    """
    根据文件扩展名获取文件分类
    
    Args:
        filename: 文件名
        
    Returns:
        str: 文件分类 ('images', 'videos', 'audios')
    """
    ext = Path(filename).suffix.lower()
    
    # 图片文件扩展名
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'}
    # 视频文件扩展名
    video_extensions = {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'}
    # 音频文件扩展名
    audio_extensions = {'.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'}
    
    if ext in image_extensions:
        return 'images'
    elif ext in video_extensions:
        return 'videos'
    elif ext in audio_extensions:
        return 'audios'
    
    # 默认返回images（向后兼容）
    return 'images'


def is_media_file(filename: str) -> bool:
    """
    检查是否为媒体文件（图片、视频、音频）
    
    Args:
        filename: 文件名
        
    Returns:
        bool: 是否为媒体文件
    """
    category = get_file_category_by_extension(filename)
    return category in ['images', 'videos', 'audios']


def get_supported_extensions() -> dict:
    """
    获取支持的文件扩展名列表
    
    Returns:
        dict: 按类型分组的扩展名列表
    """
    return {
        'images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'],
        'videos': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'],
        'audios': ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma']
    }
