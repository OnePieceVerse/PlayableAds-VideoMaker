"""
视频广告生成服务 v2 - 重构版本
基于 image_generate_service_v2 模式，使用 video_config_service
"""
import json
import logging
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional

from backend.app.models.schemas import VideoGenerateRequest
from backend.app.utils.file_utils import get_file_extension
from backend.app.utils.response_utils import error_response
from backend.app.services.common import validate_request_data
from backend.app.config import PROJECTS_DIR
from backend.app.services.base_generator import BaseAdGenerator

logger = logging.getLogger(__name__)


class VideoAdGenerator(BaseAdGenerator):
    """视频广告生成器类"""
    
    def __init__(self, request: VideoGenerateRequest, output_id: str):
        """
        初始化视频广告生成器
        
        Args:
            request: 视频广告生成请求
            output_id: 输出项目ID
        """
        super().__init__(request, output_id)
        
        # 验证请求数据
        is_valid, error_msg = validate_request_data(request, ['video_id', 'app_name'])
        if not is_valid:
            raise ValueError(error_msg)
    
    def generate(self) -> Tuple[List[str], str]:
        """
        生成视频广告
        
        Returns:
            tuple: (输出文件路径列表, 预览URL)
        """
        try:
            logger.info(f"Generating video ad for project: {self.output_id}")
            output_paths, preview_url = super().generate()
            logger.info(f"Video ad generation completed for project: {self.output_id}")
            return output_paths, preview_url
        except Exception as e:
            logger.error(f"Failed to generate video ad: {str(e)}")
            raise
    
    def _generate_config_files(self):
        """生成配置文件"""
        try:
            preview_dir = self.project_dir / "preview"
            
            # 使用 ConfigGenerator 生成配置
            config_generator = VideoConfigGenerator(self.request, self.output_id, self.preview_dir)
            config_content = config_generator.generate_config()
            
            # 写入 config.js 文件
            config_file = preview_dir / "config.js"
            with open(config_file, "w", encoding="utf-8") as f:
                f.write(config_content)
            
            logger.info(f"Config files generated: {config_file}")
            
        except Exception as e:
            logger.error(f"Failed to generate config files: {str(e)}")
            raise


