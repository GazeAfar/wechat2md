import { NextRequest, NextResponse } from 'next/server';
import { extractor } from '@/lib/extractor';

export async function POST(request: NextRequest) {
  try {
    const { url, maxCount = 15 } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: '请提供专辑链接' },
        { status: 400 }
      );
    }
    
    // 验证链接格式
    if (!url.includes('mp.weixin.qq.com') || !url.includes('appmsgalbum')) {
      return NextResponse.json(
        { error: '请提供有效的微信公众号专辑链接' },
        { status: 400 }
      );
    }
    
    // 验证最大数量
    const count = parseInt(maxCount);
    if (isNaN(count) || count < 1 || count > 50) {
      return NextResponse.json(
        { error: '最大文章数量应在1-50之间' },
        { status: 400 }
      );
    }
    
    console.log('开始提取专辑文章:', url, '最大数量:', count);
    
    const articles = await extractor.extractAlbumArticles(url, count);
    
    return NextResponse.json({
      success: true,
      data: {
        articles,
        total: articles.length,
        extractedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('提取专辑失败:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '提取失败',
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
      maxCount: '最大文章数量 (可选，默认15，最大50)'
    }
  });
}