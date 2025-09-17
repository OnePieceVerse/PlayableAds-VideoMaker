"""
上传服务模块
"""
import os
from pathlib import Path
from typing import Dict, Any, Tuple
from fastapi import UploadFile
import logging

from backend.app.models.schemas import FileType
from backend.app.utils.file_utils import (
    calculate_file_hash, create_directory_structure
)
from backend.app.utils.content_utils import get_file_category_by_extension
from backend.app.utils.id_utils import generate_file_id, generate_project_id
from backend.app.utils.response_utils import success_response
from backend.app.services.common import find_duplicate_file_in_project
from backend.app.config import PROJECTS_DIR, BACKEND_BASE_URL
from backend.app.utils.file_utils import validate_file_type, get_video_metadata

logger = logging.getLogger(__name__)


class UploadService:
    """上传服务类"""
    
    @staticmethod
    def create_new_project() -> Dict[str, Any]:
        """
        创建新的项目ID
        
        Returns:
            dict: 包含项目ID的响应
        """
        try:
            project_id = generate_project_id()
            return success_response({
                "project_id": project_id
            }, "Project created successfully")
        except Exception as e:
            logger.error(f"Failed to create project: {str(e)}")
            raise
    
    @staticmethod
    async def upload_file(
        file: UploadFile,
        file_type: FileType,
        project_id: str = None
    ) -> Dict[str, Any]:
        """
        处理文件上传
        
        Args:
            file: 上传的文件
            file_type: 文件类型
            project_id: 项目ID（可选）
            
        Returns:
            dict: 上传结果
        """
        try:
            logger.info(f"Processing upload: type={file_type}, project_id={project_id}")
            
            # 验证文件类型
            if not validate_file_type(file, file_type):
                raise ValueError(f"Invalid {file_type} file format")
            
            # 如果没有提供project_id，自动生成一个
            if not project_id:
                project_id = generate_project_id()
            
            # 创建项目目录和assets结构
            project_dir = PROJECTS_DIR / project_id
            assets_dirs = UploadService._create_project_structure(project_dir)
            
            # 读取文件内容
            file_content = await file.read()
            
            # 计算文件哈希值
            file_hash = calculate_file_hash(file_content)
            
            # 获取文件信息
            original_extension = Path(file.filename).suffix.lower()
            content_type = file.content_type
            detected_file_type = get_file_category_by_extension(file.filename)
            
            # 查找是否存在重复文件
            is_duplicate, existing_file_id, existing_file_path = find_duplicate_file_in_project(
                project_dir, file_hash, original_extension, detected_file_type
            )
            
            if is_duplicate:
                logger.info(f"Found duplicate file: {existing_file_path}")
                file_id = existing_file_id
                file_path = existing_file_path
            else:
                # 保存新文件
                file_id, file_path = UploadService._save_new_file(
                    file_content, file.filename, assets_dirs[detected_file_type]
                )
            
            # 获取文件元数据
            metadata = {}
            if file_type == FileType.VIDEO:
                metadata = await get_video_metadata(file_path)
            
            # 构建响应
            relative_path = file_path.relative_to(project_dir)
            url = f"{BACKEND_BASE_URL}/api/file/media/{project_dir.name}/{relative_path}"
            
            return success_response({
                "file_id": file_id,
                "url": url,
                "metadata": metadata,
                "project_id": project_id,
                "project_dir": project_dir.name,
                "file_type": detected_file_type,
                "relative_path": str(relative_path),
                "is_new_project": not bool(project_id),
                "is_duplicate": is_duplicate
            }, "File uploaded successfully")
            
        except Exception as e:
            logger.error(f"Upload error: {str(e)}")
            raise
    
    @staticmethod
    def _create_project_structure(project_dir: Path) -> Dict[str, Path]:
        """
        创建项目目录结构
        
        Args:
            project_dir: 项目目录
            
        Returns:
            dict: 包含各个目录路径的字典
        """
        # 确保项目目录存在
        os.makedirs(project_dir, exist_ok=True)
        
        # 创建预览目录的assets结构
        preview_dir = project_dir / "preview"
        assets_dir = preview_dir / "assets"
        
        # 创建assets子目录
        subdirs = ["images", "videos", "audios"]
        dirs = create_directory_structure(assets_dir, subdirs)
        
        # 添加预览目录和assets目录到返回字典
        dirs['preview'] = preview_dir
        dirs['assets'] = assets_dir
        
        return dirs
    
    @staticmethod
    def _save_new_file(file_content: bytes, filename: str, target_dir: Path) -> Tuple[str, Path]:
        """
        保存新文件
        
        Args:
            file_content: 文件内容
            filename: 原始文件名
            target_dir: 目标目录
            
        Returns:
            tuple: (文件ID, 文件路径)
        """
        # 生成文件ID和文件名
        file_id = generate_file_id()
        original_extension = Path(filename).suffix.lower()
        new_filename = f"{file_id}{original_extension}"
        file_path = target_dir / new_filename
        
        logger.info(f"Saving new file: {filename} as {new_filename}")
        logger.info(f"Target path: {file_path}")
        
        # 保存文件
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        return file_id, file_path
