from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys
from dotenv import load_dotenv

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 加载环境变量
load_dotenv()

# 创建FastAPI应用
app = FastAPI(
    title="Playable Ads Maker API",
    description="API for creating playable ads",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该限制为前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type"]  # 暴露这些头以便前端可以正确处理音频文件
)

# 挂载projects目录
app.mount("/projects", StaticFiles(directory="projects"), name="projects")

# 导入路由
from backend.app.api import file_router, generate_router, platform_router

# 注册路由
app.include_router(file_router.router, prefix="/api/file", tags=["file"])
app.include_router(generate_router.router, prefix="/api/generate", tags=["generate"])
app.include_router(platform_router.router, prefix="/api/platform", tags=["platform"])

@app.get("/")
async def root():
    return {"message": "Welcome to Playable Ads Maker API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=18080, reload=True)
