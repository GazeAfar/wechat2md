import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';

// 配置 Turndown 服务
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// 反爬虫配置
const ANTI_CRAWLER_CONFIG = {
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ],
  minDelay: 2000,
  maxDelay: 5000,
  batchSize: 3,
  batchDelay: 8000
};

// 自定义规则
turndownService.addRule('removeScript', {
  filter: ['script', 'style', 'noscript'],
  replacement: () => ''
});

turndownService.addRule('preserveImages', {
  filter: 'img',
  replacement: (content: string, node: any) => {
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
  private currentUserAgentIndex = 0;
  
  constructor() {
    // 配置 axios 默认设置
    axios.defaults.timeout = 30000;
  }

  private getRandomUserAgent(): string {
    const userAgent = ANTI_CRAWLER_CONFIG.userAgents[this.currentUserAgentIndex];
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % ANTI_CRAWLER_CONFIG.userAgents.length;
    return userAgent;
  }

  private getRandomDelay(): number {
    return Math.floor(Math.random() * (ANTI_CRAWLER_CONFIG.maxDelay - ANTI_CRAWLER_CONFIG.minDelay + 1)) + ANTI_CRAWLER_CONFIG.minDelay;
  }

  /**
   * 使用浏览器自动化提取专辑文章（支持懒加载）
   */
  async extractAlbumArticlesWithBrowser(albumUrl: string, maxCount?: number): Promise<ArticleInfo[]> {
    let browser;
    try {
      console.log(`开始使用浏览器提取专辑: ${albumUrl}`);
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // 设置随机User-Agent
      await page.setUserAgent(this.getRandomUserAgent());
      
      // 设置视口
      await page.setViewport({ width: 1366, height: 768 });
      
      // 访问专辑页面
      await page.goto(albumUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 3000));

      const articleLinks = new Set<string>();
      let previousCount = 0;
      let noNewLinksCount = 0;
      const maxScrollAttempts = 50; // 增加最大滚动次数
      
      console.log('开始模拟滚动加载文章...');
      
      for (let i = 0; i < maxScrollAttempts; i++) {
        // 提取当前页面的文章链接
        const currentLinks = await page.evaluate(() => {
          const links: string[] = [];
          const selectors = [
            'a[href*="/s?"]',
            'a[href*="mp.weixin.qq.com/s"]',
            'a[href*="__biz="]',
            '.album_item a',
            '.article-item a',
            '.appmsg_item a',
            '.js_album_item a'
          ];
          
          selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              const href = (element as HTMLAnchorElement).href;
              if (href && href.includes('mp.weixin.qq.com/s') && href.includes('__biz=')) {
                links.push(href);
              }
            });
          });
          
          return Array.from(new Set(links));
        });

        // 添加新链接
        currentLinks.forEach(link => articleLinks.add(link));
        
        console.log(`滚动第 ${i + 1} 次，当前找到 ${articleLinks.size} 个链接`);
        
        // 检查是否达到目标数量
        if (maxCount && articleLinks.size >= maxCount) {
          console.log(`已达到目标数量 ${maxCount}，停止滚动`);
          break;
        }
        
        // 检查是否有新链接
        if (articleLinks.size === previousCount) {
          noNewLinksCount++;
          if (noNewLinksCount >= 5) {
            console.log('连续5次滚动没有新链接，停止滚动');
            break;
          }
        } else {
          noNewLinksCount = 0;
        }
        
        previousCount = articleLinks.size;
        
        // 滚动到页面底部
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        // 等待懒加载
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
      }

      await browser.close();
      
      const finalLinks = Array.from(articleLinks);
      const targetLinks = maxCount ? finalLinks.slice(0, maxCount) : finalLinks;
      
      console.log(`浏览器提取完成，共找到 ${finalLinks.length} 个链接，将提取 ${targetLinks.length} 篇文章`);
      
      // 使用优化的批量提取方法
      return await this.extractArticlesBatch(targetLinks);
      
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error('浏览器提取失败:', error);
      throw new Error(`浏览器提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量提取文章（优化版本，支持反爬虫）
   */
  private async extractArticlesBatch(articleLinks: string[]): Promise<ArticleInfo[]> {
    const articles: ArticleInfo[] = [];
    const batchSize = ANTI_CRAWLER_CONFIG.batchSize;
    
    console.log(`开始批量提取 ${articleLinks.length} 篇文章，每批 ${batchSize} 篇`);
    
    for (let i = 0; i < articleLinks.length; i += batchSize) {
      const batch = articleLinks.slice(i, i + batchSize);
      console.log(`正在处理第 ${i + 1}-${Math.min(i + batchSize, articleLinks.length)} 篇文章...`);
      
      // 并发处理当前批次的文章
      const batchPromises = batch.map(async (link, index) => {
        try {
          // 添加随机延迟
          const delay = this.getRandomDelay();
          await this.delay(delay);
          
          const article = await this.extractSingleArticle(link);
          console.log(`成功提取第 ${i + index + 1} 篇文章: ${article.title}`);
          return article;
        } catch (error) {
          console.error(`提取第 ${i + index + 1} 篇文章失败:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // 收集成功的文章
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          articles.push(result.value);
        }
      });
      
      // 在批次之间添加延迟，避免请求过快
      if (i + batchSize < articleLinks.length) {
        console.log(`批次完成，等待 ${ANTI_CRAWLER_CONFIG.batchDelay}ms 后继续...`);
        await this.delay(ANTI_CRAWLER_CONFIG.batchDelay);
      }
    }
    
    console.log(`批量提取完成，成功提取 ${articles.length} 篇文章`);
    return articles;
  }

  /**
   * 提取单篇文章
   */
  async extractSingleArticle(url: string): Promise<ArticleInfo> {
    try {
      console.log(`开始提取文章: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 30000,
        maxRedirects: 3
      });

      const $ = cheerio.load(response.data);
      
      const title = this.extractTitle($);
      const content = this.extractContent($);
      const author = this.extractAuthor($);
      const publishTime = this.extractPublishTime($);
      const images = this.extractImages($);
      
      if (!content) {
        throw new Error('无法提取文章内容');
      }
      
      const markdown = this.convertToMarkdown(content, title, author, publishTime);
      
      return {
        title,
        content: markdown,
        author,
        publishTime,
        url,
        images
      };
      
    } catch (error) {
      console.error(`提取文章失败: ${url}`, error);
      throw new Error(`提取文章失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 传统方式提取专辑文章（保留兼容性）
   */
  async extractAlbumArticles(albumUrl: string, maxCount: number = 15): Promise<ArticleInfo[]> {
    try {
      console.log(`开始提取专辑: ${albumUrl}, 最大数量: ${maxCount}`);
      
      const response = await axios.get(albumUrl, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
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
        timeout: 60000,
        maxRedirects: 5
      });

      console.log(`页面响应状态: ${response.status}, 内容长度: ${response.data.length}`);
      
      const $ = cheerio.load(response.data);
      
      const title = $('title').text();
      console.log(`页面标题: ${title}`);
      
      const articleLinks = this.extractArticleLinks($, maxCount);
      
      console.log(`找到 ${articleLinks.length} 篇文章`);
      
      if (articleLinks.length === 0) {
        console.log('页面内容预览:', response.data.substring(0, 1000));
        throw new Error('未找到任何文章链接，可能是页面结构发生变化或需要登录');
      }
      
      return await this.extractArticlesBatch(articleLinks);
      
    } catch (error) {
      console.error('提取专辑失败:', error);
      throw new Error(`提取专辑失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
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
      
      const imageUrl = dataSrc || dataOriginal || src;
      
      if (imageUrl && imageUrl.includes('mmbiz.qpic.cn')) {
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
    
    const selectors = [
      'a[href*="/s?"]',
      'a[href*="mp.weixin.qq.com/s"]',
      'a[href*="__biz="]',
      '.album_item a',
      '.article-item a',
      '.appmsg_item a',
      '.js_album_item a',
      'li a[href*="s?"]',
      'div a[href*="s?"]',
      '.album_list a',
      '.msg_item a',
      '.appmsg_wrapper a',
      'a[data-link*="s?"]'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      console.log(`选择器 "${selector}" 找到 ${elements.length} 个元素`);
      
      elements.each((_, element) => {
        const href = $(element).attr('href') || $(element).attr('data-link');
        if (href && links.length < maxCount) {
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = `https://mp.weixin.qq.com${href}`;
          } else if (!href.startsWith('http')) {
            fullUrl = `https://mp.weixin.qq.com/s/${href}`;
          }
          
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
    
    if (links.length < Math.min(maxCount, 10)) {
      console.log('尝试更宽泛的链接提取...');
      const html = $.html();
      const bizPattern = /__biz=[^&"'\s<>]+/g;
      const bizMatches = html.match(bizPattern) || [];
      
      for (const bizMatch of bizMatches) {
        if (links.length >= maxCount) break;
        const urlStart = html.indexOf('mp.weixin.qq.com/s?', html.indexOf(bizMatch) - 100);
        if (urlStart > -1) {
          const urlEnd = html.indexOf('"', urlStart);
          if (urlEnd > urlStart) {
            let fullUrl = html.substring(urlStart, urlEnd);
            if (!fullUrl.startsWith('http')) {
              fullUrl = 'https://' + fullUrl;
            }
            fullUrl = fullUrl.replace(/&amp;/g, '&');
            if (!links.includes(fullUrl)) {
              console.log(`宽泛匹配到链接: ${fullUrl.substring(0, 100)}...`);
              links.push(fullUrl);
            }
          }
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
    
    const contentMarkdown = turndownService.turndown(content);
    markdown += contentMarkdown;
    
    return markdown;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const extractor = new WeChatExtractor();