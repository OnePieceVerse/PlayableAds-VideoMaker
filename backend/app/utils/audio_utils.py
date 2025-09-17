"""
音频处理工具类
"""
import subprocess
import struct
import wave
from pathlib import Path
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def get_duration_with_ffprobe(file_path: Path) -> float:
    """
    使用ffprobe获取音频时长
    
    Args:
        file_path: 音频文件路径
        
    Returns:
        float: 时长（秒），失败返回0
    """
    try:
        cmd = [
            "ffprobe", 
            "-v", "error", 
            "-show_entries", "format=duration", 
            "-of", "default=noprint_wrappers=1:nokey=1", 
            str(file_path)
        ]
        
        result = subprocess.run(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True, 
            timeout=2
        )
        
        if result.returncode == 0:
            return float(result.stdout.strip())
            
    except (subprocess.SubprocessError, subprocess.TimeoutExpired, ValueError) as e:
        logger.debug(f"ffprobe failed for {file_path}: {str(e)}")
    
    return 0


def get_mp3_duration(file_path: Path) -> float:
    """
    使用二进制解析获取MP3文件时长
    
    Args:
        file_path: MP3文件路径
        
    Returns:
        float: 时长（秒）
    """
    try:
        with open(file_path, 'rb') as f:
            # 跳过ID3v2标签
            header = f.read(10)
            if header[:3] == b'ID3':
                tag_size = struct.unpack('>I', b'\x00' + header[6:9])[0]
                f.seek(tag_size + 10)
            else:
                f.seek(0)
            
            # 查找第一个有效的MP3帧
            while True:
                pos = f.tell()
                header = f.read(4)
                if len(header) < 4:
                    return 0
                
                # 检查有效帧头
                if header[0] == 0xFF and (header[1] & 0xE0) == 0xE0:
                    bitrate_index = (header[2] & 0xF0) >> 4
                    sampling_rate_index = (header[2] & 0x0C) >> 2
                    
                    # 比特率表 (kbps) - MPEG1, Layer III
                    bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
                    bitrate = bitrates[bitrate_index] * 1000
                    
                    # 采样率表 (Hz)
                    sampling_rates = [44100, 48000, 32000, 0]
                    sampling_rate = sampling_rates[sampling_rate_index]
                    
                    if bitrate > 0 and sampling_rate > 0:
                        # 获取文件大小
                        f.seek(0, 2)
                        file_size = f.tell()
                        
                        # 估算时长
                        duration_seconds = file_size * 8 / bitrate
                        return duration_seconds
                    break
                
                # 不是有效帧，尝试下一个字节
                f.seek(pos + 1)
        
        return 0
        
    except Exception as e:
        logger.error(f"Error parsing MP3 file {file_path}: {str(e)}")
        return 0


def get_wav_duration(file_path: Path) -> float:
    """
    获取WAV文件时长
    
    Args:
        file_path: WAV文件路径
        
    Returns:
        float: 时长（秒）
    """
    try:
        with wave.open(str(file_path), 'rb') as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate()
            duration = frames / float(rate)
            return duration
            
    except Exception as e:
        logger.error(f"Error parsing WAV file {file_path}: {str(e)}")
        return 0


def estimate_duration_by_size(file_path: Path) -> float:
    """
    根据文件大小估算时长
    
    Args:
        file_path: 音频文件路径
        
    Returns:
        float: 估算的时长（秒）
    """
    try:
        # 假设平均比特率为128kbps
        file_size = file_path.stat().st_size
        duration_seconds = (file_size * 8) / (128 * 1024)
        return duration_seconds
        
    except Exception as e:
        logger.error(f"Error estimating duration for {file_path}: {str(e)}")
        return 30  # 默认30秒


def get_audio_duration(file_path: Path) -> str:
    """
    获取音频文件时长（综合方法）
    
    Args:
        file_path: 音频文件路径
        
    Returns:
        str: 格式化的时长 (mm:ss)
    """
    try:
        # 首先尝试使用ffprobe
        duration_seconds = get_duration_with_ffprobe(file_path)
        
        if duration_seconds <= 0:
            # ffprobe失败，使用备用方法
            suffix = file_path.suffix.lower()
            if suffix == '.mp3':
                duration_seconds = get_mp3_duration(file_path)
            elif suffix == '.wav':
                duration_seconds = get_wav_duration(file_path)
            else:
                # 其他格式使用文件大小估算
                duration_seconds = estimate_duration_by_size(file_path)
        
        # 转换为分:秒格式
        minutes = int(duration_seconds // 60)
        seconds = int(duration_seconds % 60)
        
        return f"{minutes}:{seconds:02d}"
        
    except Exception as e:
        logger.error(f"Error getting audio duration for {file_path}: {str(e)}")
        return "0:30"  # 默认返回30秒


def categorize_audio_by_name(file_name: str) -> str:
    """
    根据文件名对音频进行分类
    
    Args:
        file_name: 文件名
        
    Returns:
        str: 音频分类
    """
    if "游戏" in file_name or "游戏配乐" in file_name:
        return "Game Music"
    elif "欢快" in file_name or "温馨" in file_name:
        return "Upbeat"
    elif "通用" in file_name:
        return "General"
    else:
        return "Background Music"


def validate_audio_file_extension(filename: str) -> bool:
    """
    验证音频文件扩展名
    
    Args:
        filename: 文件名
        
    Returns:
        bool: 是否为有效的音频文件扩展名
    """
    valid_extensions = ['.mp3', '.wav', '.m4a', '.ogg']
    file_path = Path(filename)
    return file_path.suffix.lower() in valid_extensions


def get_system_audio_path(audio_id: str) -> Optional[Path]:
    """
    获取系统音频文件路径
    
    Args:
        audio_id: 系统音频ID
        
    Returns:
        Path: 系统音频文件路径，如果不存在则返回None
    """
    try:
        # 系统音频目录
        # 从 backend/app/utils/audio_utils.py 到 backend/app/assets/audio/image_bg
        system_audio_dir = Path(__file__).parent.parent / "assets" / "audio" / "image_bg"
        
        if not system_audio_dir.exists():
            logger.warning(f"System audio directory not found: {system_audio_dir}")
            return None
        
        # 查找匹配的音频文件
        for audio_file in system_audio_dir.iterdir():
            if audio_file.is_file():
                # 支持完整文件名或仅文件名（不含扩展名）的匹配
                if (audio_file.name.lower() == audio_id.lower() or 
                    audio_file.stem.lower() == audio_id.lower()):
                    logger.info(f"Found system audio: {audio_file}")
                    return audio_file
        
        logger.warning(f"System audio not found: {audio_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error getting system audio path: {str(e)}")
        return None
