import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import * as cheerio from 'cheerio';
import axios, { AxiosRequestConfig } from 'axios';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * 爬虫基础类 - 提供反爬机制和通用功能
 */
export abstract class BaseCrawler {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected platformName: string;
  protected baseUrl: string;
  protected debugMode: boolean = false;
  
  // 配置文件路径
  private static CONFIG_FILE_PATH: string;
  
  static {
    // 初始化配置文件路径
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    BaseCrawler.CONFIG_FILE_PATH = path.join(__dirname, '../../config/app-config.json');
  }
  
  // 用户代理池 - 使用用户提供的真实Chrome 139版本
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
  ];
  protected requestDelay: { min: number; max: number };
  protected maxRetries: number;
  protected retryDelay: { min: number; max: number }; // 重试间隔
  
  constructor(platformName: string, baseUrl: string) {
    this.platformName = platformName;
    this.baseUrl = baseUrl;
    this.requestDelay = { min: 1000, max: 3000 };
    this.maxRetries = 3;
    this.retryDelay = { min: 5000, max: 10000 };
  }
  
  /**
   * 读取配置文件
   */
  protected async readConfig(): Promise<any> {
    try {
      const data = await fs.promises.readFile(BaseCrawler.CONFIG_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // 如果文件不存在或读取失败，返回默认配置
      return {
        crawlerConfig: {
          maxConcurrentTasks: 5,
          requestDelay: 1000,
          timeout: 30000,
          retryAttempts: 3,
          userAgent: 'Drama Crawler Bot 1.0',
          headless: true
        }
      };
    }
  }
  
  /**
   * 初始化浏览器
   */
  protected async initBrowser(): Promise<void> {
    if (this.browser) return;
    
    try {
      console.log(`[${this.platformName}] 正在启动浏览器...`);
      
      // 读取配置
      const config = await this.readConfig();
      const headless = config.crawler?.headless ?? true;
      
      console.log(`[${this.platformName}] 使用无头模式: ${headless}`);
      
      // 尝试使用更简单的配置来避免Windows下的启动问题
      this.browser = await chromium.launch({
        headless: headless, // 从配置中读取headless设置
        timeout: 60000, // 增加超时时间
        // protocolTimeout 在 Playwright 中不需要单独设置
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
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-back-forward-cache',
          '--disable-ipc-flooding-protection',
          '--window-size=1920,1080'
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        // dumpio选项在Playwright中不需要
      });
      
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: this.getRandomUserAgent(),
        // 添加更多真实浏览器特征
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
        permissions: ['geolocation'],
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        forcedColors: 'none'
      });
      
      this.page = await this.context.newPage();
      
      // User-Agent和视口已在context创建时设置
        console.log(`[${this.platformName}] 使用User-Agent: ${this.getRandomUserAgent()}`);
        console.log(`[${this.platformName}] 使用视口: 1920x1080`);
      
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
      
      // 设置额外的请求头 - 使用用户提供的真实浏览器请求头
      await this.page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'zh',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Priority': 'u=0, i',
        'Sec-CH-UA': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive'
      });
      
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
      
    } catch (error) {
      console.error(`[${this.platformName}] 浏览器初始化失败:`, error);
      throw error;
    }
  }
  
  /**
   * 关闭浏览器
   */
  protected async closeBrowser(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      console.log(`[${this.platformName}] 浏览器已关闭`);
    } catch (error) {
      console.error(`[${this.platformName}] 关闭浏览器失败:`, error);
    }
  }
  
  /**
   * 获取随机User-Agent
   */
  protected getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }
  
  /**
   * 随机延迟
   */
  protected async randomDelay(minMs?: number, maxMs?: number): Promise<void> {
    const min = minMs || this.requestDelay.min;
    const max = maxMs || this.requestDelay.max;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  /**
   * 安全的页面导航
   */
  protected async safeGoto(url: string, options?: any): Promise<void> {
    if (!this.page) {
      throw new Error('页面未初始化');
    }
    
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        await this.randomDelay();
        await this.page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 30000,
          ...options
        });
        return;
      } catch (error) {
        retries++;
        console.warn(`[${this.platformName}] 页面导航失败 (${retries}/${this.maxRetries}):`, error);
        if (retries >= this.maxRetries) {
          throw error;
        }
        await this.randomDelay();
      }
    }
  }
  
  /**
   * 安全的HTTP请求
   */
  protected async safeRequest(url: string, config?: AxiosRequestConfig): Promise<any> {
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        await this.randomDelay();
        
        const response = await axios({
          url,
          method: 'GET',
          timeout: 15000,
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            ...config?.headers
          },
          ...config
        });
        
        return response.data;
      } catch (error) {
        retries++;
        console.warn(`[${this.platformName}] HTTP请求失败 (${retries}/${this.maxRetries}):`, error);
        if (retries >= this.maxRetries) {
          throw error;
        }
        await this.randomDelay();
      }
    }
  }
  
  /**
   * 解析HTML内容
   */
  protected parseHTML(html: string): cheerio.CheerioAPI {
    return cheerio.load(html);
  }
  
  /**
   * 智能反爬检测
   */
  protected async detectAntiCrawler(): Promise<boolean> {
    if (!this.page) return;
    
    try {
      console.log(`[${this.platformName}] 开始反爬检测...`);
      
      // 检测常见的反爬元素
      const antiCrawlingSelectors = [
        '[id*="captcha"]',
        '[class*="captcha"]',
        '[id*="verify"]',
        '[class*="verify"]',
        '.slider-verify',
        '#nc_1_n1z',
        '.geetest_radar_tip',
        '[class*="robot"]',
        '[id*="robot"]',
        '.anti-bot',
        '.security-check',
        '[class*="challenge"]'
      ];
      
      let detectedCount = 0;
      for (const selector of antiCrawlingSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          detectedCount++;
          console.warn(`[${this.platformName}] 检测到反爬元素: ${selector}`);
        }
      }
      
      if (detectedCount > 0) {
        console.warn(`[${this.platformName}] 共检测到 ${detectedCount} 个反爬元素，等待处理...`);
        await this.randomDelay(3000, 8000);
        
        // 尝试刷新页面
        await this.page.reload({ waitUntil: 'networkidle', timeout: 30000 });
        await this.randomDelay(2000, 4000);
        return true;
      } else {
        console.log(`[${this.platformName}] 未检测到反爬元素`);
        return false;
      }
    } catch (error) {
      console.warn(`[${this.platformName}] 反爬检测失败:`, error);
      return false;
    }
  }
  
  /**
   * 生成随机字符串
   */
  protected generateRandomString(length: number = 8): string {
    return randomBytes(length).toString('hex').substring(0, length);
  }
  
  /**
   * 清理文本内容
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, '')
      .trim();
  }
  
  /**
   * 验证短剧数据是否有效
   */
  protected validateDramaData(drama: any): boolean {
    // 检查必需字段
    if (!drama.title || typeof drama.title !== 'string' || drama.title.trim().length === 0) {
      console.warn(`[${this.platformName}] 无效的短剧标题:`, drama.title);
      return false;
    }
    
    // 检查标题长度是否合理
    if (drama.title.length < 2 || drama.title.length > 100) {
      console.warn(`[${this.platformName}] 短剧标题长度异常:`, drama.title);
      return false;
    }
    
    // 检查链接是否有效
    if (drama.link && typeof drama.link === 'string') {
      try {
        new URL(drama.link);
      } catch {
        console.warn(`[${this.platformName}] 无效的短剧链接:`, drama.link);
        return false;
      }
    }
    
    // 检查是否包含明显的测试数据标识
    const testKeywords = ['测试', 'test', 'demo', '示例', 'example', 'mock', '模拟'];
    const titleLower = drama.title.toLowerCase();
    for (const keyword of testKeywords) {
      if (titleLower.includes(keyword)) {
        console.warn(`[${this.platformName}] 疑似测试数据:`, drama.title);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 保存调试信息
   */
  protected async saveDebugInfo(type: string, data: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-${this.platformName}-${type}-${timestamp}.json`;
      const debugPath = path.join(process.cwd(), 'debug', filename);
      
      // 确保调试目录存在
      const debugDir = path.dirname(debugPath);
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      await fs.promises.writeFile(debugPath, JSON.stringify(data, null, 2));
      console.log(`[${this.platformName}] 调试信息已保存: ${filename}`);
    } catch (error) {
      console.error(`[${this.platformName}] 保存调试信息失败:`, error);
    }
  }
  
  /**
   * 截取页面截图用于调试
   */
  protected async takeScreenshot(name: string): Promise<string | null> {
    if (!this.page) return null;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${this.platformName}-${name}-${timestamp}.png`;
      const screenshotPath = path.join(process.cwd(), 'debug', filename);
      
      // 确保调试目录存在
      const debugDir = path.dirname(screenshotPath);
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[${this.platformName}] 页面截图已保存: ${filename}`);
      return filename;
    } catch (error) {
      console.error(`[${this.platformName}] 截图失败:`, error);
      return null;
    }
  }
  
  /**
   * 保存截图用于调试（takeScreenshot的别名）
   */
  protected async saveScreenshot(name: string): Promise<string | null> {
    return await this.takeScreenshot(name);
  }

  /**
   * 保存页面HTML用于调试
   */
  protected async savePageHTML(name: string): Promise<string | null> {
    if (!this.page) return null;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `html-${this.platformName}-${name}-${timestamp}.html`;
      const htmlPath = path.join(process.cwd(), 'debug', filename);
      
      // 确保调试目录存在
      const debugDir = path.dirname(htmlPath);
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      const html = await this.page.content();
      await fs.promises.writeFile(htmlPath, html);
      console.log(`[${this.platformName}] 页面HTML已保存: ${filename}`);
      return filename;
    } catch (error) {
      console.error(`[${this.platformName}] 保存HTML失败:`, error);
      return null;
    }
  }
  
  /**
   * 抽象方法 - 获取短剧列表
   */
  abstract getDramaList(options?: any): Promise<any[]>;
  
  /**
   * 抽象方法 - 获取排行榜
   */
  abstract getRankings(type: string, options?: any): Promise<any[]>;
  
  /**
   * 抽象方法 - 获取短剧详情
   */
  abstract getDramaDetail(dramaId: string, options?: any): Promise<any>;
  
  /**
   * 模拟人类滚动行为
   */
  protected async simulateHumanScroll(): Promise<void> {
    if (!this.page) return;
    
    try {
      console.log(`[${this.platformName}] 开始模拟人类滚动行为...`);
      
      // 获取页面高度
      const pageHeight = await this.page.evaluate(() => {
        return Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        );
      });
      
      const viewportHeight = await this.page.evaluate(() => window.innerHeight);
      const scrollSteps = Math.min(8, Math.ceil(pageHeight / viewportHeight) + 2);
      
      console.log(`[${this.platformName}] 页面高度: ${pageHeight}px, 视口高度: ${viewportHeight}px, 滚动步数: ${scrollSteps}`);
      
      for (let i = 0; i < scrollSteps; i++) {
        // 随机滚动距离，模拟真实用户行为
        const scrollDistance = 200 + Math.floor(Math.random() * 600); // 200-800px
        const scrollSpeed = 50 + Math.floor(Math.random() * 100); // 滚动速度
        
        await this.page.evaluate(({ scrollDistance, scrollSpeed }) => {
          const startY = window.pageYOffset;
          const targetY = startY + scrollDistance;
          const step = scrollDistance / scrollSpeed;
          let currentY = startY;
          
          const scroll = () => {
            currentY += step;
            if (currentY < targetY) {
              window.scrollTo(0, currentY);
              requestAnimationFrame(scroll);
            } else {
              window.scrollTo(0, targetY);
            }
          };
          scroll();
        }, { scrollDistance, scrollSpeed });
        
        // 随机停顿，模拟阅读时间
        await this.randomDelay(1000, 3000);
        
        // 偶尔向上滚动一点，模拟真实用户行为
        if (Math.random() < 0.3) {
          const backScroll = 50 + Math.floor(Math.random() * 150);
          await this.page.evaluate((distance) => {
            window.scrollBy(0, -distance);
          }, backScroll);
          await this.randomDelay(500, 1500);
        }
      }
      
      // 滚动到顶部
      await this.page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      
      await this.randomDelay(1000, 2000);
      console.log(`[${this.platformName}] 滚动行为模拟完成`);
    } catch (error) {
      console.warn(`[${this.platformName}] 模拟滚动失败:`, error);
    }
  }
  
  /**
   * 模拟鼠标移动
   */
  protected async simulateMouseMovement(): Promise<void> {
    if (!this.page) return;
    
    try {
      console.log(`[${this.platformName}] 开始模拟鼠标移动...`);
      
      const viewport = this.page.viewportSize();
      if (!viewport) return;
      
      const { width, height } = viewport;
      const moveCount = 3 + Math.floor(Math.random() * 5); // 3-7次移动
      
      for (let i = 0; i < moveCount; i++) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        
        await this.page.mouse.move(x, y);
        await this.randomDelay(200, 800);
        
        // 偶尔点击一下（但不在链接上）
        if (Math.random() < 0.2) {
          await this.page.mouse.click(x, y);
          await this.randomDelay(300, 1000);
        }
      }
      
      console.log(`[${this.platformName}] 鼠标移动模拟完成`);
    } catch (error) {
      console.warn(`[${this.platformName}] 模拟鼠标移动失败:`, error);
    }
  }
  
  /**
   * 等待页面完全加载
   */
  protected async waitForPageLoad(): Promise<void> {
    if (!this.page) return;
    
    try {
      console.log(`[${this.platformName}] 等待页面完全加载...`);
      
      // 等待网络空闲
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // 等待DOM内容加载
      await this.page.waitForFunction(() => {
        return document.readyState === 'complete';
      }, { timeout: 15000 });
      
      // 额外等待，确保动态内容加载
      await this.randomDelay(2000, 4000);
      
      console.log(`[${this.platformName}] 页面加载完成`);
    } catch (error) {
      console.warn(`[${this.platformName}] 等待页面加载超时:`, error);
    }
  }
  
  /**
   * 带重试机制的安全执行方法
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[${this.platformName}] 执行 ${operationName} - 尝试 ${attempt}/${maxRetries}`);
        
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`[${this.platformName}] ${operationName} 在第 ${attempt} 次尝试成功`);
        }
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        console.warn(`[${this.platformName}] ${operationName} 第 ${attempt} 次尝试失败:`, error.message);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          const delay = Math.random() * (this.retryDelay.max - this.retryDelay.min) + this.retryDelay.min;
          console.log(`[${this.platformName}] 等待 ${Math.round(delay)}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // 重试前检测反爬机制
          if (this.page && await this.detectAntiCrawler()) {
            console.log(`[${this.platformName}] 检测到反爬机制，增加额外延迟`);
            await this.randomDelay(3000, 8000);
          }
        }
      }
    }
    
    // 所有重试都失败了
    console.error(`[${this.platformName}] ${operationName} 在 ${maxRetries} 次尝试后仍然失败`);
    throw lastError || new Error(`${operationName} 执行失败`);
  }
  
  /**
   * 安全导航到页面（带重试）
   */
  protected async safeGotoWithRetry(url: string): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.safeGoto(url);
    }, `导航到 ${url}`);
  }
  
  /**
   * 判断是否为短剧内容
   */
  protected isShortDrama(title: string, description?: string): boolean {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    // 短剧关键词
    const shortDramaKeywords = [
      '短剧', '微剧', '竖屏剧', '小剧场', '迷你剧',
      '网络短剧', '竖屏短剧', '微短剧', '小短剧',
      '都市短剧', '古装短剧', '现代短剧', '甜宠短剧',
      '霸总', '重生', '穿越', '逆袭', '复仇',
      '豪门', '契约', '闪婚', '暖婚', '甜妻',
      '神医', '战神', '龙王', '赘婿', '神豪'
    ];
    
    // 长剧关键词（需要排除）
    const longDramaKeywords = [
      '电视剧', '连续剧', '大剧', '年代剧', '历史剧',
      '古装大剧', '现代都市剧', '家庭伦理剧',
      '抗战剧', '谍战剧', '宫廷剧', '武侠剧',
      '仙侠剧', '玄幻剧', '科幻剧', '悬疑剧'
    ];
    
    // 检查是否包含长剧关键词
    const hasLongDramaKeywords = longDramaKeywords.some(keyword => text.includes(keyword));
    if (hasLongDramaKeywords) {
      return false;
    }
    
    // 检查是否包含短剧关键词
    const hasShortDramaKeywords = shortDramaKeywords.some(keyword => text.includes(keyword));
    if (hasShortDramaKeywords) {
      return true;
    }
    
    // 基于标题长度判断（短剧标题通常较短且有特定模式）
    if (title.length <= 10) {
      // 检查是否包含典型的短剧标题模式
      const shortDramaPatterns = [
        /^.{1,6}(总裁|老公|老婆|夫人|先生|小姐)$/,
        /^(重生|穿越|逆袭|复仇).{1,8}$/,
        /^.{1,6}(归来|回归|重来)$/,
        /^(霸道|冷酷|腹黑|温柔).{1,8}$/,
        /^.{1,6}(契约|闪婚|暖婚|甜婚)$/
      ];
      
      return shortDramaPatterns.some(pattern => pattern.test(title));
    }
    
    // 默认情况下，如果没有明确的长剧标识，且标题不是很长，可能是短剧
    return title.length <= 15;
  }
  
  /**
   * 关闭爬虫（公共方法）
   */
  async close(): Promise<void> {
    await this.closeBrowser();
  }
  
  /**
   * 执行爬虫任务
   */
  async execute(taskType: string, options?: any): Promise<any> {
    try {
      await this.initBrowser();
      
      let result;
      switch (taskType) {
        case 'drama_list':
          result = await this.getDramaList(options);
          break;
        case 'ranking':
          result = await this.getRankings(options?.type || 'hot', options);
          break;
        case 'detail':
          result = await this.getDramaDetail(options?.dramaId, options);
          break;
        default:
          throw new Error(`不支持的任务类型: ${taskType}`);
      }
      
      return result;
    } catch (error) {
      console.error(`[${this.platformName}] 爬虫任务执行失败:`, error);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }
}