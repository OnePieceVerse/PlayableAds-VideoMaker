import os
from pathlib import Path
from fastapi import UploadFile
import mimetypes
from PIL import Image
import asyncio
import subprocess
import json
from app.models.schemas import FileType

# 支持的文件类型
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"]
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

def validate_file_type(file: UploadFile, file_type: FileType) -> bool:
    """
    验证上传的文件类型
    """
    content_type = file.content_type
    
    if file_type == FileType.VIDEO:
        return content_type in ALLOWED_VIDEO_TYPES
    elif file_type == FileType.IMAGE:
        return content_type in ALLOWED_IMAGE_TYPES
    
    return False

async def get_file_metadata(file_path: Path, file_type: FileType) -> dict:
    """
    获取文件元数据
    """
    metadata = {
        "size": os.path.getsize(file_path),
        "format": Path(file_path).suffix.lstrip('.')
    }
    
    try:
        if file_type == FileType.IMAGE:
            # 获取图片尺寸
            with Image.open(file_path) as img:
                metadata["width"] = img.width
                metadata["height"] = img.height
        
        elif file_type == FileType.VIDEO:
            # 使用FFprobe获取视频信息
            metadata.update(await get_video_metadata(file_path))
    
    except Exception as e:
        print(f"Error getting metadata: {str(e)}")
    
    return metadata

async def get_video_metadata(file_path: Path) -> dict:
    """
    使用FFprobe获取视频元数据
    如果FFprobe不可用，则返回基本信息
    """
    metadata = {}
    
    try:
        # 尝试使用FFprobe
        cmd = [
            "ffprobe",
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,duration,codec_name",
            "-of", "json",
            str(file_path)
        ]
        
        # 异步执行命令
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            # 解析JSON输出
            result = json.loads(stdout.decode())
            stream = result.get("streams", [{}])[0]
            
            metadata["width"] = stream.get("width")
            metadata["height"] = stream.get("height")
            metadata["duration"] = float(stream.get("duration", 0))
            metadata["codec"] = stream.get("codec_name")
    
    except Exception as e:
        print(f"Error getting video metadata: {str(e)}")
        # 如果FFprobe不可用，可以尝试其他方法或返回基本信息
    
    return metadata 