import os
import shutil
import zipfile
import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from app.models.schemas import GenerateRequest, Platform

# 模板目录
TEMPLATE_DIR = Path("app/templates")

# 确保模板目录存在
os.makedirs(TEMPLATE_DIR, exist_ok=True)

# 初始化Jinja2环境
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

async def generate_ad_html(request: GenerateRequest, output_id: str, output_dir: Path) -> Path:
    """
    生成HTML格式的广告文件
    """
    # 选择合适的模板
    if request.platform == Platform.GOOGLE:
        template_name = "google_template.html"
    elif request.platform == Platform.FACEBOOK:
        template_name = "facebook_template.html"
    else:
        template_name = "default_template.html"
    
    # 确保模板存在，如果不存在则创建
    await ensure_template_exists(template_name)
    
    # 获取模板
    template = env.get_template(template_name)
    
    # 准备数据
    data = {
        "video_url": f"/static/uploads/video/{request.video_id}.mp4",  # 假设视频是MP4格式
        "pause_frames": [
            {
                "time": frame.time,
                "image_url": f"/static/uploads/image/{frame.image_id}.png",  # 假设图片是PNG格式
                "position": {
                    "left": frame.position.left,
                    "top": frame.position.top
                }
            }
            for frame in request.pause_frames
        ],
        "cta_buttons": [
            {
                "type": button.type,
                "image_url": f"/static/uploads/image/{button.image_id}.png",  # 假设图片是PNG格式
                "position": {
                    "left": button.position.left,
                    "top": button.position.top
                },
                "start_time": button.start_time
            }
            for button in request.cta_buttons
        ],
        "banners": {}
    }
    
    # 添加Banner信息（如果有）
    if request.banners:
        if request.banners.left_image_id:
            data["banners"]["left"] = f"/static/uploads/image/{request.banners.left_image_id}.png"
        if request.banners.right_image_id:
            data["banners"]["right"] = f"/static/uploads/image/{request.banners.right_image_id}.png"
    
    # 渲染模板
    html_content = template.render(**data)
    
    # 保存HTML文件
    output_filename = f"{request.platform}_{output_id}.html"
    output_path = output_dir / output_filename
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    return output_path

async def generate_ad_zip(request: GenerateRequest, output_id: str, output_dir: Path) -> Path:
    """
    生成ZIP格式的广告文件
    """
    # 创建临时目录
    temp_dir = output_dir / f"temp_{output_id}"
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # 生成HTML文件
        html_path = await generate_ad_html(request, output_id, temp_dir)
        
        # 创建配置文件
        config = {
            "platform": request.platform,
            "video_id": request.video_id,
            "pause_frames": [frame.dict() for frame in request.pause_frames],
            "cta_buttons": [button.dict() for button in request.cta_buttons]
        }
        
        if request.banners:
            config["banners"] = request.banners.dict()
        
        config_path = temp_dir / "config.json"
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        
        # 创建ZIP文件
        zip_filename = f"{request.platform}_{output_id}.zip"
        zip_path = output_dir / zip_filename
        
        with zipfile.ZipFile(zip_path, "w") as zipf:
            # 添加HTML文件
            zipf.write(html_path, html_path.name)
            
            # 添加配置文件
            zipf.write(config_path, config_path.name)
            
            # 添加资源文件（这里需要根据实际情况添加）
            # TODO: 添加视频、图片等资源文件
        
        return zip_path
    
    finally:
        # 清理临时目录
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

async def ensure_template_exists(template_name: str):
    """
    确保模板文件存在，如果不存在则创建默认模板
    """
    template_path = TEMPLATE_DIR / template_name
    
    if not template_path.exists():
        # 创建默认模板
        default_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playable Ad</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            position: relative;
            width: 100%;
            height: 100%;
        }
        
        #video-container {
            position: relative;
            width: 100%;
            height: 100%;
        }
        
        video {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        
        .pause-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: none;
            background-color: rgba(0, 0, 0, 0.5);
        }
        
        .guide-image {
            position: absolute;
            display: none;
        }
        
        .cta-button {
            position: absolute;
            cursor: pointer;
        }
        
        .banner {
            position: absolute;
            display: none;
        }
        
        .banner.left {
            left: 0;
            top: 0;
            height: 100%;
        }
        
        .banner.right {
            right: 0;
            top: 0;
            height: 100%;
        }
    </style>
