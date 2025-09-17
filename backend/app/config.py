"""
应用配置文件
"""
from pathlib import Path
import os

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent

# 项目存储目录
PROJECTS_DIR = PROJECT_ROOT / "projects"

# 后端基础URL配置
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:18080")

# 确保目录存在
os.makedirs(PROJECTS_DIR, exist_ok=True)
