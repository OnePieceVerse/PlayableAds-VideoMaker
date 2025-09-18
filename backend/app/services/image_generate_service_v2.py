"""
图片广告生成服务 v2 - 重构版本
基于 config_service 模式，使用函数化设计
"""
import os
import re
import shutil
import zipfile
import logging
import json
import base64
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional

from backend.app.models.schemas import ImageVideoGenerateRequest, Platform
from backend.app.utils.file_utils import copy_file_safely, create_directory_structure
from backend.app.utils.response_utils import success_response, error_response
from backend.app.services.common import create_assets_directory_structure, validate_request_data, get_file_path
from backend.app.utils.audio_utils import get_system_audio_path
from backend.app.config import PROJECTS_DIR, BACKEND_BASE_URL
from backend.app.services.base_generator import BaseAdGenerator

logger = logging.getLogger(__name__)


class ImageAdGenerator(BaseAdGenerator):
    """图片广告生成器类"""
    
    def __init__(self, request: ImageVideoGenerateRequest, output_id: str):
        """
        初始化图片广告生成器
        
        Args:
            request: 图片广告生成请求
            output_id: 输出项目ID
        """
        super().__init__(request, output_id)
        
        # 验证请求数据
        is_valid, error_msg = validate_request_data(request, ['images', 'app_name'])
        if not is_valid:
            raise ValueError(error_msg)
    
    def generate(self) -> Tuple[List[str], str]:
        """
        生成图片广告
        
        Returns:
            tuple: (输出文件路径列表, 预览URL)
        """
        try:
            logger.info(f"Generating image ad for project: {self.output_id}")
            output_paths, preview_url = super().generate()
            logger.info(f"Image ad generation completed for project: {self.output_id}")
            return output_paths, preview_url
        except Exception as e:
            logger.error(f"Failed to generate image ad: {str(e)}")
            raise
    
    def _generate_config_files(self) -> None:
        """生成配置文件"""
        
        # 使用ImageConfigGenerator生成配置
        config_generator = ImageConfigGenerator(self.request, self.output_id, self.preview_dir)
        
        # 生成config.js
        config_content = config_generator.generate_config()
        config_file = self.preview_dir / "config.js"
        with open(config_file, "w", encoding="utf-8") as f:
            f.write(config_content)
        logger.info("Generated config.js")


