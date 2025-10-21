import { NextRequest, NextResponse } from 'next/server';
import { extractor } from '@/lib/extractor';

export async function POST(request: NextRequest) {
  try {
    const { url, maxCount, useBrowser = true } = await request.json();
    
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
    
    // 验证最大数量（移除上限限制，但保留合理性检查）
    let count: number | undefined;
    if (maxCount !== undefined && maxCount !== null) {
      count = parseInt(maxCount);
      if (isNaN(count) || count < 1) {
        return NextResponse.json(
          { error: '最大文章数量应大于0' },
          { status: 400 }
        );
      }
      // 给出警告但不阻止大数量提取
      if (count > 1000) {
        console.warn(`用户请求提取 ${count} 篇文章，数量较大，可能需要较长时间`);
      }
    }
    
    console.log('开始提取专辑文章:', url, '最大数量:', count || '无限制', '使用浏览器模式:', useBrowser);
    
    let articles;
    if (useBrowser) {
      // 使用浏览器模式进行懒加载提取
      articles = await extractor.extractAlbumArticlesWithBrowser(url, count);
    } else {
      // 使用传统模式提取（保留兼容性）
      articles = await extractor.extractAlbumArticles(url, count || 15);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        articles,
        total: articles.length,
        extractedAt: new Date().toISOString(),
        method: useBrowser ? 'browser' : 'traditional'
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
      maxCount: '最大文章数量 (可选，默认15，最大500)'
    }
  });
}