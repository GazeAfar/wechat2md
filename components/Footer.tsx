'use client';

import { Heart, Code, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 产品信息 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              微信公众号文章提取工具
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              一个现代化的工具，帮助您轻松提取微信公众号文章并转换为 Markdown 格式。
              支持单篇文章和专辑批量提取，提供完整的 API 接口。
            </p>
          </div>

          {/* 功能特性 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">功能特性</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary-500" />
                快速提取文章内容
              </li>
              <li className="flex items-center gap-2">
                <Code className="w-4 h-4 text-primary-500" />
                转换为 Markdown 格式
              </li>
              <li className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary-500" />
                支持批量下载
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary-500" />
                现代化界面设计
              </li>
            </ul>
          </div>

          {/* 技术栈 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">技术栈</h3>
            <div className="flex flex-wrap gap-2">
              {[
                'Next.js 14',
                'React 18',
                'TypeScript',
                'Tailwind CSS',
                'Vercel',
                'Cheerio',
                'Turndown'
              ].map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © 2025 微信公众号文章提取工具. 保留所有权利.
            </p>
            

          </div>
        </div>
      </div>
    </footer>
  );
}