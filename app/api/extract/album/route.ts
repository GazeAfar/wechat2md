import { NextRequest, NextResponse } from 'next/server';
import { extractor } from '@/lib/extractor';

export async function POST(request: Request) {
  try {
    const { url, maxCount } = await request.json();

    // 验证 URL 格式
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: '请提供有效的专辑URL' },
        { status: 400 }
      );
    }

    // 验证是否为微信公众号专辑链接
    if (!url.includes('mp.weixin.qq.com')) {
      return NextResponse.json(
        { error: '请提供有效的微信公众号专辑链接' },
        { status: 400 }
      );
    }

    // 验证最大数量
    if (maxCount !== undefined && (typeof maxCount !== 'number' || maxCount < 1 || maxCount > 100)) {
      return NextResponse.json(
        { error: '最大数量必须是1-100之间的数字' },
        { status: 400 }
      );
    }

    console.log(`开始提取专辑: ${url}, 最大数量: ${maxCount || '不限制'}`);

    // 使用浏览器模式提取
    const articles = await extractor.extractAlbumArticlesWithBrowser(url, maxCount);

    return NextResponse.json({
      success: true,
      articles,
      count: articles.length,
      message: `成功提取 ${articles.length} 篇文章`
    });

  } catch (error) {
    console.error('专辑提取失败:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    return NextResponse.json(
      { 
        error: `提取失败: ${errorMessage}`,
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: '专辑文章提取API',
    usage: 'POST /api/extract/album',
    parameters: {
      url: '微信公众号专辑链接',
      maxCount: '最大文章数量 (可选，默认15，最大500)'
    }
  });
}