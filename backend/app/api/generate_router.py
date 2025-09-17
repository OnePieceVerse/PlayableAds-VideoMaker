from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
import logging
import traceback
from pathlib import Path

from backend.app.models.schemas import ImageVideoGenerateRequest, GenerateResponse, Platform, VideoGenerateRequest
from backend.app.services.image_generate_service_v2 import generate_image_ad_html
from backend.app.services.video_generate_service_v2 import generate_video_ad_html
from backend.app.utils.response_utils import error_response, success_response
from backend.app.utils.id_utils import generate_timestamped_id

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter()

# 项目目录
PROJECTS_DIR = Path("projects")

@router.post("/video", response_model=GenerateResponse)
async def generate_video_ad(
    request: VideoGenerateRequest = Body(...),
    project_id: str = Query(None, description="项目ID（可选，如果提供则使用已存在的项目目录）")
):
    """
    生成广告API
    
    根据提供的配置生成HTML或ZIP格式的广告文件
    
    - **request**: 生成请求数据
    - **project_id**: 项目ID（可选，如果提供则使用已存在的项目目录）
    """
    try:
        logger.info(f"Received generate request with project_id: {project_id}")
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
        logger.info(f"Calling generate_video_ad_html with platforms: {request.platforms}")
        file_urls, preview_url = await generate_video_ad_html(request, output_id)
        
        response_data = {
            "success": True,
            "file_url": file_urls[0] if file_urls else f"/projects/{output_id}/preview/index.html",
            "file_urls": file_urls,
            "preview_url": preview_url,
            "project_id": output_id
        }
        logger.info(f"Returning successful response: {response_data}")
        return response_data
    
    except Exception as e:
        error_msg = f"Error generating ad: {str(e)}"
        stack_trace = traceback.format_exc()
        logger.error(f"{error_msg}\n{stack_trace}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": error_msg}
        )


@router.post("/image", response_model=GenerateResponse)
async def generate_image_ad(
    request: ImageVideoGenerateRequest = Body(...),
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
        
        # 处理project_id
        if project_id:
            request.project_id = project_id
            logger.info(f"Using project_id from query parameter: {project_id}")
        
        # 如果没有project_id，生成一个新的
        if not hasattr(request, 'project_id') or not request.project_id:
            request.project_id = generate_timestamped_id("img")
            logger.info(f"Generated new project_id: {request.project_id}")
        
        output_id = request.project_id
        
        # 处理platforms参数
        if Platform.ALL in request.platforms:
            request.platforms = [Platform.GOOGLE, Platform.FACEBOOK, Platform.APPLOVIN, Platform.MOLOCO, Platform.TIKTOK]
            logger.info(f"Expanded 'all' to platforms: {request.platforms}")
        
        # 验证至少有一个平台
        if not request.platforms:
            return error_response("At least one platform must be selected", 400)
        
        # 生成广告文件
        logger.info(f"Generating image ad with platforms: {request.platforms}")
        file_urls, preview_url = await generate_image_ad_html(request, output_id)
        
        return success_response({
            "file_url": file_urls[0] if file_urls else "",
            "file_urls": file_urls,
            "preview_url": preview_url,
            "project_id": output_id
        }, "Image ad generated successfully")
    
    except ValueError as e:
        logger.warning(f"Invalid request data: {str(e)}")
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Failed to generate image ad: {str(e)}")
        return error_response(str(e)) 