class VideoConfigGenerator:
    """配置文件生成器类，负责生成 config.js 文件内容"""
    
    def __init__(self, request: VideoGenerateRequest, output_id: str, preview_dir: Path, relative_videos_dir: str = "assets/videos", relative_images_dir: str = "assets/images"):
        self.request = request
        self.project_dir = self._find_project_directory()
        self.preview_dir = preview_dir
        self.relative_videos_dir = relative_videos_dir
        self.relative_images_dir = relative_images_dir
        
        self.video_dir = preview_dir / relative_videos_dir
        self.image_dir = preview_dir / relative_images_dir
        
    def _find_project_directory(self) -> Optional[Path]:
        """查找项目目录"""
        project_dir = PROJECTS_DIR / self.request.project_id
        
        if project_dir.exists():
            return project_dir
            
        logger.warning(f"Project directory not found: {project_dir}")
        # 尝试查找包含video_id的目录作为备选
        for existing_dir in PROJECTS_DIR.iterdir():
            if existing_dir.is_dir() and self.request.video_id in str(existing_dir):
                logger.info(f"Found alternative project directory: {existing_dir}")
                return existing_dir
        
        return None
    
    def generate_config(self) -> str:
        """生成完整的配置文件内容"""
        # 1. 创建基础配置模板
        config = self._create_base_config()
        
        # 2. 添加交互点配置
        config["interactionPoints"] = self._build_interaction_points()
        
        # 3. 添加CTA按钮配置
        config.update(self._build_cta_buttons())
        
        # 4. 添加Banner配置
        banner_config = self._build_banners()
        if banner_config:
            config["banners"] = banner_config
        
        # 5. 生成最终的JavaScript配置文件
        return f"""window.PLAYABLE_CONFIG = {json.dumps(config, indent=2, ensure_ascii=False)};"""
    
    def _create_base_config(self) -> Dict[str, Any]:
        """创建基础配置模板
        
        生成的配置结构：
        {
            "appName": "应用名称",
            "version": "版本号",
            "videoUrl": "视频文件名.mp4",
            "orientation": "portrait|landscape",
            "rotateTime": -1,
            "volume": 1,
            "enableFirstClick": true
        }
        """
        video_ext = get_file_extension(self.project_dir, self.request.video_id) if self.project_dir else ".mp4"
        orientation = self._get_video_orientation()
        
        return {
            "appName": self.request.app_name,
            "version": self.request.version,
            "videoUrl": self.relative_videos_dir + f"/{self.request.video_id}{video_ext}",
            "orientation": orientation,
            "rotateTime": -1,
            "volume": 1,
            "enableFirstClick": True
        }
    
    def _get_video_orientation(self) -> str:
        """获取视频方向"""
        if hasattr(self.request, 'video_orientation'):
            if hasattr(self.request.video_orientation, 'value'):
                return self.request.video_orientation.value
            return str(self.request.video_orientation).lower()
        return "portrait"
    
    def _build_interaction_points(self) -> List[Dict[str, Any]]:
        """构建交互点配置
        
        每个交互点包含：
        - 基本信息（id, time, duration）
        - 按钮配置（图片、大小、位置、效果）
        - 引导图配置（图片、大小、位置）
        - 交互效果（swipeDirection）
        """
        interaction_points = []
        
        for i, frame in enumerate(self.request.pause_frames):
            interaction_point = {
                "id": f"interaction_{i + 1}",
                "time": frame.time,
                "duration": 0,
                "swipeDirection": "bounce"
            }
            
            # 添加按钮配置
            interaction_point.update(self._build_interaction_button(frame))
            
            # 添加引导图配置
            interaction_point.update(self._build_guide_image(frame))
            
            interaction_points.append(interaction_point)
        
        return interaction_points
    
    def _build_interaction_button(self, frame) -> Dict[str, Any]:
        """构建交互点的按钮配置"""
        # 默认使用通用按钮图片
        button_image = 'click_area.png'
        button_position = frame.position
        button_scale = frame.scale
        
        # 如果提供了自定义按钮图片，则使用它
        if frame.buttonImage_id:
            button_ext = get_file_extension(self.project_dir, frame.buttonImage_id) if self.project_dir else ".png"
            relative_path = f"{self.relative_images_dir}/{frame.buttonImage_id}{button_ext}"
            
            # 使用自定义按钮的位置和缩放
            if frame.buttonPosition:
                button_position = frame.buttonPosition
            if frame.buttonScale is not None:
                button_scale = frame.buttonScale
        
        return {
            "buttonImage": relative_path,
            "buttonEffect": "scale",
            "buttonSize": self._create_responsive_size(button_scale),
            "buttonPosition": self._create_responsive_position(button_position)
        }
    
    def _build_guide_image(self, frame) -> Dict[str, Any]:
        """构建交互点的引导图配置"""
        image_ext = get_file_extension(self.project_dir, frame.image_id) if self.project_dir else ".png"
        relative_path = f"{self.relative_images_dir}/{frame.image_id}{image_ext}"
        return {
            "guideImage": relative_path,
            "guideSize": self._create_responsive_size(frame.scale),
            "guidePosition": self._create_responsive_position(frame.position)
        }
    
    def _build_cta_buttons(self) -> Dict[str, Any]:
        """构建CTA按钮配置
        
        返回包含 cta_start_button 和 cta_end_button 的字典
        """
        cta_start_button = None
        cta_end_button = None
        
        for button in self.request.cta_buttons:
            button_config = self._create_cta_button_config(button)
            
            if button.type == "fulltime":
                cta_start_button = {**button_config, "id": "cta_start", "displayTime": 0}
            elif button.type == "endscreen":
                cta_end_button = {**button_config, "id": "cta_end", "displayTime": button.time or 0}
        
        return {
            "cta_start_button": cta_start_button or self._create_default_cta_start(),
            "cta_end_button": cta_end_button or self._create_default_cta_end()
        }
    
    def _create_cta_button_config(self, button) -> Dict[str, Any]:
        """创建单个CTA按钮的配置"""
        button_ext = get_file_extension(self.project_dir, button.image_id) if self.project_dir else ".png"
        relative_path = f"{self.relative_images_dir}/{button.image_id}{button_ext}"
        return {
            "buttonImage": relative_path,
            "buttonSize": self._create_responsive_size(button.scale),
            "buttonPosition": self._create_responsive_position(button.position),
            "url": "https://play.google.com/store/apps"
        }
    
    def _create_default_cta_start(self) -> Dict[str, Any]:
        """创建默认的开始CTA按钮配置"""
        return {
            "displayTime": 0,
            "buttonImage": "",
            "buttonSize": {
                "landscape": {"width": 20},
                "portrait": {"width": 40}
            },
            "buttonPosition": {
                "landscape": {"x": 50, "y": 80},
                "portrait": {"x": 50, "y": 80}
            },
            "url": "https://play.google.com/store/apps"
        }
    
    def _create_default_cta_end(self) -> Dict[str, Any]:
        """创建默认的结束CTA按钮配置"""
        return {
            "displayTime": 0,
            "buttonImage": "",
            "buttonSize": {
                "landscape": {"width": 30},
                "portrait": {"width": 60}
            },
            "buttonPosition": {
                "landscape": {"x": 50, "y": 50},
                "portrait": {"x": 50, "y": 50}
            },
            "url": "https://play.google.com/store/apps"
        }
    
    def _build_banners(self) -> Optional[Dict[str, Any]]:
        """构建Banner配置"""
        if not self.request.banners:
            return None
        
        banner_config = {}
        
        if isinstance(self.request.banners, list):
            banner_config = self._process_banner_list(self.request.banners)
        else:
            banner_config = self._process_banner_config(self.request.banners)
        
        return banner_config if banner_config else None
    
    def _process_banner_list(self, banners: List) -> Dict[str, Any]:
        """处理Banner列表格式"""
        banner_config = {}
        
        for banner in banners:
            banner_ext = get_file_extension(self.project_dir, banner.image_id) if self.project_dir else ".png"
            relative_path = f"{self.relative_images_dir}/{banner.image_id}{banner_ext}"
            banner_data = {
                "image_id": relative_path,
                "position": self._create_responsive_position(banner.position),
                "scale": banner.scale
            }
            
            if banner.type in ["left", "top"]:
                banner_config.update({
                    "left_image_id": relative_path,
                    "left_position": banner_data["position"],
                    "left_scale": banner_data["scale"]
                })
            elif banner.type in ["right", "bottom"]:
                banner_config.update({
                    "right_image_id": relative_path,
                    "right_position": banner_data["position"],
                    "right_scale": banner_data["scale"]
                })
        
        return banner_config
    
    def _process_banner_config(self, banners) -> Dict[str, Any]:
        """处理BannerConfig对象格式"""
        banner_config = {}
        
        # 处理左侧Banner
        if hasattr(banners, 'left_image_id') and banners.left_image_id:
            left_ext = get_file_extension(self.project_dir, banners.left_image_id) if self.project_dir else ".png"
            relative_path = f"{self.relative_images_dir}/{banners.left_image_id}{left_ext}"
            banner_config["left_image_id"] = relative_path
            
            if hasattr(banners, 'left_position') and banners.left_position:
                banner_config["left_position"] = self._create_responsive_position(banners.left_position)
            if hasattr(banners, 'left_scale') and banners.left_scale:
                banner_config["left_scale"] = banners.left_scale
        
        # 处理右侧Banner
        if hasattr(banners, 'right_image_id') and banners.right_image_id:
            right_ext = get_file_extension(self.project_dir, banners.right_image_id) if self.project_dir else ".png"
            relative_path = f"{self.relative_images_dir}/{banners.right_image_id}{right_ext}"
            banner_config["right_image_id"] = relative_path
            
            if hasattr(banners, 'right_position') and banners.right_position:
                banner_config["right_position"] = self._create_responsive_position(banners.right_position)
            if hasattr(banners, 'right_scale') and banners.right_scale:
                banner_config["right_scale"] = banners.right_scale
        
        return banner_config
    
    def _create_responsive_size(self, scale: float) -> Dict[str, Dict[str, float]]:
        """创建响应式尺寸配置"""
        return {
            "landscape": {"width": scale},
            "portrait": {"width": scale}
        }
    
    def _create_responsive_position(self, position) -> Dict[str, Dict[str, float]]:
        """创建响应式位置配置"""
        return {
            "landscape": {
                "x": round(position.left, 2),
                "y": round(position.top, 2)
            },
            "portrait": {
                "x": round(position.left, 2),
                "y": round(position.top, 2)
            }
        }


async def generate_video_ad_html(request: VideoGenerateRequest, output_id: str) -> Tuple[List[str], str]:
    """
    生成视频广告HTML（异步函数版本）
    
    Args:
        request: 视频广告生成请求
        output_id: 输出项目ID
        
    Returns:
        tuple: (输出文件URL列表, 预览URL)
    """
    try:
        logger.info(f"Starting video ad generation: {output_id}")
        
        # 创建视频广告生成器
        generator = VideoAdGenerator(request, output_id)
        
        # 生成广告
        output_files, preview_url = generator.generate()
        
        # 返回结果
        logger.info(f"Video ad generation completed successfully")
        logger.info(f"Output files: {len(output_files)}")
        logger.info(f"Preview URL: {preview_url}")
        
        return output_files, preview_url
        
    except Exception as e:
        logger.error(f"Video ad generation failed: {str(e)}")
        raise
