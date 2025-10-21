'use client';

import { BookOpen, FileText, Sparkles, Zap, Shield, Download } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ExtractorCard from '@/components/ExtractorCard';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="mb-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gradient mb-6">
                微信公众号文章提取工具
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                一键提取微信公众号文章并转换为 Markdown 格式，支持单篇文章和专辑批量提取。
                现代化界面设计，简单易用，完全免费。
              </p>
            </div>
            
            {/* 特性展示 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="glass rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">快速提取</h3>
                <p className="text-gray-600 text-sm">
                  智能解析微信公众号文章，快速提取内容和图片
                </p>
              </div>
              
              <div className="glass rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-success-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Markdown 格式</h3>
                <p className="text-gray-600 text-sm">
                  自动转换为标准 Markdown 格式，保持原有排版
                </p>
              </div>
              
              <div className="glass rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Download className="w-6 h-6 text-warning-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">批量下载</h3>
                <p className="text-gray-600 text-sm">
                  支持单个文件或 ZIP 压缩包批量下载
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 提取工具区域 */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                开始提取文章
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                选择您需要的提取方式，输入微信公众号链接即可开始。
                我们支持单篇文章提取和专辑批量提取两种模式。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 单篇文章提取 */}
              <ExtractorCard
                title="单篇文章提取"
                description="提取单篇微信公众号文章并转换为 Markdown 格式"
                icon={<FileText className="w-6 h-6 text-primary-600" />}
                placeholder="https://mp.weixin.qq.com/s?__biz=..."
                apiEndpoint="/api/extract/single"
                type="single"
              />

              {/* 专辑文章提取 */}
              <ExtractorCard
                title="专辑文章提取"
                description="批量提取专辑中的所有文章，支持设置最大数量"
                icon={<BookOpen className="w-6 h-6 text-primary-600" />}
                placeholder="https://mp.weixin.qq.com/mp/appmsgalbum?__biz=..."
                apiEndpoint="/api/extract/album"
                type="album"
                showMaxCount={true}
              />
            </div>
          </div>
        </section>

        {/* 使用说明 */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                使用说明
              </h2>
              <p className="text-gray-600">
                简单几步，轻松提取微信公众号文章
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                  1
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">复制链接</h3>
                <p className="text-sm text-gray-600">
                  复制微信公众号文章或专辑的链接
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                  2
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">粘贴链接</h3>
                <p className="text-sm text-gray-600">
                  将链接粘贴到对应的输入框中
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                  3
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">开始提取</h3>
                <p className="text-sm text-gray-600">
                  点击提取按钮，等待处理完成
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                  4
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">下载文件</h3>
                <p className="text-sm text-gray-600">
                  下载转换后的 Markdown 文件
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 技术特性 */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 to-indigo-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                技术特性
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                基于现代化技术栈构建，提供稳定可靠的服务
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  智能解析
                </h3>
                <p className="text-gray-600 text-sm">
                  使用先进的 HTML 解析技术，准确提取文章内容和图片
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  安全可靠
                </h3>
                <p className="text-gray-600 text-sm">
                  所有处理都在服务器端完成，不存储用户数据，保护隐私安全
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  高性能
                </h3>
                <p className="text-gray-600 text-sm">
                  基于 Next.js 和 Vercel 构建，提供快速响应和稳定服务
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}