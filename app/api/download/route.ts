import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const { articles } = await request.json();
    
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { error: '请提供要下载的文章数据' },
        { status: 400 }
      );
    }

    console.log(`开始生成 ${articles.length} 篇文章的ZIP文件（内存处理）`);
    
    // 在内存中创建 ZIP 文件，不写入硬盘
    const zip = new JSZip();
    const folder = zip.folder('wechat_articles_markdown');
    
    // 添加文章到ZIP中（全部在内存中操作）
    articles.forEach((article: any, index: number) => {
      const filename = `${String(index + 1).padStart(3, '0')}_${sanitizeFilename(article.title)}.md`;
      
      // 构建完整的Markdown内容
      let content = article.content;
      
      // 添加元数据头部
      if (article.author || article.publishTime || article.url) {
        let metadata = '---\n';
        if (article.title) metadata += `title: "${article.title}"\n`;
        if (article.author) metadata += `author: "${article.author}"\n`;
        if (article.publishTime) metadata += `publishTime: "${article.publishTime}"\n`;
        if (article.url) metadata += `originalUrl: "${article.url}"\n`;
        metadata += `extractedAt: "${new Date().toISOString()}"\n`;
        metadata += '---\n\n';
        
        content = metadata + content;
      }
      
      // 直接在内存中添加文件内容
      folder?.file(filename, content, { binary: false });
      
      console.log(`已添加文章到ZIP: ${filename}`);
    });
    
    // 添加README文件
    const readmeContent = `# 微信公众号文章提取结果

## 提取信息
- 提取时间: ${new Date().toLocaleString('zh-CN')}
- 文章数量: ${articles.length} 篇
- 提取工具: WeChat2MD

## 文件说明
- 所有文章均为Markdown格式
- 文件名格式: 序号_文章标题.md
- 图片链接已保留，可能需要网络访问

## 注意事项
- 本工具仅用于学习和研究目的
- 请尊重原作者版权
- 如需商业使用，请联系原作者授权
`;
    
    folder?.file('README.md', readmeContent, { binary: false });
    
    console.log('开始生成ZIP文件...');
    
    // 在内存中生成ZIP文件，使用流式处理以节省内存
    const zipContent = await zip.generateAsync({ 
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6 // 平衡压缩率和速度
      }
    });
    
    console.log(`ZIP文件生成完成，大小: ${(zipContent.length / 1024 / 1024).toFixed(2)}MB`);
    
    // 直接返回ZIP内容，不存储到硬盘
    return new NextResponse(Buffer.from(zipContent), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="wechat_articles_${new Date().getTime()}.zip"`,
        'Content-Length': zipContent.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });
    
  } catch (error) {
    console.error('生成下载文件失败:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '生成下载文件失败',
        success: false 
      },
      { status: 500 }
    );
  }
}

function sanitizeFilename(filename: string): string {
  // 移除或替换不安全的文件名字符
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fa5\-_.]/g, '_') // 保留中文字符
    .substring(0, 80); // 限制文件名长度
}

export async function GET() {
  return NextResponse.json({
    message: '文章下载API - 内存处理模式',
    usage: 'POST /api/download',
    parameters: {
      articles: '文章数组'
    },
    features: [
      '内存中处理，不占用硬盘空间',
      '自动添加元数据',
      '包含README说明文件',
      '支持中文文件名',
      '流式压缩处理'
    ]
  });
}