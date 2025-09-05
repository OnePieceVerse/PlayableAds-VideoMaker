from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
import os
import uuid
import traceback
import logging
from pathlib import Path
from backend.app.models.schemas import GenerateRequest, GenerateResponse, Platform
from backend.app.services.generate_service import generate_ad_html
import zipfile

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter()

# 项目目录
PROJECTS_DIR = Path("projects")

@router.post("/generate", response_model=GenerateResponse)
async def generate_ad(
    request: GenerateRequest = Body(...),
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
        logger.info(f"Calling generate_ad_html with platforms: {request.platforms}")
        file_url, preview_url = await generate_ad_html(request, output_id)
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
        error_msg = f"Error generating ad: {str(e)}"
        stack_trace = traceback.format_exc()
        logger.error(f"{error_msg}\n{stack_trace}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": error_msg}
        )

@router.get("/download/{project_id}/{file_name}")
async def download_file(project_id: str, file_name: str):
    """
    下载生成的文件
    """
    file_path = PROJECTS_DIR / project_id / file_name
    
    if not file_path.exists():
        # 如果文件不存在，检查是否是Google广告的ZIP文件，可能需要重新生成
        if file_name.endswith(".zip") and "google" in file_name:
            # 尝试查找对应的HTML文件
            html_files = list((PROJECTS_DIR / project_id).glob("*.html"))
            google_html = next((f for f in html_files if "google" in f.name), None)
            
            if google_html:
                # 创建ZIP文件
                with zipfile.ZipFile(file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    zipf.write(google_html, google_html.name)
            else:
                raise HTTPException(status_code=404, detail="Google ad HTML file not found")
        else:
            raise HTTPException(status_code=404, detail="File not found")
    
    # 设置响应头，强制下载
    headers = {
        "Content-Disposition": f'attachment; filename="{file_name}"'
    }
    
    # 确定Content-Type
    content_type = "application/zip" if file_path.suffix == ".zip" else "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type=content_type,
        headers=headers
    )

@router.get("/download-ad", response_class=FileResponse)
async def download_ad(
    file_path: str = Query(..., description="文件路径，相对于projects目录"),
    platform: str = Query(..., description="平台名称，用于设置正确的Content-Type")
):
    """
    下载广告文件API
    
    根据提供的文件路径下载广告文件，并设置正确的Content-Disposition头
    
    - **file_path**: 文件路径，相对于projects目录
    - **platform**: 平台名称，用于设置正确的Content-Type
    """
    try:
        # 构建完整的文件路径
        full_path = PROJECTS_DIR / file_path
        
        if not full_path.exists():
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": f"File not found: {file_path}"}
            )
        
        # 确定文件名
        filename = full_path.name
        
        # 确定Content-Type
        content_type = "application/zip" if full_path.suffix == ".zip" else "text/html"
        
        # 设置响应头，强制下载
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
        
        return FileResponse(
            path=full_path,
            filename=filename,
            media_type=content_type,
            headers=headers
        )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        ) 

@router.get("/download-file", response_class=FileResponse)
async def download_file(file_path: str):
    """
    下载文件API
    
    根据提供的文件路径下载文件
    
    - **file_path**: 文件路径，相对于项目根目录
    """
    try:
        # 构建完整的文件路径
        full_path = Path(file_path)
        
        if not full_path.exists():
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": f"File not found: {file_path}"}
            )
        
        # 确定文件名
        filename = full_path.name
        
        # 确定Content-Type
        content_type = None
        if full_path.suffix == ".zip":
            content_type = "application/zip"
        elif full_path.suffix == ".html":
            content_type = "text/html"
        elif full_path.suffix in [".png", ".jpg", ".jpeg", ".gif", ".webp"]:
            content_type = f"image/{full_path.suffix[1:]}"
        elif full_path.suffix in [".mp4", ".webm", ".ogg"]:
            content_type = f"video/{full_path.suffix[1:]}"
        else:
            content_type = "application/octet-stream"
        
        # 设置响应头，强制下载
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
        
        return FileResponse(
            path=full_path,
            filename=filename,
            media_type=content_type,
            headers=headers
        )
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        ) 

@router.get("/project-files-info")
async def get_project_files_info(project_id: str):
    """
    获取项目文件信息API
    
    返回项目中所有文件的大小信息，以及预估生成HTML的大小
    
    - **project_id**: 项目ID
    """
    try:
        project_dir = PROJECTS_DIR / project_id
        
        if not project_dir.exists():
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": f"Project directory not found: {project_id}"}
            )
        
        # 收集文件信息
        video_files = []
        image_files = []
        other_files = []
        
        for file_path in project_dir.iterdir():
            if not file_path.is_file():
                continue
                
            file_info = {
                "name": file_path.name,
                "size": file_path.stat().st_size,
                "human_size": format_file_size(file_path.stat().st_size)
            }
            
            if file_path.suffix.lower() in ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv']:
                video_files.append(file_info)
            elif file_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']:
                image_files.append(file_info)
            else:
                other_files.append(file_info)
        
        # 计算预估HTML大小
        total_video_size = sum(file["size"] for file in video_files)
        total_image_size = sum(file["size"] for file in image_files)
        
        # 预估HTML大小：视频大小*1.3 + 图片大小*1.3 + 50KB基础大小
        estimated_html_size = int((total_video_size + total_image_size) * 1.3 + 50 * 1024)
        
        return {
            "success": True,
            "project_id": project_id,
            "video_files": video_files,
            "image_files": image_files,
            "other_files": other_files,
            "total_video_size": total_video_size,
            "total_image_size": total_image_size,
            "human_total_video_size": format_file_size(total_video_size),
            "human_total_image_size": format_file_size(total_image_size),
            "estimated_html_size": estimated_html_size,
            "human_estimated_html_size": format_file_size(estimated_html_size)
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

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