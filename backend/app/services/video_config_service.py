from backend.app.models.schemas import VideoGenerateRequest
from backend.app.config import PROJECTS_DIR
import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


def get_file_extension(project_dir: Path, file_id: str) -> str:
    """
    获取文件扩展名（简化版本）
    
    Args:
        project_dir: 项目目录
        file_id: 文件ID
        
    Returns:
        str: 文件扩展名，默认返回 .png
    """
    try:
        if project_dir and project_dir.exists():
            # 在项目目录中查找文件
            for file_path in project_dir.rglob("*"):
                if file_path.is_file() and file_path.stem == file_id:
                    return file_path.suffix
        
        # 默认扩展名
        return ".png"
        
    except Exception:
        return ".png"


class ConfigGenerator:
    """配置文件生成器类，负责生成 config.js 文件内容"""
    
    def __init__(self, request: VideoGenerateRequest):
        self.request = request
        self.project_dir = self._find_project_directory()
        
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
            "videoUrl": f"{self.request.video_id}{video_ext}",
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
            button_image = f"{frame.buttonImage_id}{button_ext}"
            
            # 使用自定义按钮的位置和缩放
            if frame.buttonPosition:
                button_position = frame.buttonPosition
            if frame.buttonScale is not None:
                button_scale = frame.buttonScale
        
        return {
            "buttonImage": button_image,
            "buttonEffect": "scale",
            "buttonSize": self._create_responsive_size(button_scale),
            "buttonPosition": self._create_responsive_position(button_position)
        }
    
    def _build_guide_image(self, frame) -> Dict[str, Any]:
        """构建交互点的引导图配置"""
        image_ext = get_file_extension(self.project_dir, frame.image_id) if self.project_dir else ".png"
        
        return {
            "guideImage": f"{frame.image_id}{image_ext}",
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
        
        return {
            "buttonImage": f"{button.image_id}{button_ext}",
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
            banner_data = {
                "image_id": f"{banner.image_id}{banner_ext}",
                "position": self._create_responsive_position(banner.position),
                "scale": banner.scale
            }
            
            if banner.type in ["left", "top"]:
                banner_config.update({
                    "left_image_id": banner_data["image_id"],
                    "left_position": banner_data["position"],
                    "left_scale": banner_data["scale"]
                })
            elif banner.type in ["right", "bottom"]:
                banner_config.update({
                    "right_image_id": banner_data["image_id"],
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
            banner_config["left_image_id"] = f"{banners.left_image_id}{left_ext}"
            
            if hasattr(banners, 'left_position') and banners.left_position:
                banner_config["left_position"] = self._create_responsive_position(banners.left_position)
            if hasattr(banners, 'left_scale') and banners.left_scale:
                banner_config["left_scale"] = banners.left_scale
        
        # 处理右侧Banner
        if hasattr(banners, 'right_image_id') and banners.right_image_id:
            right_ext = get_file_extension(self.project_dir, banners.right_image_id) if self.project_dir else ".png"
            banner_config["right_image_id"] = f"{banners.right_image_id}{right_ext}"
            
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


def generate_config_js(request: VideoGenerateRequest) -> str:
    """
    生成 config.js 文件内容
    
    Args:
        request: 生成请求对象，包含所有配置信息
        
    Returns:
        str: 完整的 config.js 文件内容
        
    生成的配置文件格式：
    window.PLAYABLE_CONFIG = {
        // 基础配置
        "appName": "应用名称",
        "version": "版本号", 
        "videoUrl": "视频文件.mp4",
        "orientation": "portrait",
        
        // 交互配置
        "interactionPoints": [...],
        "cta_start_button": {...},
        "cta_end_button": {...},
        
        // 可选配置
        "banners": {...}
    };
    """
    generator = ConfigGenerator(request)
    return generator.generate_config()