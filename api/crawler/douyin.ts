import { BaseCrawler } from './base';
import { Drama, Celebrity } from '../database';
import { chromium } from 'playwright';

/**
 * 抖音爬虫类
 */
export class DouyinCrawler extends BaseCrawler {
  constructor() {
    super('抖音', 'https://www.douyin.com');
    // 抖音需要更长的延迟和更多重试
    this.requestDelay = { min: 3000, max: 8000 };
    this.maxRetries = 5;
  }

  /**
   * 重写浏览器初始化方法，针对抖音优化超时和重试
   */
  protected async initBrowser(): Promise<void> {
    if (this.browser) return;
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`[${this.platformName}] 正在启动浏览器... (尝试 ${retryCount + 1}/${maxRetries})`);
        
        // 使用静态导入，chromium已在文件顶部导入
        
        // 读取配置
        const config = await this.readConfig();
        const headless = config.crawler?.headless ?? true;
        
        console.log(`[${this.platformName}] 使用无头模式: ${headless}`);
        
        this.browser = await chromium.launch({
          headless: headless,
          timeout: 120000, // 增加到2分钟
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-first-run',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--no-default-browser-check',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-client-side-phishing-detection',
            '--disable-hang-monitor',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--metrics-recording-only',
            '--safebrowsing-disable-auto-update',
            '--password-store=basic',
            '--use-mock-keychain',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-field-trial-config',
            '--disable-back-forward-cache',
            '--disable-ipc-flooding-protection',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=TranslateUI',
            '--disable-component-extensions-with-background-pages',
            '--mute-audio',
            '--autoplay-policy=user-gesture-required'
          ]
        });
        
        // 设置桌面端User-Agent和随机视口大小
        const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        const viewports = [
          { width: 1920, height: 1080 },
          { width: 1366, height: 768 },
          { width: 1440, height: 900 },
          { width: 1536, height: 864 },
          { width: 1280, height: 720 },
          { width: 1600, height: 900 }
        ];
        const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
        
        this.context = await this.browser.newContext({
          userAgent: desktopUA,
          viewport: randomViewport,
          extraHTTPHeaders: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
          }
        });
        
        this.page = await this.context.newPage();
        console.log(`[${this.platformName}] 使用桌面端User-Agent: ${desktopUA.substring(0, 50)}...`);
        console.log(`[${this.platformName}] 使用视口: ${randomViewport.width}x${randomViewport.height}`);
        
        // 设置额外的反爬属性
        await this.page.addInitScript(() => {
          // 隐藏webdriver属性
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });
          
          // 模拟真实浏览器的plugins
          Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
          });
          
          // 模拟真实浏览器的languages
          Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh', 'en'],
          });
          
          // 重写chrome属性
          (window as any).chrome = {
            runtime: {},
          };
          
          // 重写permissions属性
          const originalQuery = (window.navigator as any).permissions.query;
          (window.navigator as any).permissions.query = (parameters: any) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: Notification.permission }) :
              originalQuery(parameters)
          );
        });
        
        // HTTP头已在context创建时设置
        console.log(`[${this.platformName}] HTTP头已设置`);
        
        // 拦截和修改请求
        await this.page.route('**/*', (route) => {
          // 阻止加载图片、字体等资源以提高速度
          if (['image', 'font', 'media'].includes(route.request().resourceType())) {
            route.abort();
          } else {
            route.continue();
          }
        });
        
        console.log(`[${this.platformName}] 浏览器初始化完成`);
        return; // 成功则退出重试循环
        
      } catch (error) {
        retryCount++;
        console.error(`[${this.platformName}] 浏览器初始化失败 (尝试 ${retryCount}/${maxRetries}):`, error);
        
        // 清理失败的浏览器实例
        if (this.browser) {
          try {
            await this.browser.close();
          } catch (e) {
            console.warn(`[${this.platformName}] 清理浏览器实例失败:`, e);
          }
          this.browser = null;
        }
        
        if (retryCount < maxRetries) {
          const delay = 5000 + (retryCount * 2000); // 递增延迟
          console.log(`[${this.platformName}] ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new Error(`浏览器初始化失败，已重试 ${maxRetries} 次: ${error}`);
        }
      }
    }
  }
  
  /**
   * 获取短剧列表
   */
  async getDramaList(options: {
    page?: number;
    pageSize?: number;
    category?: string;
  } = {}): Promise<Partial<Drama>[]> {
    const { page = 1, pageSize = 20, category = '' } = options;
    
    try {
      console.log(`[抖音] 开始获取短剧列表 - 页码: ${page}, 每页: ${pageSize}`);
      
      // 抖音短剧页面URL - 使用用户指定的单一入口页面
      const targetUrl = 'https://www.douyin.com/series';
      console.log(`[抖音] 使用指定URL: ${targetUrl}`);
      
      // 导航到目标页面
      await this.safeGoto(targetUrl);
      
      // 检测反爬机制
      if (await this.detectAntiCrawler()) {
        console.warn('[抖音] 检测到反爬机制，使用备用策略');
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));
      }
      
      // 等待网络空闲
      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.warn('[抖音] 网络空闲等待超时');
      }
      
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // 尝试等待视频列表容器加载
      try {
        await this.page!.waitForSelector('[data-e2e="search-result"], .video-item, .aweme-video-item, [data-e2e="video-feed-item"]', { timeout: 20000 });
      } catch (e) {
        console.warn('[抖音] 未找到预期的视频列表容器');
      }
      
      // 模拟用户滚动行为
      await this.page!.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 4);
      });
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      await this.page!.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      await this.page!.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      await this.page!.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const html = await this.page!.content();
      const $ = this.parseHTML(html);
      
      const dramas: Partial<Drama>[] = [];
      
          // 抖音短剧系列页面选择器策略 - 优先级排序
          const selectors = [
            // 抖音短剧系列页面专用选择器（优先级最高）
            '.series-list .series-item',
            '.drama-series-list .item',
            '.series-card-list .card',
            '.series-content .series-item',
            
            // 抖音特有的data-e2e属性选择器
            '[data-e2e="series-item"]',
            '[data-e2e="drama-item"]',
            '[data-e2e="series-card"]',
            '[data-e2e="video-series"]',
            '[data-e2e="drama-series"]',
            
            // 抖音系列页面卡片选择器
            '.series-card',
            '.drama-card',
            '.series-item',
            '.drama-series-item',
            '.video-series-card',
            
            // 抖音链接选择器（系列页面专用）
            'a[href*="/series/"]',
            'a[href*="/drama/"]',
            'a[href*="/video/"]',
            'a[href*="douyin.com"]',
            
            // React组件选择器（抖音使用React）
            '[data-react-] .series-item',
            '[data-react-] .drama-item',
            '[data-react-] .card',
            
            // 数据属性选择器
            '[data-series-id]',
            '[data-drama-id]',
            '[data-aweme-id]',
            '[data-item-id]',
            
            // 通用选择器
            '.item',
            '.card',
            'article',
            'li',
            
            // 备用选择器
            'div[class*="series"]',
            'div[class*="drama"]',
            'div[class*="item"]',
            'div[class*="card"]',
            'div[class*="video"]'
          ];
      
      let foundItems = false;
      
      for (const selector of selectors) {
        const items = $(selector);
        if (items.length > 0) {
          console.log(`[抖音] 使用选择器 ${selector} 找到 ${items.length} 个视频项目`);
          
          items.each((index, element) => {
            if (dramas.length >= pageSize) return false;
            
            const $item = $(element);
            
            // 提取标题
            let title = '';
            const titleSelectors = [
              // 抖音短剧系列页面专用标题选择器
              '.series-title', '.drama-title', '.series-name',
              '.drama-series-title', '.video-series-title',
              '.series-card-title', '.drama-card-title',
              // 抖音通用标题选择器
              '[data-e2e="video-title"]', '.title', '.video-title', '.drama-title',
              '.card-title', '.item-title', '.content-title', '.feed-title',
              // React组件标题选择器
              '[data-react-] .title', '[data-react-] .name',
              '[data-react-] .series-title', '[data-react-] .drama-title',
              // 数据属性选择器
              '[data-title]', '[data-series-title]', '[data-drama-title]',
              '[title]', '[alt]',
              // HTML标签选择器
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              // 图片选择器
              'img'
            ];
            for (const titleSel of titleSelectors) {
              const titleEl = $item.find(titleSel);
              if (titleEl.length > 0) {
                if (titleSel === 'img') {
                  title = this.cleanText(titleEl.attr('alt') || titleEl.attr('title') || '');
                } else if (titleSel === '[title]') {
                  title = this.cleanText(titleEl.attr('title') || '');
                } else if (titleSel === '[alt]') {
                  title = this.cleanText(titleEl.attr('alt') || '');
                } else {
                  title = this.cleanText(titleEl.text());
                }
                if (title && title.length > 1) break;
              }
            }
            
            // 提取链接
            let link = '';
            if ($item.is('a')) {
              link = $item.attr('href') || '';
            } else {
              const linkSelectors = [
                // 抖音短剧系列页面专用链接选择器
                'a[href*="/series/"]',     // 系列页面链接
                'a[href*="/drama/"]',      // 短剧页面链接
                'a[href*="/video/"]',      // 视频页面链接
                'a[href*="douyin.com"]',   // 抖音域名链接
                // 数据属性链接选择器
                'a[data-series-id]',       // 带系列ID的链接
                'a[data-drama-id]',        // 带短剧ID的链接
                'a[data-aweme-id]',        // 带抖音ID的链接
                'a[data-e2e="video-link"]', // 抖音特有属性
                'a[data-e2e="series-link"]', // 系列链接属性
                // 通用链接选择器
                'a',                       // 任何链接
                '[href]'                   // 任何带href属性的元素
              ];
              for (const linkSel of linkSelectors) {
                const linkEl = $item.find(linkSel).first();
                if (linkEl.length > 0) {
                  link = linkEl.attr('href') || '';
                  if (link) break;
                }
              }
            }
            if (link && !link.startsWith('http')) {
              link = link.startsWith('//') ? `https:${link}` : `https://www.douyin.com${link}`;
            }
            
            // 提取封面图
            let cover = '';
            const imgSelectors = [
              // 抖音短剧系列页面专用图片选择器
              '.series-poster img', '.drama-poster img', '.series-cover img',
              '.drama-series-poster img', '.video-series-poster img',
              '.series-card-poster img', '.drama-card-poster img',
              // 抖音通用图片选择器
              '.video-poster img', '.aweme-poster img', '.feed-poster img',
              '.poster img', '.cover img', '.thumbnail img',
              // React组件图片选择器
              '[data-react-] img', '[data-react-] .poster', '[data-react-] .cover',
              // 通用图片选择器
              'img', '.img', '.poster', '.cover', '.thumbnail',
              '.pic', '.image', '.photo'
            ];
            for (const imgSel of imgSelectors) {
              const imgEl = $item.find(imgSel).first();
              if (imgEl.length > 0) {
                cover = imgEl.attr('src') || imgEl.attr('data-src') || 
                       imgEl.attr('data-original') || imgEl.attr('data-lazy') ||
                       imgEl.attr('data-url') || imgEl.attr('data-poster') || '';
                if (cover) break;
              }
            }
            if (cover && !cover.startsWith('http')) {
              cover = cover.startsWith('//') ? `https:${cover}` : cover;
            }
            
            // 提取描述
            let description = '';
            const descSelectors = [
              // 抖音短剧系列页面专用描述选择器
              '.series-desc', '.drama-desc', '.series-description',
              '.drama-series-desc', '.video-series-desc',
              '.series-card-desc', '.drama-card-desc',
              '.series-summary', '.drama-summary',
              // 抖音通用描述选择器
              '[data-e2e="video-desc"]', '.desc', '.description',
              '.video-desc', '.aweme-desc', '.content', '.summary', '.intro', '.text',
              // React组件描述选择器
              '[data-react-] .desc', '[data-react-] .description',
              '[data-react-] .summary', '[data-react-] .content',
              // 数据属性选择器
              '[data-desc]', '[data-description]', '[data-summary]',
              // HTML标签选择器
              'p', 'span', 'div.text'
            ];
            for (const descSel of descSelectors) {
              const descEl = $item.find(descSel).first();
              if (descEl.length > 0) {
                description = this.cleanText(descEl.text());
                if (description) break;
              }
            }
            
            // 验证是否为短剧内容
            if (title && title.length > 1 && this.isShortDrama(title, description)) {
              dramas.push({
                title,
                description: description || `抖音短剧：${title}`,
                status: 'ongoing' as const,
                // platform: '抖音',
                poster_url: cover,
                source_url: link,
                episode_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            } else if (title && title.length > 1) {
              console.log(`[抖音] 过滤掉非短剧内容: ${title}`);
            }
          });
          
          foundItems = true;
          break;
        }
      }
      
      if (!foundItems || dramas.length === 0) {
        // 保存调试信息
        const debugInfo = {
          timestamp: new Date().toISOString(),
          url: targetUrl,
          selectors: 'multiple selectors tried',
          pageTitle: await this.page!.title(),
          foundItems: 0,
          dramaCount: 0
        };
        
        await this.saveDebugInfo('douyin_drama_list_failed', debugInfo);
        await this.saveScreenshot('douyin_drama_list_failed');
        await this.savePageHTML('douyin_drama_list_failed');
        
        throw new Error('未能从抖音页面提取到短剧数据');
      }
      
      console.log(`[抖音] 成功获取 ${dramas.length} 个短剧`);
      console.log('[抖音] 提取到的短剧数据:', dramas.map(d => ({ title: d.title, source_url: d.source_url })));
      
      // 保存成功的调试信息
      const successInfo = {
        timestamp: new Date().toISOString(),
        url: targetUrl,
        dramaCount: dramas.length,
        dramas: dramas.map(d => ({ title: d.title, source_url: d.source_url }))
      };
      await this.saveDebugInfo('douyin_drama_list_success', successInfo);
      
      return dramas;
      
    } catch (error) {
      console.error(`[抖音] 获取短剧列表失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取排行榜
   */
  async getRankings(type: string = 'hot', options: any = {}): Promise<any[]> {
    const { limit = 10 } = options;
    
    try {
      console.log(`[抖音] 开始获取排行榜 - 类型: ${type}, 限制: ${limit}`);
      
      // 抖音热门短剧页面URL
      const targetUrl = 'https://www.douyin.com/hot/短剧';
      
      // 导航到目标页面
      await this.safeGoto(targetUrl);
      
      // 检测反爬机制
      if (await this.detectAntiCrawler()) {
        console.warn('[抖音] 检测到反爬机制，使用备用策略');
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));
      }
      
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 尝试等待热门列表容器加载
      try {
        await this.page!.waitForSelector('.hot-list, .rank-list, .trending-list, [data-e2e="hot-list"]', { timeout: 15000 });
      } catch (e) {
        console.warn('[抖音] 未找到预期的热门列表容器');
      }
      
      // 滚动页面加载更多内容
      await this.page!.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 3);
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const html = await this.page!.content();
      const $ = this.parseHTML(html);
      
      const rankings: Partial<Drama>[] = [];
      
      // 尝试多种可能的选择器
      const selectors = [
        '.hot-list .item',
        '.rank-list .item',
        '.trending-list .item',
        '[data-e2e="hot-list"] .item',
        '.hot-item',
        '.rank-item',
        '.video-item'
      ];
      
      let foundItems = false;
      
      for (const selector of selectors) {
        const items = $(selector);
        if (items.length > 0) {
          console.log(`[抖音] 使用选择器 ${selector} 找到 ${items.length} 个热门项目`);
          
          items.each((index, element) => {
            if (rankings.length >= limit) return false;
            
            const $item = $(element);
            
            // 提取标题
            let title = '';
            const titleSelectors = ['.title', '.hot-title', '.rank-title', '[data-e2e="video-title"]', 'img'];
            for (const titleSel of titleSelectors) {
              const titleEl = $item.find(titleSel);
              if (titleEl.length > 0) {
                title = titleSel === 'img' ? 
                  this.cleanText(titleEl.attr('alt') || titleEl.attr('title') || '') :
                  this.cleanText(titleEl.text());
                if (title) break;
              }
            }
            
            // 提取链接
            let link = '';
            const linkEl = $item.find('a').first();
            if (linkEl.length > 0) {
              link = linkEl.attr('href') || '';
              if (link && !link.startsWith('http')) {
                link = link.startsWith('//') ? `https:${link}` : `https://www.douyin.com${link}`;
              }
            }
            
            // 提取封面图
            let cover = '';
            const imgEl = $item.find('img').first();
            if (imgEl.length > 0) {
              cover = imgEl.attr('src') || imgEl.attr('data-src') || '';
              if (cover && !cover.startsWith('http')) {
                cover = cover.startsWith('//') ? `https:${cover}` : cover;
              }
            }
            
            // 提取描述或热度信息
            let description = '';
            const descEl = $item.find('.desc, .description, .hot-desc, .rank-desc');
            if (descEl.length > 0) {
              description = this.cleanText(descEl.text());
            }
            
            // 提取热度值
            let hotValue = '';
            const hotEl = $item.find('.hot-value, .rank-value, .view-count');
            if (hotEl.length > 0) {
              hotValue = this.cleanText(hotEl.text());
            }
            
            if (title && title.length > 1 && (title.includes('短剧') || title.includes('剧') || description.includes('短剧'))) {
              rankings.push({
                title,
                description: description || `抖音热门短剧：${title}${hotValue ? ` (热度: ${hotValue})` : ''}`,
                status: 'ongoing' as const,
                // platform: '抖音',
                poster_url: cover,
                source_url: link,
                episode_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          });
          
          foundItems = true;
          break;
        }
      }
      
      if (!foundItems || rankings.length === 0) {
        console.warn('[抖音] 未能从页面提取到排行榜数据');
        throw new Error('未能从抖音页面提取到排行榜数据');
      }
      
      console.log(`[抖音] 成功获取 ${rankings.length} 个排行榜短剧`);
      console.log('[抖音] 提取到的排行榜数据:', rankings.map(d => ({ title: d.title, source_url: d.source_url })));
      return rankings;
      
    } catch (error) {
      console.error(`[抖音] 获取排行榜失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取短剧详情
   */
  async getDramaDetail(dramaId: string, options: any = {}): Promise<any> {
    try {
      const detailUrl = dramaId.startsWith('http') ? dramaId : `${this.baseUrl}/video/${dramaId}`;
      
      await this.safeGoto(detailUrl);
      
      // 检测反爬机制
      if (await this.detectAntiCrawler()) {
        throw new Error('检测到反爬机制，暂停爬取');
      }
      
      // 等待内容加载
      await new Promise(resolve => setTimeout(resolve, 3000));
      await this.page!.waitForSelector('[data-e2e="video-detail"]', { timeout: 15000 });
      
      const html = await this.page!.content();
      const $ = this.parseHTML(html);
      
      // 提取详细信息
      const title = this.cleanText($('[data-e2e="video-title"]').text());
      const description = this.cleanText($('[data-e2e="video-desc"]').text());
      const cover = $('[data-e2e="video-cover"] img').attr('src') || $('[data-e2e="video-cover"] img').attr('data-src') || '';
      
      // 提取作者信息
      const author = this.cleanText($('[data-e2e="video-author-name"]').text());
      const authorAvatar = $('[data-e2e="video-author-avatar"] img').attr('src') || '';
      
      // 提取互动数据
      const playCountText = this.cleanText($('[data-e2e="video-play-count"]').text());
      const playCount = this.parsePlayCount(playCountText);
      
      const likeCountText = this.cleanText($('[data-e2e="video-like-count"]').text());
      const likeCount = this.parsePlayCount(likeCountText);
      
      const commentCountText = this.cleanText($('[data-e2e="video-comment-count"]').text());
      const commentCount = this.parsePlayCount(commentCountText);
      
      // 构建演员信息（抖音主要是创作者）
      const actors: Partial<Celebrity>[] = [];
      if (author) {
        actors.push({
          name: author,
          avatar_url: authorAvatar,
          type: 'actor',
          // nationality: '中国', // 移除不存在的字段
          created_at: new Date().toISOString(),
          // updated_at: new Date().toISOString() // 移除不存在的字段
        });
      }
      
      // 提取标签
      const tags: string[] = ['短剧', '抖音'];
      $('[data-e2e="video-tag"]').each((index, element) => {
        const tag = this.cleanText($(element).text());
        if (tag && !tags.includes(tag)) tags.push(tag);
      });
      
      const detail = {
        title,
        description: description || `${author}的短剧作品`,
        cover_url: cover,
        score: 0, // 抖音没有评分系统
        play_count: playCount,
        source_url: detailUrl,
        tags: tags.join(','),
        actors,
        // platform: '抖音',
        status: 'completed',
        release_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        extra_data: {
          like_count: likeCount,
          comment_count: commentCount,
          author
        }
      };
      
      console.log(`[抖音] 成功获取短剧详情: ${title}`);
      return detail;
      
    } catch (error) {
      console.error(`[抖音] 获取短剧详情失败:`, error);
      throw error;
    }
  }
  
  /**
   * 解析播放量/点赞数文本
   */
  private parsePlayCount(text: string): number {
    if (!text) return 0;
    
    const cleanText = text.replace(/[^0-9.万亿千百十wkm]/gi, '');
    
    if (cleanText.includes('万') || cleanText.toLowerCase().includes('w')) {
      const num = parseFloat(cleanText.replace(/[万w]/gi, ''));
      return Math.floor(num * 10000);
    } else if (cleanText.includes('亿')) {
      const num = parseFloat(cleanText.replace('亿', ''));
      return Math.floor(num * 100000000);
    } else if (cleanText.toLowerCase().includes('k')) {
      const num = parseFloat(cleanText.replace(/k/gi, ''));
      return Math.floor(num * 1000);
    } else if (cleanText.toLowerCase().includes('m')) {
      const num = parseFloat(cleanText.replace(/m/gi, ''));
      return Math.floor(num * 1000000);
    } else {
      return parseInt(cleanText) || 0;
    }
  }
  
}