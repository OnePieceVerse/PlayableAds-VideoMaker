from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import uuid
import os
import shutil
from pathlib import Path
from app.models.schemas import UploadResponse, FileType, StepType, Position
from app.services.file_service import get_file_metadata, validate_file_type

router = APIRouter()

# 上传目录
UPLOAD_DIR = Path("app/static/uploads")

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    type: FileType = Form(...),
    step: StepType = Form(...),
    position: Position = Form(None)
):
    """
    上传文件API
    
    - **file**: 要上传的文件
    - **type**: 文件类型 (video/image)
    - **step**: 步骤类型 (video/pause/cta/banner)
    - **position**: 位置 (可选，用于图片位置)
    """
    try:
        # 验证文件类型
        if not validate_file_type(file, type):
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"Invalid {type} file format"}
            )
        
        # 确保上传目录存在
        os.makedirs(UPLOAD_DIR / str(type), exist_ok=True)
        
        # 生成唯一文件名
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        filename = f"{file_id}{file_extension}"
        file_path = UPLOAD_DIR / str(type) / filename
        
        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 获取文件元数据
        metadata = await get_file_metadata(file_path, type)
        
        # 生成URL
        url = f"/static/uploads/{type}/{filename}"
        
        return {
            "success": True,
            "file_id": file_id,
            "url": url,
            "metadata": metadata
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        ) 