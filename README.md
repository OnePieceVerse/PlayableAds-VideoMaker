# 视频试玩广告制作平台 (Video Playable Ads Maker)

## 项目简介

视频试玩广告制作平台是一个专业的工具，用于创建交互式试玩广告。该平台支持多平台导出，包括Google Ads、Facebook、TikTok、AppLovin和Moloco等主流广告平台。通过简单的拖放操作，用户可以上传视频，添加互动元素，并一键导出适用于各大广告平台的试玩广告。

## 技术栈

### 前端
- **框架**: Next.js 15.5.2 (使用Turbopack)
- **UI库**: React 19.1.0
- **样式**: Tailwind CSS 4.0
- **语言**: TypeScript
- **文件上传**: react-dropzone

### 后端
- **框架**: FastAPI
- **ASGI服务器**: Uvicorn
- **数据验证**: Pydantic
- **模板引擎**: Jinja2
- **图像处理**: Pillow, OpenCV
- **文件处理**: aiofiles

## 功能特点

- **拖放式简易操作**: 无需编程。上传您的视频并使用直观的界面进行自定义。
- **多平台支持**: 导出适用于Google Ads、Facebook、AppLovin、TikTok等多个平台的广告。
- **互动元素**: 添加暂停帧、号召性用语按钮、横幅和自定义互动。
- **实时预览**: 通过实时预览系统即时查看您的更改。
- **多语言支持**: 支持中文和英文界面，可轻松切换。
- **响应式设计**: 适配各种设备尺寸，提供最佳用户体验。

## 项目结构

```
PlayableAllMaker/
├── frontend/             # 前端项目
│   ├── app/              # Next.js应用目录
│   ├── components/       # React组件
│   ├── public/           # 静态资源
│   └── ...
├── backend/              # 后端项目
│   ├── app/              # FastAPI应用
│   │   ├── api/          # API路由
│   │   ├── models/       # 数据模型
│   │   ├── services/     # 业务逻辑
│   │   └── templates/    # 广告模板
│   └── main.py           # 主入口文件
└── projects/             # 生成的项目文件存储目录
```

## 安装与运行

### 前端

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build

# 运行生产版本
npm start
```

### 后端

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 运行开发服务器
uvicorn main:app --reload
```

## 使用流程

1. **上传视频**: 上传您的产品视频，支持多种格式，自动优化压缩。
2. **添加互动元素**: 拖拽添加暂停帧、CTA按钮、横幅等互动元素。
3. **导出发布**: 一键导出多平台格式，直接发布到各大广告平台。

## API文档

启动后端服务器后，可以通过访问 `http://localhost:8000/docs` 查看API文档。

## 环境要求

- Node.js 18.0+
- Python 3.8+
- 现代浏览器 (Chrome, Firefox, Safari, Edge)

## 贡献指南

欢迎贡献代码、报告问题或提出新功能建议。请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 Pull Request

## 联系我们

如有任何问题或建议，请通过以下方式联系我们：
- 邮箱: ryonluo@tencent.com
- 官网: https://playableall-video.woa.com

---

© 2025 试玩广告制作平台 | Playable Ads Maker. 保留所有权利。

## 环境配置

前端API地址配置位于 `frontend/config/api.ts` 文件中，可以通过环境变量进行配置：

1. 开发环境：修改 `frontend/.env.development` 文件
2. 生产环境：创建 `frontend/.env.production` 文件或设置环境变量

可配置的环境变量：
- `NEXT_PUBLIC_API_BASE_URL`: API基础地址（默认：http://localhost:8080）
- `NEXT_PUBLIC_API_URL`: API完整路径（默认：http://localhost:8080/api）

示例：
```bash
# 开发环境
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080/api

# 生产环境
NEXT_PUBLIC_API_BASE_URL=https://api.playableadsmaker.com
NEXT_PUBLIC_API_URL=https://api.playableadsmaker.com/api
```
