'use client';

import { FileText, Github, ExternalLink } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo 和标题 */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">
                微信公众号文章提取工具
              </h1>
              <p className="text-xs text-gray-500">
                一键提取并转换为 Markdown 格式
              </p>
            </div>
          </div>

          {/* 导航链接 */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/GazeAfar/wechat2md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            
            <a
              href="/api"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">API 文档</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}