class ImageConfigGenerator:
    """图片广告配置文件生成器类，负责生成 config.js 和 images.js 文件内容"""
    
    def __init__(self, request: ImageVideoGenerateRequest, output_id: str, 
                 preview_dir: Path, relative_images_dir: str = "assets/images", 
                 relative_audios_dir: str = "assets/audios"):
        """
        初始化配置生成器
        
        Args:
            request: 图片广告生成请求
            output_id: 输出项目ID
            preview_dir: 预览目录路径
            relative_images_dir: 相对图片目录路径
            relative_audios_dir: 相对音频目录路径
        """
        self.request = request
        self.output_id = output_id
        self.preview_dir = preview_dir
        self.relative_images_dir = relative_images_dir
        self.relative_audios_dir = relative_audios_dir
        
        # 目录路径（上传接口已经创建了这些目录）
        self.image_dir = preview_dir / relative_images_dir
        self.audio_dir = preview_dir / relative_audios_dir
        
        # 缓存处理后的数据
        self._main_images = None
        self._hotspot_data = None
        self._cta_buttons_data = None
        self._audio_files = None
        self._images_data = None
    
    def process_all_data(self) -> Tuple[Dict[str, str], List[str], List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        """
        处理所有数据并返回处理结果
        
    Returns:
            tuple: (images_data, main_images, hotspot_data, cta_buttons_data, audio_files)
        """
        logger.info(f"Processing all data for project: {self.output_id}")
        
        # 处理所有数据
        self._process_main_images()
        self._process_hotspots()
        self._process_cta_buttons()
        self._process_audio_files()
        
        return (self._images_data, self._main_images, self._hotspot_data, 
                self._cta_buttons_data, self._audio_files)
    
    def _process_main_images(self) -> None:
        """处理主图片文件"""
        if self._main_images is not None:
            return
            
        self._main_images = []
        if self._images_data is None:
            self._images_data = {}
        
        logger.info(f"Processing {len(self.request.images)} main images")
        
        for image_id in self.request.images:
            image_path = get_file_path(image_id)
            if image_path and image_path.exists():
                file_name = image_path.name
                logger.info(f"Processing image: {file_name}")
                
                # 文件已经在正确位置，直接使用
                relative_path = f"{self.relative_images_dir}/{file_name}"
                self._main_images.append(relative_path)
                
                # 生成base64数据
                self._add_image_to_data(image_path, relative_path)
    
    def _process_hotspots(self) -> None:
        """处理热点数据"""
        if self._hotspot_data is not None:
            return
            
        self._hotspot_data = []
        if self._images_data is None:
            self._images_data = {}
        
        logger.info(f"Processing {len(self.request.hotspots)} hotspots")
        
        for i, hotspot in enumerate(self.request.hotspots):
            logger.info(f"Processing hotspot {i+1}: type={hotspot.type}, position=({hotspot.left}, {hotspot.top})")
            
            hotspot_info = {
                "left": f"{hotspot.left}%",
                "top": f"{hotspot.top}%",
                "type": hotspot.type,
                "imgIndex": hotspot.imgIndex,
                "scale": getattr(hotspot, 'scale', 1.0)
            }
            
            # 处理跳转URL
            if hotspot.type == "url" and hotspot.url:
                hotspot_info["url"] = hotspot.url
                logger.info(f"Hotspot {i+1} is jump type with URL: {hotspot.url}")
            
            # 处理弹窗内容
            if hotspot.type == "popup":
                if hotspot.modalText:
                    hotspot_info["modalText"] = hotspot.modalText
                    logger.info(f"Hotspot {i+1} has modal text: {hotspot.modalText}")
                
                if hotspot.modalImgs:
                    modal_images = []
                    for img_id in hotspot.modalImgs:
                        modal_image_path = self._process_hotspot_modal_image(img_id)
                        if modal_image_path:
                            modal_images.append(modal_image_path)
                    hotspot_info["modalImgs"] = modal_images
                    logger.info(f"Hotspot {i+1} has {len(modal_images)} modal images")
            
            # 处理热点自定义图片（只有在不使用默认SVG时才处理）
            if hasattr(hotspot, 'useDefaultSvg') and not hotspot.useDefaultSvg and hotspot.hotspotImage:
                custom_image_path = self._process_hotspot_custom_image(hotspot.hotspotImage)
                if custom_image_path:
                    hotspot_info["hotspotImage"] = custom_image_path
            elif not hasattr(hotspot, 'useDefaultSvg') and hotspot.hotspotImage:
                # 向后兼容：如果没有useDefaultSvg字段，按原来的逻辑处理
                custom_image_path = self._process_hotspot_custom_image(hotspot.hotspotImage)
                if custom_image_path:
                    hotspot_info["hotspotImage"] = custom_image_path
            
            self._hotspot_data.append(hotspot_info)
    
    def _process_hotspot_modal_image(self, img_id: str) -> Optional[str]:
        """处理热点弹窗图片"""
        logger.info(f"Processing modal image ID: {img_id}")
        image_path = get_file_path(img_id)
        if image_path and image_path.exists():
            file_name = image_path.name
            
            # 文件已经在正确位置，直接使用
            relative_path = f"{self.relative_images_dir}/{file_name}"
            self._add_image_to_data(image_path, relative_path)
            
            return relative_path
        return None
    
    def _process_hotspot_custom_image(self, img_id: str) -> Optional[str]:
        """处理热点自定义图片"""
        logger.info(f"Processing hotspot custom image ID: {img_id}")
        image_path = get_file_path(img_id)
        if image_path and image_path.exists():
            file_name = image_path.name
            
            # 文件已经在正确位置，直接使用
            relative_path = f"{self.relative_images_dir}/{file_name}"
            self._add_image_to_data(image_path, relative_path)
            
            return relative_path
        else:
            logger.warning(f"Hotspot custom image not found for ID: {img_id}")
        return None
    
    def _process_cta_buttons(self) -> None:
        """处理CTA按钮数据"""
        if self._cta_buttons_data is not None:
            return
            
        self._cta_buttons_data = []
        if self._images_data is None:
            self._images_data = {}
        
        logger.info(f"Processing {len(self.request.cta_buttons)} CTA buttons")
        
        for i, cta_button in enumerate(self.request.cta_buttons):
            logger.info(f"Processing CTA button {i+1}: type={cta_button.type}")
            
            # 获取CTA按钮图片
            cta_image_path = get_file_path(cta_button.image_id)
            if cta_image_path and cta_image_path.exists():
                file_name = cta_image_path.name
                
                # 文件已经在正确位置，直接使用
                relative_path = f"{self.relative_images_dir}/{file_name}"
                self._add_image_to_data(cta_image_path, relative_path)
                
                cta_button_info = {
                    "type": cta_button.type,
                    "image": relative_path,
                    "position": {
                        "left": f"{cta_button.position.left}%",
                        "top": f"{cta_button.position.top}%"
                    },
                    "scale": cta_button.scale,
                    "time": cta_button.time
                }
                self._cta_buttons_data.append(cta_button_info)
            else:
                logger.warning(f"CTA button image not found for ID: {cta_button.image_id}")
    
    def _process_audio_files(self) -> None:
        """处理音频文件"""
        if self._audio_files is not None:
            return
            
        self._audio_files = []
        logger.info(f"Processing {len(self.request.audio_files)} audio files")
        
        for audio_id in self.request.audio_files:
            # 首先尝试作为上传文件处理
            audio_path = get_file_path(audio_id)
            
            # 如果上传文件不存在，尝试作为系统音频处理
            if not audio_path or not audio_path.exists():
                audio_path = get_system_audio_path(audio_id)
                if audio_path:
                    logger.info(f"Found system audio: {audio_id}")
                    # 系统音频需要复制到预览目录
                    file_name = audio_path.name
                    target_path = self.audio_dir / file_name
                    self._copy_file_safely(audio_path, target_path)
                    self._audio_files.append(f"{self.relative_audios_dir}/{file_name}")
                    continue
            
            if audio_path and audio_path.exists():
                file_name = audio_path.name
                target_path = self.audio_dir / file_name
                
                # 检查文件是否已在正确位置，如果不在则复制
                if not target_path.exists() or target_path.resolve() != audio_path.resolve():
                    self._copy_file_safely(audio_path, target_path)
                    logger.info(f"Copied uploaded audio to preview directory: {file_name}")
                
                self._audio_files.append(f"{self.relative_audios_dir}/{file_name}")
        else:
            logger.warning(f"Audio file not found for ID: {audio_id}")
    
    def _copy_file_safely(self, source: Path, target: Path) -> None:
        """安全地复制文件"""
        if source != target:
            try:
                shutil.copy(source, target)
            except shutil.SameFileError:
                logger.warning(f"Source and destination are the same file: {source}")
        else:
            logger.info(f"File already in correct location: {source}")
    
    def _add_image_to_data(self, image_path: Path, relative_path: str) -> None:
        """将图片添加到base64数据中"""
        try:
            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")
                image_ext = image_path.suffix.lower()[1:]  # 去掉点号
                mime_type = f"image/{image_ext}"
                if image_ext == "jpg":
                    mime_type = "image/jpeg"
                self._images_data[relative_path] = f"data:{mime_type};base64,{image_data}"
                logger.info(f"Added base64 image data for {relative_path}")
        except Exception as e:
            logger.error(f"Failed to encode image {image_path}: {str(e)}")
        
    def generate_config(self) -> str:
        """生成完整的配置文件内容
        
        生成的配置结构：
        {
            "title": "应用名称",
            "appImgs": ["image1.jpg", "image2.png"],
            "hotspots": [...],
            "cta_buttons": [...],
            "audio": ["audio1.mp3"] // 可选
        }
        """
        # 1. 处理所有数据（如果尚未处理）
        if self._main_images is None:
            self.process_all_data()
        
        # 2. 创建基础配置模板
        config = self._create_base_config()
        
        # 3. 添加各模块配置
        config.update(self._build_images_config())
        config.update(self._build_hotspots_config())
        config.update(self._build_cta_buttons_config())
        config.update(self._build_audio_config())
        
        # 4. 生成最终的JavaScript配置文件
        return f"""window.PLAYABLE_CONFIG = {json.dumps(config, indent=2, ensure_ascii=False)};"""
    
    def _create_base_config(self) -> Dict[str, Any]:
        """创建基础配置模板
        
        包含应用的基本信息：
        {
            "title": "应用名称",
            "singleFileMode": false
        }
        """
        return {
            "title": self.request.app_name,
            "singleFileMode": getattr(self.request, 'single_file_mode', False)
        }
    
    def _build_images_config(self) -> Dict[str, Any]:
        """构建图片配置
        
        返回主要展示图片的配置
        """
        return {
            "appImgs": self._main_images or []
        }
    
    def _build_hotspots_config(self) -> Dict[str, Any]:
        """构建热点配置
        
        热点类型包括：
        - popup: 弹窗类型，显示文本和图片
        - url: 跳转类型，直接跳转到指定URL
        """
        return {
            "hotspots": self._hotspot_data or []
        }
    
    def _build_cta_buttons_config(self) -> Dict[str, Any]:
        """构建CTA按钮配置
        
        CTA按钮类型包括：
        - fulltime: 全程显示的按钮
        - endscreen: 在特定时间显示的按钮
        """
        return {
            "cta_buttons": self._cta_buttons_data or []
        }
    
    def _build_audio_config(self) -> Dict[str, Any]:
        """构建音频配置（可选）
        
        返回音频文件列表，如果没有音频文件则返回空字典
        """
        if self._audio_files:
            return {"audio": self._audio_files}
        return {}


async def generate_image_ad_html(request: ImageVideoGenerateRequest, output_id: str) -> Tuple[List[str], str]:
    """
    生成互动图片广告HTML文件（便捷函数）
    
    Args:
        request: 生成请求
        output_id: 输出ID
        
    Returns:
        tuple: (输出文件路径列表, 预览URL)
    """
    try:
        generator = ImageAdGenerator(request, output_id)
        return generator.generate()
    except Exception as e:
        logger.error(f"Image ad generation failed: {str(e)}")
        raise