</head>
<body>
    <div id="video-container">
        <video id="ad-video" src="{{ video_url }}" playsinline></video>
        
        <div class="pause-overlay" id="pause-overlay"></div>
        
        {% for frame in pause_frames %}
        <img 
            class="guide-image" 
            id="guide-{{ loop.index }}" 
            src="{{ frame.image_url }}" 
            style="left: {{ frame.position.left }}%; top: {{ frame.position.top }}%;"
        >
        {% endfor %}
        
        {% for button in cta_buttons %}
        <img 
            class="cta-button {{ button.type }}" 
            id="cta-{{ loop.index }}" 
            src="{{ button.image_url }}" 
            style="left: {{ button.position.left }}%; top: {{ button.position.top }}%; {% if button.type == 'fulltime' %}display: block;{% else %}display: none;{% endif %}"
        >
        {% endfor %}
        
        {% if banners.left %}
        <img class="banner left" id="banner-left" src="{{ banners.left }}">
        {% endif %}
        
        {% if banners.right %}
        <img class="banner right" id="banner-right" src="{{ banners.right }}">
        {% endif %}
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const video = document.getElementById('ad-video');
            const pauseOverlay = document.getElementById('pause-overlay');
            
            // 暂停帧配置
            const pauseFrames = [
                {% for frame in pause_frames %}
                {
                    time: {{ frame.time }},
                    guideId: 'guide-{{ loop.index }}'
                },
                {% endfor %}
            ];
            
            // CTA按钮配置
            const ctaButtons = [
                {% for button in cta_buttons %}
                {
                    type: '{{ button.type }}',
                    id: 'cta-{{ loop.index }}',
                    {% if button.start_time %}
                    startTime: {{ button.start_time }}
                    {% endif %}
                },
                {% endfor %}
            ];
            
            // 初始化
            video.addEventListener('loadedmetadata', function() {
                // 视频加载完成后自动播放
                video.play().catch(e => console.error('Auto play failed:', e));
            });
            
            // 监听视频时间更新
            video.addEventListener('timeupdate', function() {
                const currentTime = video.currentTime;
                
                // 检查是否需要暂停
                pauseFrames.forEach(frame => {
                    if (Math.abs(currentTime - frame.time) < 0.1 && !video.paused) {
                        video.pause();
                        pauseOverlay.style.display = 'block';
                        document.getElementById(frame.guideId).style.display = 'block';
                    }
                });
                
                // 检查是否需要显示结尾CTA按钮
                ctaButtons.forEach(button => {
                    if (button.type === 'endscreen' && button.startTime && currentTime >= button.startTime) {
                        document.getElementById(button.id).style.display = 'block';
                    }
                });
            });
            
            // 点击暂停覆盖层继续播放
            pauseOverlay.addEventListener('click', function() {
                // 隐藏所有引导图片
                document.querySelectorAll('.guide-image').forEach(img => {
                    img.style.display = 'none';
                });
                
                pauseOverlay.style.display = 'none';
                video.play();
            });
            
            // 点击CTA按钮
            document.querySelectorAll('.cta-button').forEach(button => {
                button.addEventListener('click', function() {
                    // 这里可以添加点击后的行为，如跳转到应用商店
                    console.log('CTA button clicked');
                    // 示例：window.open('https://play.google.com/store/apps/details?id=your.app.id');
                });
            });
        });
    </script>
</body>
</html>
"""
        
        # 写入默认模板
        with open(template_path, "w", encoding="utf-8") as f:
            f.write(default_template) 