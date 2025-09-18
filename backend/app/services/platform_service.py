"""
平台服务类
提供各种平台特定的配置和修改功能
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class PlatformService:
    """平台服务类，处理各种平台特定的功能"""
    
    def __init__(self):
        pass
    
    def get_supported_platforms(self) -> list:
        return ["tiktok", "google", "facebook", "applovin", "moloco"]
    
    def is_zip_platform(self, platform: str) -> bool:
        zip_platforms = ["tiktok", "google", "facebook"]
        return platform.lower() in zip_platforms
    
    def is_html_platform(self, platform: str) -> bool:
        html_platforms = ["applovin", "moloco"]
        return platform.lower() in html_platforms
    
    def _get_platform_head_end_content(self, platform: str, orientation: str = "portrait") -> str:
        """获取平台特定的head部分内容"""
        if platform.lower() == "google":
            return f'''    <meta name="ad.orientation" content="{orientation}">
             <script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"> </script>'''
        
        return ""
    
    def _get_platform_body_end_content(self, platform: str) -> str:
        """获取平台特定的body结束前的内容"""
        if platform.lower() == "tiktok":
            return '<script src="https://sf16-muse-va.ibytedtos.com/obj/union-fe-nc-i18n/playable/sdk/playable-sdk.js"></script>'
        return ""

    def _get_platform_cta_code(self, platform: str) -> str:
        """获取平台特定的CTA点击代码"""
        cta_codes = {
            "google": "window.ExitApi.exit();",
            "facebook": "window.FbPlayableAd.onCTAClick();",
            "applovin": "window.mraid.open();",
            "moloco": "window.FbPlayableAd.onCTAClick();",
            "tiktok": "window.openAppStore();"
        }
        
        return cta_codes.get(platform.lower(), "window.location.href = '#';")

    def generate_platform_need_files(self, preview_dir: Path, platform: str, orientation: str = "portrait", language: str = "en") -> bool:
        """
        为指定平台生成所需的文件
        
        Args:
            preview_dir: 预览目录路径
            platform: 平台名称
            orientation: 屏幕方向
            language: 语言代码
            
        Returns:
            bool: 是否全部生成成功
        """
        try:
            success = True
            
            platform_name = platform.lower()
            if platform_name == "tiktok":
                # 生成TikTok的config.json
                if not self.generate_tiktok_config(preview_dir, orientation, language):
                    success = False
            return success
        except Exception as e:
            logger.error(f"Failed to generate platform need files: {str(e)}")
            return False
    
    def generate_tiktok_config(self, preview_dir: Path, orientation: str = "portrait", language: str = "en") -> bool:
        """
        生成TikTok平台的config.json文件
        
        Args:
            preview_dir: 预览目录路径
            orientation: 屏幕方向 (portrait/landscape)
            language: 语言代码
            
        Returns:
            bool: 是否生成成功
        """
        try:
            config_json = {
                "playable_orientation": orientation,
                "playable_languages": [language]
            }
            
            config_file = preview_dir / "config.json"
            with open(config_file, "w", encoding="utf-8") as f:
                json.dump(config_json, f, indent=2)
            
            logger.info(f"Generated config.json for TikTok platform: {config_file}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to generate config.json for TikTok: {str(e)}")
            return False
    
    def _apply_single_platform_modifications(self, preview_dir: Path, platform: str, orientation: str, language: str, app_name: str) -> bool:
        """应用单个平台的修改到所有文件"""
        try:
            success = True
            
            # 修改HTML文件
            html_file = preview_dir / "index.html"
            if html_file.exists():
                html_content = html_file.read_text(encoding='utf-8')
                modified_html = self.apply_platform_html_modifications(html_content, platform, orientation, language, app_name)
                html_file.write_text(modified_html, encoding='utf-8')
            
            # 修改JavaScript文件中的CTA代码
            js_file = preview_dir / "main.js"
            if js_file.exists():
                js_content = js_file.read_text(encoding='utf-8')
                cta_code = self._get_platform_cta_code(platform)
                # 替换main.js中的CTA点击代码
                modified_js = js_content.replace("window.location.href = '#';", cta_code)
                js_file.write_text(modified_js, encoding='utf-8')

            return success
            
        except Exception as e:
            logger.error(f"Failed to apply single platform modifications for {platform}: {str(e)}")
            return False

    def apply_platform_html_modifications(self, html_content: str, platform: str, orientation: str = "portrait", language: str = "en", app_name: str = "PlayableAds") -> str:
        """
        应用平台特定的HTML修改
        
        Args:
            html_content: 原始HTML内容
            platform: 平台名称
            orientation: 屏幕方向
            language: 语言代码
            app_name: 应用名称
            
        Returns:
            str: 修改后的HTML内容
        """
        try:
            modified_content = html_content
            
            # 1. 添加平台特定的head内容
            head_content = self._get_platform_head_end_content(platform, orientation)
            if head_content:
                modified_content = modified_content.replace(
                    '</head>',
                    f'{head_content}\n</head>'
                )
            
            # 2. 添加平台特定的body结束内容
            body_end_content = self._get_platform_body_end_content(platform)
            if body_end_content:
                modified_content = modified_content.replace(
                    '</body>',
                    f'</body>\n{body_end_content}'
                )
            # 3. 设置语言
            modified_content = modified_content.replace(
                '<html lang="en">',
                f'<html lang="{language}">'
            )
            
            # 4. 设置应用名称
            modified_content = modified_content.replace(
                '<title>Playable Ad</title>',
                f'<title>{app_name}</title>'
            )
            
            return modified_content
            
        except Exception as e:
            logger.error(f"Failed to apply platform modifications for {platform}: {str(e)}")
            return html_content