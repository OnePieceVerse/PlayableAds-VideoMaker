from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import JSONResponse, FileResponse
import os
import uuid
from pathlib import Path
from app.models.schemas import GenerateRequest, GenerateResponse
from app.services.generate_service import generate_ad_html, generate_ad_zip

router = APIRouter()

# 输出目录
OUTPUT_DIR = Path("app/static/output")

@router.post("/generate", response_model=GenerateResponse)
async def generate_ad(request: GenerateRequest = Body(...)):
    """
    生成广告API
    
    根据提供的配置生成HTML或ZIP格式的广告文件
    """
    try:
        # 确保输出目录存在
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # 生成唯一ID
        output_id = str(uuid.uuid4())
        
        # 根据平台选择生成方式
        if request.platform == "google" or request.platform == "facebook":
            # 生成HTML文件
            output_path = await generate_ad_html(request, output_id, OUTPUT_DIR)
            file_url = f"/static/output/{output_path.name}"
            preview_url = file_url
        else:
            # 生成ZIP文件
            output_path = await generate_ad_zip(request, output_id, OUTPUT_DIR)
            file_url = f"/static/output/{output_path.name}"
            preview_url = None
        
        return {
            "success": True,
            "file_url": file_url,
            "preview_url": preview_url
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@router.get("/download/{file_name}")
async def download_file(file_name: str):
    """
    下载生成的文件
    """
    file_path = OUTPUT_DIR / file_name
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="application/octet-stream"
    ) 