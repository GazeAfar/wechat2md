import { NextRequest, NextResponse } from 'next/server';
import { extractor } from '@/lib/extractor';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: '请提供文章链接' },
        { status: 400 }
      );
    }
    
    // 验证链接格式
    if (!url.includes('mp.weixin.qq.com')) {
      return NextResponse.json(
        { error: '请提供有效的微信公众号文章链接' },
        { status: 400 }
      );
    }
    
    console.log('开始提取单篇文章:', url);
    
    const article = await extractor.extractSingleArticle(url);
    
    return NextResponse.json({
      success: true,
      data: article
    });
    
  } catch (error) {
    console.error('提取文章失败:', error);
    
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
    message: '单篇文章提取API',
    usage: 'POST /api/extract/single',
    parameters: {
      url: '微信公众号文章链接'
    }
  });
}