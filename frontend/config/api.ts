/**
 * API配置文件
 * 集中管理API地址和端口
 */

// 开发环境配置
const dev = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:18080',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080/api',
};

// 生产环境配置
const prod = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://playableall-video.woa.com',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://playableall-video.woa.com/api',
};

// 根据环境变量选择配置
const config = process.env.NODE_ENV === 'production' ? prod : dev;

export default config;

// 常用API路径
export const API_PATHS = {
  upload: `${config.apiUrl}/upload`,
  generate: `${config.apiUrl}/generate`,
  generateImage: `${config.apiUrl}/generate-image`,
  download: (projectId: string, fileName: string) => `${config.apiUrl}/download/${projectId}/${fileName}`,
  downloadFile: (filePath: string) => `${config.apiUrl}/download-file?file_path=${encodeURIComponent(filePath.replace(/^\//, ""))}`,
  projectFilesInfo: (projectId: string) => `${config.apiUrl}/project-files-info?project_id=${projectId}`,
  systemAudio: `${config.apiUrl}/system-audio`,
  systemAudioFile: (filename: string) => `${config.apiUrl}/system-audio/${filename}`,
};

// 获取完整URL（用于资源访问）
export const getFullUrl = (path: string) => {
  if (path.startsWith('http')) {
    return path;
  }
  return `${config.baseUrl}${path}`;
};
