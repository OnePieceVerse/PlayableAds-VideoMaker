from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
import uuid
import os
import shutil
from datetime import datetime
from pathlib import Path
import mimetypes
import hashlib
from backend.app.models.schemas import UploadResponse, FileType, StepType, Position
from backend.app.services.file_service import get_file_metadata, validate_file_type, get_video_metadata

router = APIRouter()

# 项目目录
PROJECTS_DIR = Path("projects")

@router.post("/create-project")
async def create_project():
    """
    创建新的项目ID
    
    返回:
    - project_id: 项目唯一标识符
    """
    try:
        project_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return {
            "success": True,
            "project_id": f"{timestamp}-{project_id}"
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

# 计算文件哈希值
async def calculate_file_hash(file_content: bytes) -> str:
    """计算文件内容的MD5哈希值"""
    return hashlib.md5(file_content).hexdigest()

# 查找重复文件
async def find_duplicate_file(project_dir: Path, file_hash: str, file_extension: str) -> tuple[bool, str, Path]:
    """
    在项目目录中查找具有相同哈希值的文件
    
    返回:
    - 是否找到重复文件
    - 如果找到，返回文件ID
    - 如果找到，返回文件路径
    """
    # 确保项目目录存在
    if not project_dir.exists():
        return False, "", Path()
    
    # 查找同一项目中的所有文件
    for file_path in project_dir.glob(f"*{file_extension}"):
        try:
            # 读取文件内容并计算哈希值
            with open(file_path, "rb") as f:
                content = f.read()
                existing_hash = await calculate_file_hash(content)
                
                # 如果哈希值匹配，说明找到了重复文件
                if existing_hash == file_hash:
                    file_id = file_path.stem  # 文件名不带扩展名作为ID
                    return True, file_id, file_path
        except Exception as e:
            print(f"Error checking file {file_path}: {str(e)}")
    
    return False, "", Path()

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    type: FileType = Form(...),
    step: StepType = Form(...),
    project_id: str = Form(None),
    position: str = Form(None)  # 修改为str类型
):
    """
    上传文件API
    
    上传视频或图片文件
    
    - **file**: 文件
    - **type**: 文件类型 (video/image)
    - **step**: 步骤类型 (video_upload/pause_frames/cta_buttons/banner_images/export_ad)
    - **project_id**: 项目ID（可选，如果提供则使用已存在的项目目录）
    - **position**: 位置信息（可选，如left、right等）
    """
    try:
        print(f"Received upload request: type={type}, step={step}, project_id={project_id}, position={position}")
        
        # 验证文件类型
        if not validate_file_type(file, type):
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"Invalid {type} file format"}
            )
        
        # 如果没有提供project_id，自动生成一个（在第一次上传时）
        if not project_id:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            project_id = f"{timestamp}-{str(uuid.uuid4())[:8]}"
        
        # 创建项目目录
        project_dir = PROJECTS_DIR / f"{project_id}"
        os.makedirs(project_dir, exist_ok=True)
        
        # 读取文件内容
        file_content = await file.read()
        
        # 计算文件哈希值
        file_hash = await calculate_file_hash(file_content)
        
        # 获取文件扩展名
        original_extension = Path(file.filename).suffix.lower()
        
        # 查找是否存在重复文件
        is_duplicate, existing_file_id, existing_file_path = await find_duplicate_file(
            project_dir, file_hash, original_extension
        )
        
        if is_duplicate:
            print(f"Found duplicate file: {existing_file_path}")
            file_id = existing_file_id
            file_path = existing_file_path
            
            # 重新定位文件指针以便后续可能的操作
            await file.seek(0)
        else:
            # 生成文件ID和文件名
            file_id = str(uuid.uuid4())
            filename = f"{file_id}{original_extension}"
            file_path = project_dir / filename
            
            print(f"Saving new file: {file.filename} as {filename} with extension {original_extension}")
            
            # 保存文件
            with open(file_path, "wb") as buffer:
                buffer.write(file_content)
        
        # 获取文件元数据
        metadata = {}
        if type == FileType.VIDEO:
            metadata = await get_video_metadata(file_path)
        
        # 构建URL
        url = f"/api/media/{project_dir.name}/{file_path.name}"
        
        return {
            "success": True,
            "file_id": file_id,
            "url": url,
            "metadata": metadata,
            "project_id": project_id,
            "project_dir": project_dir.name,
            "is_new_project": not bool(project_id),
            "is_duplicate": is_duplicate
        }
    except Exception as e:
        print(f"Upload error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@router.get("/media/{project_id}/{file_name}")
async def get_media(request: Request, project_id: str, file_name: str):
    """
    获取媒体文件（视频或图片）
    
    - **project_id**: 项目ID
    - **file_name**: 文件名
    """
    try:
        file_path = PROJECTS_DIR / project_id / file_name
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # 获取文件大小
        file_size = os.path.getsize(file_path)
        
        # 获取文件类型
        content_type, _ = mimetypes.guess_type(str(file_path))
        if not content_type:
            content_type = "application/octet-stream"
        
        # 检查是否是视频文件
        is_video = content_type.startswith("video/")
        
        # 如果是视频文件，支持范围请求
        if is_video and "range" in request.headers:
            # 解析范围请求头
            range_header = request.headers["range"]
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
                with open(file_path, "rb") as f:
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
                "Access-Control-Max-Age": "86400",  # 24小时
            }
            
            return StreamingResponse(
                file_stream(),
                status_code=206,  # Partial Content
                headers=headers
            )
        
        # 对于非视频文件或没有范围请求的情况，使用FileResponse
        return FileResponse(
            path=file_path,
            headers={
                "Content-Type": content_type,
                "Content-Length": str(file_size),
                "Accept-Ranges": "bytes",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
                "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
                "Access-Control-Max-Age": "86400",  # 24小时
            }
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e)) 