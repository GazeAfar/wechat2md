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
    
    // 创建 ZIP 文件
    const zip = new JSZip();
    const folder = zip.folder('wechat_articles_markdown');
    
    articles.forEach((article: any, index: number) => {
      const filename = `${String(index + 1).padStart(2, '0')}_${sanitizeFilename(article.title)}.md`;
      folder?.file(filename, article.content, { binary: false });
    });
    
    // 生成 ZIP 文件
    const zipContent = await zip.generateAsync({ type: 'uint8array' });
    
    return new NextResponse(zipContent, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="wechat_articles_${new Date().getTime()}.zip"`,
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
    .substring(0, 100); // 限制文件名长度
}

export async function GET() {
  return NextResponse.json({
    message: '文章下载API',
    usage: 'POST /api/download',
    parameters: {
      articles: '文章数组',
      format: 'zip | single (可选，默认zip)'
    }
  });
}