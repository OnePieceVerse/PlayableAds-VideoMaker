"""
Platform Service - 处理不同平台的特殊内容生成
"""

import logging
from typing import Dict, Any, Optional
from pathlib import Path
from backend.app.models.schemas import Platform

logger = logging.getLogger(__name__)

class PlatformService:
    """处理不同平台特定内容的服务类"""
    
    @staticmethod
    def get_platform_head_content(platform: Platform, language: str = "en", orientation: str = "portrait") -> str:
        """获取平台特定的head部分内容"""
        if platform == Platform.GOOGLE:
            return f'''    <meta name="ad.orientation" content="{orientation}">
    <meta name="ad.language" content="{language}">
    <script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"></script>'''
        
        # 其他平台暂时不需要特殊的head内容
        return ""
    
    @staticmethod
    def get_platform_body_end_content(platform: Platform) -> str:
        """获取平台特定的body结束前的内容"""
        if platform == Platform.TIKTOK:
            return '  <script src="https://sf16-muse-va.ibytedtos.com/obj/union-fe-nc-i18n/playable/sdk/playable-sdk.js"></script>'
        
        # 其他平台暂时不需要特殊的body内容
        return ""
    
    @staticmethod
    def get_platform_cta_code(platform: Platform) -> str:
        """获取平台特定的CTA点击代码"""
        cta_codes = {
            Platform.GOOGLE: "window.ExitApi.exit();",
            Platform.FACEBOOK: "window.FbPlayableAd.onCTAClick();",
            Platform.APPLOVIN: "window.mraid.open();",
            Platform.MOLOCO: "window.FbPlayableAd.onCTAClick();",
            Platform.TIKTOK: "window.openAppStore();"
        }
        
        return cta_codes.get(platform, "window.location.href = '#';")
    
    @staticmethod
    def requires_zip_packaging(platform: Platform) -> bool:
        """检查平台是否需要ZIP打包"""
        return platform in [Platform.GOOGLE, Platform.TIKTOK]
    
    @staticmethod
    def requires_config_json(platform: Platform) -> bool:
        """检查平台是否需要config.json文件"""
        return platform == Platform.TIKTOK
    
    @staticmethod
    def get_platform_file_extension(platform: Platform) -> str:
        """获取平台输出文件的扩展名"""
        if PlatformService.requires_zip_packaging(platform):
            return ".zip"
        return ".html"
    
    @staticmethod
    def apply_platform_modifications(html_content: str, platform: Platform, language: str = "en", app_name: str = "PlayableAds", orientation: str = "portrait") -> str:
        """应用平台特定的HTML修改"""
        modified_content = html_content
        
        # 1. 添加平台特定的head内容
        head_content = PlatformService.get_platform_head_content(platform, language, orientation)
        if head_content:
            modified_content = modified_content.replace(
                '<head>',
                f'<head>\n{head_content}'
            )
        
        # 2. 添加平台特定的body结束内容
        body_end_content = PlatformService.get_platform_body_end_content(platform)
        if body_end_content:
            modified_content = modified_content.replace(
                '</body>',
                f'{body_end_content}\n</body>'
            )
        
        # 3. 替换CTA代码
        cta_code = PlatformService.get_platform_cta_code(platform)
        modified_content = modified_content.replace(
            'window.location.href = config.cta_start_button.url;',
            cta_code
        )
        
        # 4. 设置语言
        modified_content = modified_content.replace(
            '<html lang="en">',
            f'<html lang="{language}">'
        )
        
        # 5. 设置应用名称
        modified_content = modified_content.replace(
            '<title>Playable Ad</title>',
            f'<title>{app_name}</title>'
        )
        
        return modified_content
    
    @staticmethod
    def get_platform_specific_files(platform: Platform, project_dir: Path) -> Dict[str, Optional[Path]]:
        """获取平台特定需要的文件"""
        files = {}
        
        if platform == Platform.TIKTOK:
            config_json = project_dir / "config.json"
            files['config_json'] = config_json if config_json.exists() else None
        
        return files
    
    @staticmethod
    def validate_platform_requirements(platform: Platform, project_dir: Path) -> Dict[str, Any]:
        """验证平台特定的要求"""
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # TikTok平台特定验证
        if platform == Platform.TIKTOK:
            config_json = project_dir / "config.json"
            if not config_json.exists():
                validation_result["warnings"].append("TikTok platform recommends including config.json file")
        
        # Google平台特定验证
        if platform == Platform.GOOGLE:
            # 可以添加Google特定的验证逻辑
            pass
        
        # Facebook平台特定验证
        if platform == Platform.FACEBOOK:
            # 可以添加Facebook特定的验证逻辑
            pass
        
        return validation_result

class GooglePlatformService:
    """Google平台特定服务"""
    
    @staticmethod
    def get_required_meta_tags(language: str = "en", orientation: str = "portrait") -> str:
        """获取Google平台必需的meta标签"""
        return f'''<meta name="ad.orientation" content="{orientation}">
    <meta name="ad.language" content="{language}">'''
    
    @staticmethod
    def get_exit_api_script() -> str:
        """获取Google Exit API脚本"""
        return '<script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"></script>'
    
    @staticmethod
    def get_cta_handler() -> str:
        """获取Google CTA处理代码"""
        return "window.ExitApi.exit();"

class FacebookPlatformService:
    """Facebook平台特定服务"""
    
    @staticmethod
    def get_cta_handler() -> str:
        """获取Facebook CTA处理代码"""
        return "window.FbPlayableAd.onCTAClick();"

class TikTokPlatformService:
    """TikTok平台特定服务"""
    
    @staticmethod
    def get_sdk_script() -> str:
        """获取TikTok SDK脚本"""
        return '<script src="https://sf16-muse-va.ibytedtos.com/obj/union-fe-nc-i18n/playable/sdk/playable-sdk.js"></script>'
    
    @staticmethod
    def get_cta_handler() -> str:
        """获取TikTok CTA处理代码"""
        return "window.openAppStore();"
    
    @staticmethod
    def requires_config_json() -> bool:
        """TikTok平台需要config.json文件"""
        return True

class AppLovinPlatformService:
    """AppLovin平台特定服务"""
    
    @staticmethod
    def get_cta_handler() -> str:
        """获取AppLovin CTA处理代码"""
        return "window.mraid.open();"

class MolocoPlatformService:
    """Moloco平台特定服务"""
    
    @staticmethod
    def get_cta_handler() -> str:
        """获取Moloco CTA处理代码"""
        return "window.FbPlayableAd.onCTAClick();"
