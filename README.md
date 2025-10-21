# 微信公众号文章提取工具

一个现代化的微信公众号文章提取工具，基于 Next.js 14 和 TypeScript 构建。支持单篇文章和专辑批量提取，自动转换为 Markdown 格式，可一键部署到 Vercel。

## ✨ 功能特点

- 🚀 **现代化架构**: 基于 Next.js 14 + TypeScript + Tailwind CSS
- 🌐 **纯前端实现**: 无需后端服务器，直接在浏览器中运行
- 📱 **响应式设计**: 完美适配桌面端和移动端
- 🎯 **智能提取**: 支持单篇文章和专辑批量提取
- 📝 **Markdown 输出**: 自动转换为格式化的 Markdown 文件
- 🖼️ **图片处理**: 智能处理微信图片链接，保持图片完整性
- 📦 **批量下载**: 支持将提取的文章打包为 ZIP 文件下载
- ⚡ **快速部署**: 一键部署到 Vercel，无需服务器配置
- 🎨 **美观界面**: 现代化 UI 设计，用户体验优秀

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (App Router)
- **开发语言**: TypeScript
- **样式框架**: Tailwind CSS
- **UI 组件**: Lucide React Icons
- **HTTP 客户端**: Axios
- **HTML 解析**: Cheerio
- **Markdown 转换**: Turndown
- **文件处理**: JSZip

## 📋 系统要求

- Node.js 18.0.0 或更高版本
- npm 或 yarn 包管理器
- 现代浏览器（Chrome、Firefox、Safari、Edge）

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd wechat2md
```

### 2. 安装依赖

```bash
npm install
# 或
yarn install
```

### 3. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 4. 访问应用

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 📖 使用方法

### 单篇文章提取

1. 在首页选择"单篇文章提取"
2. 粘贴微信公众号文章链接
3. 点击"开始提取"按钮
4. 等待提取完成，下载 Markdown 文件

### 专辑批量提取

1. 在首页选择"专辑批量提取"
2. 粘贴微信公众号专辑链接
3. 设置提取数量限制（可选）
4. 点击"开始提取"按钮
5. 等待批量提取完成，下载 ZIP 压缩包

## 🏗️ 项目结构

```
wechat2md/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── download/      # 文件下载 API
│   │   └── extract/       # 文章提取 API
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局组件
│   └── page.tsx          # 首页组件
├── components/            # React 组件
│   ├── ExtractorCard.tsx # 提取器卡片组件
│   ├── Footer.tsx        # 页脚组件
│   └── Header.tsx        # 页头组件
├── lib/                  # 工具库
│   └── extractor.ts      # 文章提取核心逻辑
├── public/               # 静态资源
├── next.config.js        # Next.js 配置
├── tailwind.config.js    # Tailwind CSS 配置
├── tsconfig.json         # TypeScript 配置
└── package.json          # 项目依赖配置
```

## 🔧 开发脚本

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 清理构建文件
npm run clean
```

## 🌐 部署

### Vercel 部署（推荐）

1. 将代码推送到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 自动部署完成

### 其他平台部署

项目支持部署到任何支持 Node.js 的平台：

- Netlify
- Railway
- Render
- 自建服务器

## 📝 输出格式

### Markdown 文件结构

```markdown
# 文章标题

**作者**: 公众号名称  
**发布时间**: YYYY-MM-DD  
**原文链接**: [查看原文](文章链接)  
**提取时间**: YYYY-MM-DD HH:mm:ss

---

文章正文内容...

![图片描述](图片链接)

更多内容...
```

### 批量提取输出

- 单个 ZIP 文件包含所有提取的 Markdown 文件
- 文件命名格式：`文章标题_YYYYMMDD_HHMMSS.md`
- 自动去重，避免重复下载

## ⚠️ 注意事项

1. **合规使用**: 请遵守微信公众号的使用条款和相关法律法规
2. **频率控制**: 建议适当控制提取频率，避免对服务器造成压力
3. **网络环境**: 确保网络连接稳定，部分文章可能需要较长加载时间
4. **浏览器兼容**: 推荐使用最新版本的现代浏览器
5. **CORS 限制**: 某些文章可能因为 CORS 策略无法直接提取

## 🐛 故障排除

### 常见问题

**Q: 提取失败，显示网络错误**  
A: 检查网络连接，确认文章链接是否正确且可访问

**Q: 图片无法显示**  
A: 微信图片有防盗链机制，建议在微信环境中查看

**Q: 专辑提取数量不足**  
A: 某些专辑可能需要登录或有访问限制

**Q: 部署后功能异常**  
A: 检查环境变量配置和 CORS 设置

### 调试模式

开发环境下会在浏览器控制台显示详细日志：

- 文章解析过程
- 网络请求状态
- 错误信息和堆栈

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目仅供学习和研究使用，请遵守相关法律法规和平台使用条款。

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Vercel 部署指南](https://vercel.com/docs)

---

如果这个工具对你有帮助，请给个 ⭐ Star 支持一下！