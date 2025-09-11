from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
import os
import uuid
import traceback
import logging
from pathlib import Path
from backend.app.models.schemas import ImageGenerateRequest, GenerateResponse, Platform
from backend.app.services.image_generate_service import generate_image_ad_html
import zipfile

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter()

# 项目目录
PROJECTS_DIR = Path("projects")

@router.post("/generate-image", response_model=GenerateResponse)
async def generate_image_ad(
    request: ImageGenerateRequest = Body(...),
    project_id: str = Query(None, description="项目ID（可选，如果提供则使用已存在的项目目录）")
):
    """
    生成互动图片广告API
    
    根据提供的配置生成HTML或ZIP格式的互动图片广告文件
    
    - **request**: 生成请求数据
    - **project_id**: 项目ID（可选，如果提供则使用已存在的项目目录）
    """
    try:
        logger.info(f"Received generate image request with project_id: {project_id}")
        # 确保项目目录存在
        os.makedirs(PROJECTS_DIR, exist_ok=True)
        
        # 如果URL查询参数提供了project_id，使用它覆盖请求体中的project_id
        if project_id:
            request.project_id = project_id
            logger.info(f"Using project_id from query parameter: {project_id}")
        
        # 确保request中有project_id
        if not hasattr(request, 'project_id') or not request.project_id:
            logger.error("project_id is required but not provided")
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "project_id is required"}
            )
        
        # 使用request中的project_id
        output_id = request.project_id
        logger.info(f"Using project_id: {output_id}")
        
        # 处理platforms参数
        platforms = request.platforms
        logger.info(f"Requested platforms: {platforms}")
        
        # 如果包含"all"，则生成所有平台
        if Platform.ALL in platforms:
            request.platforms = [Platform.GOOGLE, Platform.FACEBOOK, Platform.APPLOVIN, Platform.MOLOCO, Platform.TIKTOK]
            logger.info(f"Expanded 'all' to platforms: {request.platforms}")
        
        # 确保至少有一个平台
        if not request.platforms:
            logger.error("No platforms selected")
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "At least one platform must be selected"}
            )
        
        # 生成广告文件
        logger.info(f"Calling generate_image_ad_html with platforms: {request.platforms}")
        file_url, preview_url = await generate_image_ad_html(request, output_id)
        logger.info(f"Generated file URL: {file_url}")
        logger.info(f"Preview URL: {preview_url}")
        
        response_data = {
            "success": True,
            "file_url": file_url,
            "preview_url": preview_url,
            "project_id": output_id
        }
        logger.info(f"Returning successful response: {response_data}")
        return response_data
    
    except Exception as e:
        error_msg = f"Error generating image ad: {str(e)}"
        stack_trace = traceback.format_exc()
        logger.error(f"{error_msg}\n{stack_trace}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": error_msg}
        ) 