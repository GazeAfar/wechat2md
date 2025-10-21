import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { Browser, Page } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';

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
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
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
      
      // 先检查页面内容
      const pageContent = await page.content();
      console.log('页面标题:', await page.title());
      console.log('页面URL:', page.url());
      console.log('页面内容长度:', pageContent.length);
      
      for (let i = 0; i < maxScrollAttempts; i++) {
        // 提取当前页面的文章链接 - 使用增强的提取策略
        const currentLinks = await page.evaluate(() => {
          const links: string[] = [];
          const debugInfo: any = {};
          
          const cssSelectors = [
            'a[href*="/s?"]',
            'a[href*="mp.weixin.qq.com/s"]',
            'a[href*="__biz="]',
            '.album_item a',
            '.article-item a',
            '.appmsg_item a',
            '.js_album_item a',
            '.item a',
            '[data-link]',
            '[data-url]'
          ];
          
          // 辅助函数：检查URL是否有效
          const isValidArticleUrl = (url: string): boolean => {
            if (!url) return false;
            return url.includes('mp.weixin.qq.com/s') || url.includes('__biz=') || url.includes('chksm=');
          };
          
          // 辅助函数：添加链接到结果
          const addLink = (url: string) => {
            if (url && isValidArticleUrl(url) && !links.includes(url)) {
              links.push(url);
            }
          };
          
          // 策略1: CSS选择器
          cssSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            debugInfo[selector] = elements.length;
            
            elements.forEach(element => {
              const href = (element as HTMLAnchorElement).href;
              const dataLink = element.getAttribute('data-link');
              const dataUrl = element.getAttribute('data-url');
              
              // 检查多个可能的URL属性
              [href, dataLink, dataUrl].forEach(url => {
                if (url) addLink(url);
              });
            });
          });

          // 策略2: XPath选择器（通过CSS模拟）
          const xpathSelectors = [
            '.album_item a, [class*="album_item"] a',
            '[class*="item"] a'
          ];
          
          xpathSelectors.forEach(selector => {
            try {
              const elements = document.querySelectorAll(selector);
              debugInfo[`xpath_${selector}`] = elements.length;
              elements.forEach(element => {
                const href = (element as HTMLAnchorElement).href;
                addLink(href);
              });
            } catch (e) {
              debugInfo[`xpath_${selector}`] = 0;
            }
          });
          
          // 策略3: 从页面源码中使用正则表达式提取
          const pageSource = document.documentElement.outerHTML;
          const patterns = [
            /href="([^"]*mp\.weixin\.qq\.com\/s[^"]*)"/g,
            /"url":"([^"]*mp\.weixin\.qq\.com\/s[^"]*)"/g,
            /data-link="([^"]*mp\.weixin\.qq\.com\/s[^"]*)"/g,
            /data-url="([^"]*mp\.weixin\.qq\.com\/s[^"]*)"/g,
            /"link":"([^"]*mp\.weixin\.qq\.com\/s[^"]*)"/g,
            /content_url":"([^"]*mp\.weixin\.qq\.com\/s[^"]*)"/g,
            /([^"\s]*__biz=[^"\s&]*[^"\s]*)/g,
            /(https?:\/\/mp\.weixin\.qq\.com\/s\?[^"\s]*)/g
          ];
          
          let regexMatches = 0;
          patterns.forEach(pattern => {
            const matchIterator = pageSource.matchAll(pattern);
            const matches = Array.from(matchIterator);
            regexMatches += matches.length;
            matches.forEach(match => {
              if (match[1]) {
                addLink(decodeURIComponent(match[1]));
              }
            });
          });
          
          // 额外检查：查找所有a标签
          const allLinks = document.querySelectorAll('a');
          debugInfo['total_links'] = allLinks.length;
          debugInfo['regex_matches'] = regexMatches;
          debugInfo['wechat_links'] = links.length;
          
          return { 
            links: Array.from(new Set(links)), 
            debug: debugInfo, 
            examples: links.slice(0, 3) 
          };
        });

        // 添加新链接
        const linksArray = currentLinks.links || currentLinks;
        linksArray.forEach((link: string) => articleLinks.add(link));
        
        // 输出调试信息
        if (currentLinks.debug) {
          console.log(`滚动第 ${i + 1} 次调试信息:`, JSON.stringify(currentLinks.debug, null, 2));
          console.log('找到的微信链接示例:', currentLinks.examples);
        }
        
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
        
        // 滚动页面
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        
        // 等待内容加载
        await new Promise(resolve => setTimeout(resolve, 2000));
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