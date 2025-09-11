from fastapi import APIRouter, HTTPException
import os
import json
from pathlib import Path
import subprocess
import re
import mimetypes
import struct
import wave

router = APIRouter()

def get_mp3_duration(file_path):
    """
    Get the duration of an MP3 file using binary parsing
    This is a fallback method if ffprobe is not available
    """
    try:
        with open(file_path, 'rb') as f:
            # Skip ID3v2 tag if present
            header = f.read(10)
            if header[:3] == b'ID3':
                tag_size = struct.unpack('>I', b'\x00' + header[6:9])[0]
                f.seek(tag_size + 10)
            else:
                f.seek(0)
            
            # Find the first valid MP3 frame
            while True:
                pos = f.tell()
                header = f.read(4)
                if len(header) < 4:
                    return 0  # End of file
                
                # Check for valid frame header
                if header[0] == 0xFF and (header[1] & 0xE0) == 0xE0:
                    # Valid frame found
                    bitrate_index = (header[2] & 0xF0) >> 4
                    sampling_rate_index = (header[2] & 0x0C) >> 2
                    padding_bit = (header[2] & 0x02) >> 1
                    
                    # Bitrate table (kbps) - MPEG1, Layer III
                    bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
                    bitrate = bitrates[bitrate_index] * 1000
                    
                    # Sampling rate table (Hz)
                    sampling_rates = [44100, 48000, 32000, 0]
                    sampling_rate = sampling_rates[sampling_rate_index]
                    
                    if bitrate > 0 and sampling_rate > 0:
                        # Get file size
                        f.seek(0, 2)  # Go to end of file
                        file_size = f.tell()
                        
                        # Estimate duration
                        duration_seconds = file_size * 8 / bitrate
                        return duration_seconds
                    break
                
                # Not a valid frame, try next byte
                f.seek(pos + 1)
        
        return 0
    except Exception as e:
        print(f"Error parsing MP3 file: {e}")
        return 0

def get_wav_duration(file_path):
    """
    Get the duration of a WAV file
    """
    try:
        with wave.open(str(file_path), 'rb') as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate()
            duration = frames / float(rate)
            return duration
    except Exception as e:
        print(f"Error parsing WAV file: {e}")
        return 0

def get_audio_duration(file_path):
    """
    使用ffprobe获取音频文件的实际时长，如果失败则尝试其他方法
    """
    try:
        # 首先尝试使用ffprobe获取音频时长
        cmd = [
            "ffprobe", 
            "-v", "error", 
            "-show_entries", "format=duration", 
            "-of", "default=noprint_wrappers=1:nokey=1", 
            str(file_path)
        ]
        
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=2)
            
            if result.returncode == 0:
                # 获取秒数并转换为分:秒格式
                duration_seconds = float(result.stdout.strip())
                minutes = int(duration_seconds // 60)
                seconds = int(duration_seconds % 60)
                
                return f"{minutes}:{seconds:02d}"
        except (subprocess.SubprocessError, subprocess.TimeoutExpired) as e:
            print(f"ffprobe failed: {e}")
            # 继续尝试其他方法
            
        # 如果ffprobe失败，根据文件类型尝试其他方法
        suffix = file_path.suffix.lower()
        duration_seconds = 0
        
        if suffix == '.mp3':
            duration_seconds = get_mp3_duration(file_path)
        elif suffix == '.wav':
            duration_seconds = get_wav_duration(file_path)
        else:
            # 对于其他类型，使用文件大小估算
            # 假设平均比特率为128kbps
            file_size = file_path.stat().st_size
            duration_seconds = (file_size * 8) / (128 * 1024)
        
        # 转换为分:秒格式
        minutes = int(duration_seconds // 60)
        seconds = int(duration_seconds % 60)
        
        return f"{minutes}:{seconds:02d}"
    except Exception as e:
        print(f"Error getting audio duration: {e}")
        return "0:30"  # 默认返回30秒

@router.get("/system-audio")
async def get_system_audio():
    """
    获取系统音频列表
    从 assets/audio/image_bg 目录读取音频文件
    """
    try:
        # 获取音频目录路径
        audio_dir = Path(__file__).parent.parent / "assets" / "audio" / "image_bg"
        
        if not audio_dir.exists():
            return []
        
        audio_files = []
        
        # 遍历音频目录
        for file_path in audio_dir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in ['.mp3', '.wav', '.m4a', '.ogg']:
                # 获取文件信息
                file_name = file_path.stem  # 不带扩展名的文件名
                file_size = file_path.stat().st_size
                
                # 根据文件名生成分类和描述
                category = "Background Music"
                if "游戏" in file_name or "游戏配乐" in file_name:
                    category = "Game Music"
                elif "欢快" in file_name or "温馨" in file_name:
                    category = "Upbeat"
                elif "通用" in file_name:
                    category = "General"
                
                # 获取实际音频时长
                duration = get_audio_duration(file_path)
                print(f"Audio file: {file_name}, Duration: {duration}")
                
                # 生成音频信息
                audio_info = {
                    "id": file_name.lower().replace(" ", "_").replace("-", "_"),
                    "name": file_name,
                    "category": category,
                    "duration": duration,
                    "url": f"/api/system-audio/{file_name}{file_path.suffix}",
                    "file_path": str(file_path),
                    "size": file_size
                }
                
                audio_files.append(audio_info)
        
        # 按分类排序
        audio_files.sort(key=lambda x: (x["category"], x["name"]))
        
        return audio_files
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system audio: {str(e)}")

@router.get("/system-audio/{filename}")
async def get_audio_file(filename: str):
    """
    获取音频文件
    """
    try:
        # 获取音频目录路径
        audio_dir = Path(__file__).parent.parent / "assets" / "audio" / "image_bg"
        file_path = audio_dir / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        # 返回文件
        from fastapi.responses import FileResponse
        return FileResponse(
            path=str(file_path),
            media_type="audio/mpeg",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get audio file: {str(e)}")
