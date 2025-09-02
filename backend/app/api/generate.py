from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
import os
import uuid
from pathlib import Path
from app.models.schemas import GenerateRequest, GenerateResponse, Platform
from app.services.generate_service import generate_ad_html, generate_ad_zip
import zipfile

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
        # 确保项目目录存在
        os.makedirs(PROJECTS_DIR, exist_ok=True)
        
        # 如果URL查询参数提供了project_id，使用它覆盖请求体中的project_id
        if project_id:
            request.project_id = project_id
        
        # 确保request中有project_id
        if not hasattr(request, 'project_id') or not request.project_id:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "project_id is required"}
            )
        
        # 使用request中的project_id
        output_id = request.project_id
        
        # 生成HTML文件
        output_path = await generate_ad_html(request, output_id)
        file_url = f"/projects/{output_path.parent.name}/{output_path.name}"
        
        # 获取预览URL
        preview_url = None
        
        # 如果是"all"平台，找到第一个平台的HTML文件用于预览
        if request.platform == Platform.ALL:
            # 查找项目目录
            project_dir = PROJECTS_DIR / output_id
            
            if project_dir.exists():
                # 首先尝试查找Facebook平台的HTML文件（优先使用Facebook，因为它是HTML格式）
                for file in project_dir.iterdir():
                    if file.suffix == ".html" and "facebook" in file.name.lower():
                        preview_url = f"/projects/{project_dir.name}/{file.name}"
                        print(f"Found Facebook preview file: {file.name}")
                        break
                
                # 如果没有找到Facebook文件，尝试查找AppLovin文件
                if not preview_url:
                    for file in project_dir.iterdir():
                        if file.suffix == ".html" and "applovin" in file.name.lower():
                            preview_url = f"/projects/{project_dir.name}/{file.name}"
                            print(f"Found AppLovin preview file: {file.name}")
                            break
                
                # 如果仍然没有找到，尝试查找任何HTML文件
                if not preview_url:
                    for file in project_dir.iterdir():
                        if file.suffix == ".html":
                            preview_url = f"/projects/{project_dir.name}/{file.name}"
                            print(f"Found generic HTML preview file: {file.name}")
                            break
                            
                # 如果仍然没有找到，尝试查找预览目录中的文件
                if not preview_url:
                    preview_dir = project_dir / "preview"
                    if preview_dir.exists():
                        html_files = list(preview_dir.glob("*.html"))
                        if html_files:
                            preview_url = f"/projects/{project_dir.name}/preview/{html_files[0].name}"
                            print(f"Found preview directory file: {html_files[0].name}")
            
            print(f"All Platforms preview_url: {preview_url}")

        
        # 如果是Google平台，需要找到对应的HTML文件用于预览
        elif request.platform == Platform.GOOGLE:
            # 查找项目目录
            project_dir = PROJECTS_DIR / output_id
            
            if project_dir.exists():
                # 首先查找预览目录中的HTML文件
                preview_dir = project_dir / "preview"
                if preview_dir.exists():
                    html_files = list(preview_dir.glob("*.html"))
                    if html_files:
                        preview_url = f"/projects/{project_dir.name}/preview/{html_files[0].name}"
                        print(f"Found Google preview file: {html_files[0].name}")
                
                # 如果没有找到预览文件，尝试查找任何包含google的HTML文件
                if not preview_url:
                    for file in project_dir.iterdir():
                        if file.suffix == ".html" and "google" in file.name.lower():
                            preview_url = f"/projects/{project_dir.name}/{file.name}"
                            print(f"Found Google HTML file: {file.name}")
                            break
            
            print(f"Google platform preview_url: {preview_url}")
        
        # 其他平台（Facebook, AppLovin）直接使用生成的HTML文件
        else:
            # 如果输出文件是HTML，直接用作预览
            if output_path.suffix == ".html":
                preview_url = file_url
                print(f"Using direct output file for preview: {output_path.name}")
            # 如果输出文件不是HTML（可能是ZIP），尝试在项目目录中查找对应平台的HTML文件
            else:
                project_dir = PROJECTS_DIR / output_id
                if project_dir.exists():
                    platform_name = request.platform.value.lower()
                    for file in project_dir.iterdir():
                        if file.suffix == ".html" and platform_name in file.name.lower():
                            preview_url = f"/projects/{project_dir.name}/{file.name}"
                            print(f"Found {platform_name} HTML file for preview: {file.name}")
                            break
            
            print(f"{request.platform} platform preview_url: {preview_url}")
        
        return {
            "success": True,
            "file_url": file_url,
            "preview_url": preview_url,
            "project_id": output_id
        }
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

@router.get("/download/{project_id}/{file_name}")
async def download_file(project_id: str, file_name: str):
    """
    下载生成的文件
    """
    file_path = PROJECTS_DIR / project_id / file_name
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="application/octet-stream"
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