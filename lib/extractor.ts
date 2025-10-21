import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

// 配置 Turndown 服务
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// 自定义规则
turndownService.addRule('removeScript', {
  filter: ['script', 'style', 'noscript'],
  replacement: () => ''
});

turndownService.addRule('preserveImages', {
  filter: 'img',
  replacement: (content, node) => {
    const src = (node as Element).getAttribute('src') || '';
    const dataSrc = (node as Element).getAttribute('data-src') || '';
    const dataOriginal = (node as Element).getAttribute('data-original') || '';
    const alt = (node as Element).getAttribute('alt') || '';
    const title = (node as Element).getAttribute('title') || '';
    
    // 优先使用真实的图片源
    let imageUrl = dataSrc || dataOriginal || src;
    
    if (!imageUrl) return '';
    
    // 过滤掉SVG占位符和无效的base64图片
    if (imageUrl.includes('data:image/svg+xml') || 
        imageUrl.includes('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP') ||
        imageUrl.includes('placeholder') ||
        imageUrl.includes('loading')) {
      return '';
    }
    
    // 只处理微信图片链接
    if (imageUrl.includes('mmbiz.qpic.cn')) {
      // 确保使用 HTTPS
      imageUrl = imageUrl.replace(/^http:/, 'https:');
      return title ? `![${alt}](${imageUrl} "${title}")` : `![${alt}](${imageUrl})`;
    }
    
    // 对于其他有效的图片链接
    if (imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      return title ? `![${alt}](${imageUrl} "${title}")` : `![${alt}](${imageUrl})`;
    }
    
    return '';
  }
});

export interface ArticleInfo {
  title: string;
  content: string;
  author?: string;
  publishTime?: string;
  url: string;
  images?: string[];
}

export interface ExtractionProgress {
  current: number;
  total: number;
  status: 'processing' | 'completed' | 'error';
  message: string;
  articles?: ArticleInfo[];
}

export class WeChatExtractor {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  constructor() {
    // 配置 axios 默认设置
    axios.defaults.timeout = 30000;
    axios.defaults.headers.common['User-Agent'] = this.userAgent;
  }

