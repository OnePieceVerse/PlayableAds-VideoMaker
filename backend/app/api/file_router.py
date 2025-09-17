"""
文件服务API路由
处理文件访问、媒体文件服务、系统音频和文件下载
"""
from fastapi import APIRouter, Request, HTTPException, Query, File, Form, UploadFile
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse

from backend.app.models.schemas import UploadResponse, FileType, StepType
from backend.app.services.download_service import DownloadService
from backend.app.services.upload_service import UploadService
from backend.app.utils.response_utils import error_response

router = APIRouter()


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
        return await UploadService.upload_file(file, type, project_id)
    except Exception as e:
        return error_response(str(e))

@router.get("/media/{project_id}/{file_path:path}")
async def get_media(request: Request, project_id: str, file_path: str):
    """
    获取媒体文件（支持子目录）
    
    - **project_id**: 项目ID
    - **file_path**: 文件路径（可能包含子目录，如 preview/assets/images/xxx.jpg）
    """
    try:
        # 检查是否是范围请求（主要用于视频文件）
        range_header = request.headers.get("range")
        
        if range_header:
            # 处理范围请求
            return await DownloadService.serve_media_file_with_range(project_id, file_path, range_header)
        else:
            # 处理普通文件请求
            return await DownloadService.serve_media_file(project_id, file_path)
            
    except HTTPException:
        raise
    except Exception as e:
        return error_response(str(e))


@router.options("/media/{project_id}/{file_path:path}")
async def media_options():
    """处理CORS预检请求"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
        "Access-Control-Expose-Headers": "Content-Range, Accept-Ranges, Content-Length",
        "Access-Control-Max-Age": "86400"
    }


# ==================== 系统音频接口 ====================

@router.get("/system-audio")
async def get_system_audio():
    """
    获取系统音频列表
    从 assets/audio/image_bg 目录读取音频文件
    """
    try:
        audio_files = DownloadService.get_audio_list()
        return audio_files
    except Exception as e:
        return error_response(str(e))


@router.get("/system-audio/{filename}")
async def get_audio_file(filename: str):
    """
    获取系统音频文件
    
    - **filename**: 音频文件名
    """
    try:
        return await DownloadService.serve_system_audio_file(filename)
    except HTTPException:
        raise
    except Exception as e:
        return error_response(str(e))


# ==================== 文件下载接口 ====================

@router.get("/download/{project_id}/{file_path:path}")
async def download_project_file(project_id: str, file_path: str):
    """
    下载项目文件（支持子目录）
    
    - **project_id**: 项目ID
    - **file_path**: 文件路径（可能包含子目录，如 outputs/all_platforms.zip）
    """
    try:
        return await DownloadService.serve_download_file(project_id, file_path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        return error_response(str(e))


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
        return await DownloadService.serve_ad_download(file_path, platform)
    except FileNotFoundError as e:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": str(e)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.get("/download-file", response_class=FileResponse)
async def download_file(file_path: str = Query(..., description="文件路径，相对于项目根目录")):
    """
    下载通用文件API
    
    根据提供的文件路径下载文件
    
    - **file_path**: 文件路径，相对于项目根目录
    """
    try:
        return await DownloadService.serve_general_download(file_path)
    except FileNotFoundError as e:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": str(e)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
