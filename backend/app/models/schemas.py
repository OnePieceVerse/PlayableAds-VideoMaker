from enum import Enum
from typing import List, Dict, Optional, Union, Literal
from pydantic import BaseModel, Field


class FileType(str, Enum):
    VIDEO = "video"
    IMAGE = "image"


class StepType(str, Enum):
    VIDEO_UPLOAD = "video_upload"
    IMAGE_UPLOAD = "image_upload"  # New step type for image uploads
    PAUSE_FRAMES = "pause_frames"
    CTA_BUTTONS = "cta_buttons"
    BANNER_IMAGES = "banner_images"
    EXPORT_AD = "export_ad"


class Position(str, Enum):
    LEFT = "left"
    RIGHT = "right"
    TOP = "top"
    BOTTOM = "bottom"


class PositionCoord(BaseModel):
    left: float
    top: float


class PauseFrame(BaseModel):
    time: float
    image_id: str
    position: PositionCoord
    scale: float = 1.0
    buttonImage_id: Optional[str] = None
    buttonPosition: Optional[PositionCoord] = None
    buttonScale: Optional[float] = None


class CTAButton(BaseModel):
    type: str  # fulltime or endscreen
    image_id: str
    position: PositionCoord
    scale: float = 1.0
    time: Optional[float] = None  # For endscreen button


class Banner(BaseModel):
    type: str  # left/top or right/bottom
    image_id: str
    position: PositionCoord
    scale: float = 1.0


class BannerConfig(BaseModel):
    left_image_id: Optional[str] = None
    right_image_id: Optional[str] = None
    left_position: Optional[PositionCoord] = None
    right_position: Optional[PositionCoord] = None
    left_scale: Optional[float] = None
    right_scale: Optional[float] = None


class Platform(str, Enum):
    GOOGLE = "google"
    FACEBOOK = "facebook"
    APPLOVIN = "applovin"
    MOLOCO = "moloco"
    TIKTOK = "tiktok"
    ALL = "all"

class Language(str, Enum):
    ENGLISH = "en"
    CHINESE = "zh"
    JAPANESE = "ja"
    KOREAN = "ko"
    FRENCH = "fr"
    GERMAN = "de"
    SPANISH = "es"


class UploadResponse(BaseModel):
    success: bool
    file_id: str = ""
    url: str = ""
    metadata: Optional[Dict] = None
    error: Optional[str] = None
    project_id: Optional[str] = None
    project_dir: Optional[str] = None
    is_new_project: Optional[bool] = None


class VideoOrientation(str, Enum):
    PORTRAIT = "portrait"
    LANDSCAPE = "landscape"


class GenerateRequest(BaseModel):
    video_id: str
    project_id: str
    pause_frames: List[PauseFrame] = []
    cta_buttons: List[CTAButton] = []
    banners: Optional[Union[List[Banner], BannerConfig]] = None
    platforms: List[Platform] = [Platform.GOOGLE]  # 修改为platforms列表
    language: Language = Language.ENGLISH
    version: str = "v1"
    app_name: str = "PlayableAds"
    video_orientation: VideoOrientation = VideoOrientation.PORTRAIT  # 新增视频方向参数


class GenerateResponse(BaseModel):
    success: bool
    file_url: Optional[str] = None
    preview_url: Optional[str] = None
    error: Optional[str] = None 
    project_id: Optional[str] = None

class Hotspot(BaseModel):
    left: float  # Position as percentage (0-100)
    top: float   # Position as percentage (0-100)
    type: str    # "jump" or "popup"
    url: Optional[str] = None  # For jump type
    modalImgs: Optional[List[str]] = None  # Image IDs for popup type
    modalText: Optional[str] = ""  # Text for popup modal
    imgIndex: int  # Index of the image this hotspot belongs to
    scale: Optional[float] = 1.0  # Scale factor for hotspot image

class ImageGenerateRequest(BaseModel):
    project_id: str
    images: List[str]  # List of image IDs
    hotspots: List[Hotspot] = []
    cta_buttons: List[CTAButton] = []
    audio_files: List[str] = []  # List of audio file IDs
    platforms: List[Platform] = [Platform.GOOGLE]
    language: Language = Language.ENGLISH
    version: str = "v1"
    app_name: str = "PlayableAds"
    orientation: VideoOrientation = VideoOrientation.PORTRAIT  # Reusing VideoOrientation enum 