  /**
   * 提取单篇文章
   */
  async extractSingleArticle(url: string): Promise<ArticleInfo> {
    try {
      console.log(`开始提取文章: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });

      const $ = cheerio.load(response.data);
      
      // 提取文章标题
      const title = this.extractTitle($);
      
      // 提取文章内容
      const content = this.extractContent($);
      
      // 提取作者信息
      const author = this.extractAuthor($);
      
      // 提取发布时间
      const publishTime = this.extractPublishTime($);
      
      // 提取图片链接
      const images = this.extractImages($);
      
      // 转换为 Markdown
      const markdown = this.convertToMarkdown(content, title, author, publishTime);
      
      return {
        title: title || '未知标题',
        content: markdown,
        author,
        publishTime,
        url,
        images
      };
      
    } catch (error) {
      console.error('提取文章失败:', error);
      throw new Error(`提取文章失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 提取专辑文章列表
   */
  async extractAlbumArticles(albumUrl: string, maxCount: number = 15): Promise<ArticleInfo[]> {
    try {
      console.log(`开始提取专辑: ${albumUrl}, 最大数量: ${maxCount}`);
      
      // 添加更多的请求头来模拟真实浏览器
      const response = await axios.get(albumUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000,
        maxRedirects: 5
      });

      console.log(`页面响应状态: ${response.status}, 内容长度: ${response.data.length}`);
      
      const $ = cheerio.load(response.data);
      
      // 检查页面是否正确加载
      const title = $('title').text();
      console.log(`页面标题: ${title}`);
      
      const articleLinks = this.extractArticleLinks($, maxCount);
      
      console.log(`找到 ${articleLinks.length} 篇文章`);
      
      if (articleLinks.length === 0) {
        // 如果没有找到文章，输出页面的部分内容用于调试
        console.log('页面内容预览:', response.data.substring(0, 1000));
        throw new Error('未找到任何文章链接，可能是页面结构发生变化或需要登录');
      }
      
      const articles: ArticleInfo[] = [];
      
      for (let i = 0; i < articleLinks.length; i++) {
        try {
          console.log(`正在提取第 ${i + 1}/${articleLinks.length} 篇文章...`);
          const article = await this.extractSingleArticle(articleLinks[i]);
          articles.push(article);
          
          // 添加延迟避免请求过快
          if (i < articleLinks.length - 1) {
            await this.delay(2000); // 增加延迟时间
          }
        } catch (error) {
          console.error(`提取第 ${i + 1} 篇文章失败:`, error);
          // 继续处理下一篇文章
        }
      }
      
      return articles;
      
    } catch (error) {
      console.error('提取专辑失败:', error);
      throw new Error(`提取专辑失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // 尝试多种选择器提取标题
    const selectors = [
      '#activity-name',
      '.rich_media_title',
      'h1.title',
      'h1',
      '.article-title',
      'title'
    ];
    
    for (const selector of selectors) {
      const title = $(selector).first().text().trim();
      if (title && title !== '微信公众平台') {
        return title;
      }
    }
    
    return '未知标题';
  }

  private extractContent($: cheerio.CheerioAPI): string {
    // 尝试多种选择器提取内容
    const selectors = [
      '#js_content',
      '.rich_media_content',
      '.article-content',
      '.content',
      'article'
    ];
    
    for (const selector of selectors) {
      const content = $(selector).first();
      if (content.length > 0) {
        // 清理不需要的元素
        content.find('script, style, .qr-code, .reward, .share').remove();
        return content.html() || '';
      }
    }
    
    return '';
  }

  private extractAuthor($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '#js_name',
      '.rich_media_meta_text',
      '.author',
      '.article-author'
    ];
    
    for (const selector of selectors) {
      const author = $(selector).first().text().trim();
      if (author) {
        return author;
      }
    }
    
    return undefined;
  }

  private extractPublishTime($: cheerio.CheerioAPI): string | undefined {
    const selectors = [
      '#publish_time',
      '.rich_media_meta_text',
      '.publish-time',
      '.article-time'
    ];
    
    for (const selector of selectors) {
      const time = $(selector).first().text().trim();
      if (time && /\d{4}/.test(time)) {
        return time;
      }
    }
    
    return undefined;
  }

  private extractImages($: cheerio.CheerioAPI): string[] {
    const images: string[] = [];
    
    $('img').each((_, element) => {
      const src = $(element).attr('src') || '';
      const dataSrc = $(element).attr('data-src') || '';
      const dataOriginal = $(element).attr('data-original') || '';
      
      // 优先使用真实的图片源
      const imageUrl = dataSrc || dataOriginal || src;
      
      if (imageUrl && imageUrl.includes('mmbiz.qpic.cn')) {
        // 过滤掉SVG占位符和无效图片
        if (!imageUrl.includes('data:image/svg+xml') && 
            !imageUrl.includes('placeholder') &&
            !imageUrl.includes('loading')) {
          const httpsUrl = imageUrl.replace(/^http:/, 'https:');
          if (!images.includes(httpsUrl)) {
            images.push(httpsUrl);
          }
        }
      }
    });
    
    return images;
  }

  private extractArticleLinks($: cheerio.CheerioAPI, maxCount: number): string[] {
    const links: string[] = [];
    
    console.log('开始提取文章链接，页面内容长度:', $.html().length);
    
    // 尝试多种选择器提取文章链接
    const selectors = [
      'a[href*="/s?"]',
      'a[href*="mp.weixin.qq.com/s"]',
      'a[href*="__biz="]',
      '.album_item a',
      '.article-item a',
      '.appmsg_item a',
      '.js_album_item a',
      'li a[href*="s?"]',
      'div a[href*="s?"]'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      console.log(`选择器 "${selector}" 找到 ${elements.length} 个元素`);
      
      elements.each((_, element) => {
        const href = $(element).attr('href');
        if (href && links.length < maxCount) {
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = `https://mp.weixin.qq.com${href}`;
          } else if (!href.startsWith('http')) {
            fullUrl = `https://mp.weixin.qq.com/s/${href}`;
          }
          
          // 验证是否是有效的文章链接
          if (fullUrl.includes('mp.weixin.qq.com/s') && fullUrl.includes('__biz=')) {
            if (!links.includes(fullUrl)) {
              console.log(`找到文章链接: ${fullUrl.substring(0, 100)}...`);
              links.push(fullUrl);
            }
          }
        }
      });
      
      if (links.length >= maxCount) break;
    }
    
    // 如果没有找到链接，尝试从页面源码中提取
    if (links.length === 0) {
      console.log('使用正则表达式从页面源码中提取链接...');
      const html = $.html();
      const urlPattern = /https?:\/\/mp\.weixin\.qq\.com\/s\?[^"'\s<>]+/g;
      const matches = html.match(urlPattern) || [];
      
      for (const match of matches) {
        if (links.length >= maxCount) break;
        const cleanUrl = match.replace(/&amp;/g, '&');
        if (!links.includes(cleanUrl)) {
          console.log(`正则提取到链接: ${cleanUrl.substring(0, 100)}...`);
          links.push(cleanUrl);
        }
      }
    }
    
    console.log(`总共提取到 ${links.length} 个文章链接`);
    return links.slice(0, maxCount);
  }

  private convertToMarkdown(content: string, title: string, author?: string, publishTime?: string): string {
    let markdown = `# ${title}\n\n`;
    
    if (author || publishTime) {
      markdown += '---\n';
      if (author) markdown += `作者: ${author}\n`;
      if (publishTime) markdown += `发布时间: ${publishTime}\n`;
      markdown += '---\n\n';
    }
    
    // 转换 HTML 到 Markdown
    const contentMarkdown = turndownService.turndown(content);
    markdown += contentMarkdown;
    
    return markdown;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const extractor = new WeChatExtractor();