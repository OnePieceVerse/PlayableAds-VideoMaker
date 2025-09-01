from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Union, Literal
from enum import Enum


class FileType(str, Enum):
    VIDEO = "video"
    IMAGE = "image"


class StepType(str, Enum):
    VIDEO = "video"
    PAUSE = "pause"
    CTA = "cta"
    BANNER = "banner"


class Position(str, Enum):
    LEFT = "left"
    RIGHT = "right"
    CENTER = "center"


class Platform(str, Enum):
    GOOGLE = "google"
    FACEBOOK = "facebook"
    APPLOVIN = "applovin"


class UploadResponse(BaseModel):
    success: bool
    file_id: str = ""
    url: str = ""
    metadata: Optional[Dict] = None
    error: Optional[str] = None


class PositionConfig(BaseModel):
    left: float = Field(..., description="Left position percentage (0-100)")
    top: float = Field(..., description="Top position percentage (0-100)")


class PauseFrame(BaseModel):
    time: float = Field(..., description="Pause time in seconds")
    image_id: str = Field(..., description="Image ID for the guide")
    position: PositionConfig


class CTAButton(BaseModel):
    type: Literal["fulltime", "endscreen"] = Field(..., description="Button display type")
    image_id: str = Field(..., description="Image ID for the CTA button")
    position: PositionConfig
    start_time: Optional[float] = Field(None, description="Start time for endscreen buttons (seconds)")


class BannerConfig(BaseModel):
    left_image_id: Optional[str] = None
    right_image_id: Optional[str] = None


class GenerateRequest(BaseModel):
    video_id: str = Field(..., description="Video file ID")
    pause_frames: List[PauseFrame] = Field(default_factory=list)
    cta_buttons: List[CTAButton] = Field(default_factory=list)
    banners: Optional[BannerConfig] = None
    platform: Platform = Field(..., description="Target platform")


class GenerateResponse(BaseModel):
    success: bool
    file_url: Optional[str] = None
    preview_url: Optional[str] = None
    error: Optional[str] = None 