"""
文件下载服务模块
处理各种文件的下载功能，包括系统音频文件管理
"""
import os
import subprocess
import struct
import wave
import zipfile
from pathlib import Path
from typing import Optional, Dict, Any, List
import logging

from backend.app.utils.file_utils import get_file_mime_type, get_file_size
from backend.app.utils.response_utils import error_response
from backend.app.utils.audio_utils import get_audio_duration, categorize_audio_by_name, validate_audio_file_extension
from backend.app.utils.content_utils import determine_content_type
from backend.app.config import PROJECTS_DIR, BACKEND_BASE_URL

logger = logging.getLogger(__name__)


class DownloadService:
    """文件下载服务类"""
    
    # 系统音频目录路径
    SYSTEM_AUDIO_DIR = Path(__file__).parent.parent / "assets" / "audio" / "image_bg"
    
    # ==================== 系统音频服务方法 ====================
    
    @classmethod
    def get_audio_list(cls) -> List[Dict[str, Any]]:
        """
        获取系统音频列表
        
        Returns:
            List[Dict]: 音频文件信息列表
        """
        try:
            if not cls.SYSTEM_AUDIO_DIR.exists():
                logger.warning(f"System audio directory not found: {cls.SYSTEM_AUDIO_DIR}")
                return []
            
            audio_files = []
            
            # 遍历音频目录
            for file_path in cls.SYSTEM_AUDIO_DIR.iterdir():
                if file_path.is_file() and file_path.suffix.lower() in ['.mp3', '.wav', '.m4a', '.ogg']:
                    audio_info = cls._process_audio_file(file_path)
                    if audio_info:
                        audio_files.append(audio_info)
            
            # 按分类和名称排序
            audio_files.sort(key=lambda x: (x["category"], x["name"]))
            
            logger.info(f"Found {len(audio_files)} system audio files")
            return audio_files
            
        except Exception as e:
            logger.error(f"Failed to get system audio list: {str(e)}")
            raise
    
    @classmethod
    def _process_audio_file(cls, file_path: Path) -> Optional[Dict[str, Any]]:
        """
        处理单个音频文件，提取信息
        
        Args:
            file_path: 音频文件路径
            
        Returns:
            Dict: 音频文件信息，如果处理失败返回None
        """
        try:
            file_name_without_ext = file_path.stem  # 不带扩展名的文件名
            full_file_name = file_path.name  # 完整文件名（含扩展名）
            file_size = get_file_size(file_path)
            
            # 根据文件名生成分类
            category = categorize_audio_by_name(file_name_without_ext)
            
            # 获取音频时长
            duration = get_audio_duration(file_path)
            
            logger.debug(f"Processed audio file: {full_file_name}, Duration: {duration}, Category: {category}")
            
            return {
                "id": full_file_name,  # 使用完整文件名作为ID
                "name": file_name_without_ext,  # 显示名称不含扩展名
                "category": category,
                "duration": duration,
                "url": f"{BACKEND_BASE_URL}/api/file/system-audio/{full_file_name}",
                "file_path": str(file_path),
                "size": file_size
            }
            
        except Exception as e:
            logger.error(f"Failed to process audio file {file_path}: {str(e)}")
            return None
    
    @classmethod
    def get_audio_file_path(cls, filename: str) -> Optional[Path]:
        """
        获取音频文件的完整路径
        
        Args:
            filename: 音频文件名
            
        Returns:
            Path: 文件路径，如果不存在返回None
        """
        file_path = cls.SYSTEM_AUDIO_DIR / filename
        
        if file_path.exists() and file_path.is_file():
            return file_path
        
        return None
    
    @classmethod
    def validate_audio_file(cls, filename: str) -> bool:
        """
        验证音频文件是否存在且有效
        
        Args:
            filename: 音频文件名
            
        Returns:
            bool: 是否有效
        """
        file_path = cls.get_audio_file_path(filename)
        
        if not file_path:
            return False
        
        # 检查文件扩展名
        return validate_audio_file_extension(filename)
    
    # ==================== 文件下载服务方法 ====================
    
    @staticmethod
    def get_project_file(project_id: str, file_path_str: str) -> Dict[str, Any]:
        """
        获取项目文件信息用于下载
        
        Args:
            project_id: 项目ID
            file_path_str: 文件路径（可能包含子目录，如 outputs/all_platforms.zip）
            
        Returns:
            Dict: 包含文件路径和元数据的字典
        """
        try:
            file_path = PROJECTS_DIR / project_id / file_path_str
            
            # 如果文件不存在，尝试特殊处理
            if not file_path.exists():
                file_path = DownloadService._handle_missing_file(project_id, file_path_str)
                if not file_path:
                    raise FileNotFoundError(f"File not found: {file_path_str}")
            
            # 获取文件信息
            content_type = determine_content_type(file_path)
            file_size = get_file_size(file_path)
            
            # 使用实际文件名作为下载文件名
            download_filename = file_path.name
            
            return {
                "file_path": file_path,
                "filename": download_filename,
                "content_type": content_type,
                "size": file_size,
                "headers": {
                    "Content-Disposition": f'attachment; filename="{download_filename}"',
                    "Access-Control-Expose-Headers": "Content-Disposition"
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get project file {project_id}/{file_path_str}: {str(e)}")
            raise
    
    @staticmethod
    def get_ad_file(file_path_str: str, platform: str) -> Dict[str, Any]:
        """
        获取广告文件信息用于下载
        
        Args:
            file_path_str: 文件路径字符串（相对于projects目录）
            platform: 平台名称
            
        Returns:
            Dict: 包含文件路径和元数据的字典
        """
        try:
            full_path = PROJECTS_DIR / file_path_str
            
            if not full_path.exists():
                raise FileNotFoundError(f"File not found: {file_path_str}")
            
            filename = full_path.name
            content_type = determine_content_type(full_path)
            file_size = get_file_size(full_path)
            
            return {
                "file_path": full_path,
                "filename": filename,
                "content_type": content_type,
                "size": file_size,
                "headers": {
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get ad file {file_path_str}: {str(e)}")
            raise
    
    @staticmethod
    def get_general_file(file_path_str: str) -> Dict[str, Any]:
        """
        获取通用文件信息用于下载
        
        Args:
            file_path_str: 文件路径字符串
            
        Returns:
            Dict: 包含文件路径和元数据的字典
        """
        try:
            full_path = Path(file_path_str)
            
            if not full_path.exists():
                raise FileNotFoundError(f"File not found: {file_path_str}")
            
            filename = full_path.name
            content_type = determine_content_type(full_path)
            file_size = get_file_size(full_path)
            
            return {
                "file_path": full_path,
                "filename": filename,
                "content_type": content_type,
                "size": file_size,
                "headers": {
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get general file {file_path_str}: {str(e)}")
            raise
    
    @staticmethod
    def _handle_missing_file(project_id: str, file_path_str: str) -> Optional[Path]:
        """
        处理缺失的文件，尝试重新生成或查找
        
        Args:
            project_id: 项目ID
            file_path_str: 文件路径（可能包含子目录）
            
        Returns:
            Path: 文件路径，如果无法处理返回None
        """
        try:
            project_dir = PROJECTS_DIR / project_id
            
            # 获取文件名（去掉路径）
            file_name = Path(file_path_str).name
            
            # 特殊处理Google ZIP文件
            if file_name.endswith(".zip") and "google" in file_name:
                return DownloadService._create_google_zip(project_dir, file_name)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to handle missing file {project_id}/{file_name}: {str(e)}")
            return None
    
    @staticmethod
    def _create_google_zip(project_dir: Path, zip_filename: str) -> Optional[Path]:
        """
        创建Google广告的ZIP文件
        
        Args:
            project_dir: 项目目录
            zip_filename: ZIP文件名
            
        Returns:
            Path: ZIP文件路径，如果创建失败返回None
        """
        try:
            # 查找对应的HTML文件
            html_files = list(project_dir.glob("*.html"))
            google_html = next((f for f in html_files if "google" in f.name), None)
            
            if not google_html:
                logger.warning(f"No Google HTML file found in {project_dir}")
                return None
            
            zip_path = project_dir / zip_filename
            
            # 创建ZIP文件
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.write(google_html, google_html.name)
            
            logger.info(f"Created Google ZIP file: {zip_path}")
            return zip_path
            
        except Exception as e:
            logger.error(f"Failed to create Google ZIP file: {str(e)}")
            return None
    
    
    @staticmethod
    def validate_file_access(file_path: Path, allowed_directories: list = None) -> bool:
        """
        验证文件访问权限
        
        Args:
            file_path: 文件路径
            allowed_directories: 允许访问的目录列表
            
        Returns:
            bool: 是否允许访问
        """
        try:
            # 解析绝对路径
            abs_path = file_path.resolve()
            
            # 如果没有指定允许的目录，默认只允许访问PROJECTS_DIR
            if not allowed_directories:
                allowed_directories = [PROJECTS_DIR.resolve()]
            
            # 检查文件是否在允许的目录内
            for allowed_dir in allowed_directories:
                try:
                    abs_path.relative_to(allowed_dir.resolve())
                    return True
                except ValueError:
                    continue
            
            logger.warning(f"File access denied: {abs_path}")
            return False
            
        except Exception as e:
            logger.error(f"Error validating file access for {file_path}: {str(e)}")
            return False
    
    @staticmethod
    async def serve_download_file(project_id: str, file_path: str):
        """
        提供项目文件下载服务
        
        Args:
            project_id: 项目ID
            file_path: 文件路径（可能包含子目录，如 outputs/all_platforms.zip）
            
        Returns:
            FileResponse: 文件下载响应
        """
        from fastapi.responses import FileResponse
        
        file_info = DownloadService.get_project_file(project_id, file_path)
        
        return FileResponse(
            path=file_info["file_path"],
            filename=file_info["filename"],
            media_type=file_info["content_type"],
            headers=file_info["headers"]
        )
    
    @staticmethod
    async def serve_ad_download(file_path_str: str, platform: str):
        """
        提供广告文件下载服务
        
        Args:
            file_path_str: 文件路径字符串
            platform: 平台名称
            
        Returns:
            FileResponse: 文件下载响应
        """
        from fastapi.responses import FileResponse
        
        file_info = DownloadService.get_ad_file(file_path_str, platform)
        
        return FileResponse(
            path=file_info["file_path"],
            filename=file_info["filename"],
            media_type=file_info["content_type"],
            headers=file_info["headers"]
        )
    
    @staticmethod
    async def serve_general_download(file_path_str: str):
        """
        提供通用文件下载服务
        
        Args:
            file_path_str: 文件路径字符串
            
        Returns:
            FileResponse: 文件下载响应
        """
        from fastapi.responses import FileResponse
        
        file_info = DownloadService.get_general_file(file_path_str)
        
        return FileResponse(
            path=file_info["file_path"],
            filename=file_info["filename"],
            media_type=file_info["content_type"],
            headers=file_info["headers"]
        )
    
    # ==================== 媒体文件服务方法 ====================
    
    @staticmethod
    async def serve_media_file(project_id: str, file_path: str):
        """
        提供普通媒体文件服务
        
        Args:
            project_id: 项目ID
            file_path: 文件路径
            
        Returns:
            FileResponse: 文件响应
        """
        from backend.app.config import PROJECTS_DIR
        from backend.app.utils.file_utils import get_file_size, get_file_mime_type
        from fastapi import HTTPException
        from fastapi.responses import FileResponse
        
        full_file_path = PROJECTS_DIR / project_id / file_path
        
        if not full_file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # 获取文件信息
        file_size = get_file_size(full_file_path)
        content_type = get_file_mime_type(full_file_path)
        
        # 返回文件响应
        return FileResponse(
            path=full_file_path,
            headers={
                "Content-Type": content_type,
                "Content-Length": str(file_size),
                "Accept-Ranges": "bytes",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
                "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
                "Access-Control-Max-Age": "86400",
            }
        )
    
    @staticmethod
    async def serve_media_file_with_range(project_id: str, file_path: str, range_header: str):
        """
        提供支持范围请求的媒体文件服务（主要用于视频文件）
        
        Args:
            project_id: 项目ID
            file_path: 文件路径
            range_header: 范围请求头
            
        Returns:
            StreamingResponse: 流式响应
        """
        from backend.app.config import PROJECTS_DIR
        from backend.app.utils.file_utils import get_file_size, get_file_mime_type
        from fastapi import HTTPException
        from fastapi.responses import StreamingResponse
        
        full_file_path = PROJECTS_DIR / project_id / file_path
        
        if not full_file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # 获取文件信息
        file_size = get_file_size(full_file_path)
        content_type = get_file_mime_type(full_file_path)
        
        # 解析范围请求头
        start_bytes, end_bytes = 0, file_size - 1
        
        if range_header.startswith("bytes="):
            range_parts = range_header.replace("bytes=", "").split("-")
            if len(range_parts) == 2:
                if range_parts[0]:
                    start_bytes = int(range_parts[0])
                if range_parts[1]:
                    end_bytes = min(int(range_parts[1]), file_size - 1)
        
        # 计算内容长度
        content_length = end_bytes - start_bytes + 1
        
        # 创建文件流
        async def file_stream():
            with open(full_file_path, "rb") as f:
                f.seek(start_bytes)
                chunk_size = 1024 * 1024  # 1MB chunks
                bytes_to_read = content_length
                while bytes_to_read > 0:
                    chunk = f.read(min(chunk_size, bytes_to_read))
                    if not chunk:
                        break
                    yield chunk
                    bytes_to_read -= len(chunk)
        
        # 返回部分内容响应
        headers = {
            "Content-Range": f"bytes {start_bytes}-{end_bytes}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": content_type,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
            "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
            "Access-Control-Max-Age": "86400",
        }
        
        return StreamingResponse(
            file_stream(),
            status_code=206,  # Partial Content
            headers=headers
        )
    
    @staticmethod
    async def serve_system_audio_file(filename: str):
        """
        提供系统音频文件服务
        
        Args:
            filename: 音频文件名
            
        Returns:
            FileResponse: 音频文件响应
        """
        from fastapi import HTTPException
        from fastapi.responses import FileResponse
        
        # 验证并获取音频文件路径
        if not DownloadService.validate_audio_file(filename):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        file_path = DownloadService.get_audio_file_path(filename)
        
        # 返回音频文件
        return FileResponse(
            path=str(file_path),
            media_type="audio/mpeg",
            filename=filename,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400",
            }
        )
