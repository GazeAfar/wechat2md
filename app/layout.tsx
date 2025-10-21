import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '微信公众号文章提取工具',
  description: '一键提取微信公众号文章并转换为Markdown格式，支持专辑批量提取和单篇文章提取',
  keywords: '微信公众号, 文章提取, Markdown, 批量下载, 内容转换',
  authors: [{ name: 'WeChat Article Extractor' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6',
  openGraph: {
    title: '微信公众号文章提取工具',
    description: '一键提取微信公众号文章并转换为Markdown格式',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="robots" content="index, follow" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}