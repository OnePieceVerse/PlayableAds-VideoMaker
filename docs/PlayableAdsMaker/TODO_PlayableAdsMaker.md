# Playable Ads Maker - 待办事项

## 配置与环境

1. **FFmpeg安装**
   - 安装FFmpeg工具用于视频元数据提取
   - 命令：`brew install ffmpeg`（Mac）或 `apt-get install ffmpeg`（Linux）
   - 如果无法安装FFmpeg，系统将使用降级方案，但某些视频信息可能无法正确提取

2. **CORS配置**
   - 在生产环境中，需要在后端`app/main.py`中配置正确的CORS设置
   - 将`allow_origins=["*"]`替换为实际的前端域名

3. **环境变量**
   - 创建`.env`文件配置环境变量
   - 示例内容：
     ```
     UPLOAD_MAX_SIZE=52428800  # 50MB
     ALLOWED_ORIGINS=http://localhost:3000
     ```

## 部署准备

1. **前端构建**
   - 运行`cd frontend && npm run build`构建前端项目
   - 部署`frontend/.next`目录到静态网站托管服务

2. **后端部署**
   - 确保服务器已安装Python 3.9+
   - 安装依赖：`pip install -r backend/requirements.txt`
   - 使用Gunicorn或Uvicorn部署FastAPI应用
   - 示例命令：`gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app`

3. **存储配置**
   - 配置适当的存储策略，生产环境不建议使用本地文件系统
   - 考虑使用AWS S3、Google Cloud Storage或其他对象存储服务

## 功能完善

1. **视频格式支持**
   - 目前主要支持MP4、WebM和OGG格式
   - 考虑添加更多视频格式支持或自动转换功能

2. **错误处理增强**
   - 完善前端错误提示
   - 增加后端日志记录
   - 实现更详细的错误报告

3. **安全性增强**
   - 添加文件类型验证
   - 实现文件大小限制
   - 考虑添加防CSRF措施

## 性能优化

1. **大文件上传**
   - 实现分块上传功能
   - 添加断点续传支持

2. **缓存策略**
   - 实现静态资源缓存
   - 考虑使用CDN加速

3. **并发处理**
   - 优化后端并发处理能力
   - 实现任务队列处理大量请求

## 使用说明

1. **启动前端**
   - 进入前端目录：`cd frontend`
   - 安装依赖：`npm install`
   - 开发模式启动：`npm run dev`
   - 访问：`http://localhost:3000`

2. **启动后端**
   - 进入后端目录：`cd backend`
   - 创建虚拟环境：`python -m venv venv`
   - 激活虚拟环境：
     - Windows: `venv\Scripts\activate`
     - Mac/Linux: `source venv/bin/activate`
   - 安装依赖：`pip install -r requirements.txt`
   - 启动服务：`uvicorn app.main:app --reload`
   - API文档：`http://localhost:8080/docs`

## 已知问题

1. **视频元数据提取**
   - 如果未安装FFmpeg，某些视频信息可能无法正确提取
   - 解决方案：安装FFmpeg或使用客户端提取视频信息

2. **浏览器兼容性**
   - 某些旧版浏览器可能不支持部分功能
   - 建议使用最新版Chrome、Firefox、Safari或Edge浏览器

3. **移动端拖拽**
   - 移动端设备上的拖拽功能可能不如桌面端流畅
   - 考虑为移动端优化交互方式 