import { Router } from 'express';
import { YoukuCrawler } from '../crawler/youku';
import { TencentCrawler } from '../crawler/tencent';
import { IqiyiCrawler } from '../crawler/iqiyi';
import { DouyinCrawler } from '../crawler/douyin';
import { BaseCrawler } from '../crawler/base';

const router: Router = Router();

/**
 * 测试单个平台爬虫
 */
router.get('/test/:platform', async (req, res) => {
  const { platform } = req.params;
  const { debug = 'true', limit = '5' } = req.query;
  
  try {
    let crawler: BaseCrawler;
    
    // 根据平台创建对应的爬虫实例
    switch (platform.toLowerCase()) {
      case 'youku':
        crawler = new YoukuCrawler();
        break;
      case 'tencent':
        crawler = new TencentCrawler();
        break;
      case 'iqiyi':
        crawler = new IqiyiCrawler();
        break;
      case 'douyin':
        crawler = new DouyinCrawler();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: '不支持的平台',
          supportedPlatforms: ['youku', 'tencent', 'iqiyi', 'douyin']
        });
    }
    
    console.log(`[测试API] 开始测试 ${platform} 爬虫`);
    const startTime = Date.now();
    
    // 初始化爬虫
    await (crawler as any).initBrowser();
    
    let result: any = {
      success: false,
      platform,
      timestamp: new Date().toISOString(),
      executionTime: 0,
      data: [],
      debugInfo: {
        browserInfo: {},
        pageInfo: {},
        selectors: [],
        errors: []
      }
    };
    
    try {
      // 获取短剧列表
      const dramas = await crawler.getDramaList({ 
        pageSize: parseInt(limit as string) 
      });
      
      const endTime = Date.now();
      result.executionTime = endTime - startTime;
      result.success = true;
      result.data = dramas;
      
      // 如果启用调试模式，收集额外信息
      if (debug === 'true') {
        const page = (crawler as any).page;
        if (page) {
          try {
            result.debugInfo.pageInfo = {
              url: page.url(),
              title: await page.title(),
              viewport: await page.viewportSize(),
              userAgent: await page.evaluate(() => navigator.userAgent)
            };
            
            // 获取页面性能信息
            const performanceMetrics = await page.evaluate(() => {
              const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
              return {
                loadTime: navigation.loadEventEnd - navigation.loadEventStart,
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                responseTime: navigation.responseEnd - navigation.requestStart
              };
            });
            result.debugInfo.performance = performanceMetrics;
            
            // 检查页面元素数量
            const elementCounts = await page.evaluate(() => {
              return {
                totalElements: document.querySelectorAll('*').length,
                images: document.querySelectorAll('img').length,
                links: document.querySelectorAll('a').length,
                videos: document.querySelectorAll('video').length,
                scripts: document.querySelectorAll('script').length
              };
            });
            result.debugInfo.elementCounts = elementCounts;
            
          } catch (debugError) {
            result.debugInfo.errors.push(`调试信息收集失败: ${debugError}`);
          }
        }
      }
      
    } catch (crawlerError: any) {
      const endTime = Date.now();
      result.executionTime = endTime - startTime;
      result.success = false;
      result.error = crawlerError.message;
      result.debugInfo.errors.push(crawlerError.message);
      
      // 尝试获取页面信息用于调试
      const page = (crawler as any).page;
      if (page && debug === 'true') {
        try {
          result.debugInfo.pageInfo = {
            url: page.url(),
            title: await page.title(),
            content: (await page.content()).substring(0, 1000) + '...'
          };
        } catch (e) {
          result.debugInfo.errors.push(`无法获取页面信息: ${e}`);
        }
      }
    } finally {
      // 清理资源
      await crawler.close();
    }
    
    console.log(`[测试API] ${platform} 爬虫测试完成，耗时: ${result.executionTime}ms`);
    res.json(result);
    
  } catch (error: any) {
    console.error(`[测试API] ${platform} 爬虫测试失败:`, error);
    res.status(500).json({
      success: false,
      platform,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 测试所有平台爬虫
 */
router.get('/test-all', async (req, res) => {
  const { debug = 'false', limit = '3' } = req.query;
  const platforms = ['youku', 'tencent', 'iqiyi', 'douyin'];
  
  const results: any[] = [];
  const startTime = Date.now();
  
  console.log('[测试API] 开始测试所有平台爬虫');
  
  for (const platform of platforms) {
    try {
      console.log(`[测试API] 测试 ${platform} 平台...`);
      
      // 调用单个平台测试接口
      const response = await fetch(`http://localhost:3001/api/test-crawler/test/${platform}?debug=${debug}&limit=${limit}`);
      const result = await response.json();
      
      results.push({
        platform,
        ...result
      });
      
    } catch (error: any) {
      console.error(`[测试API] ${platform} 平台测试失败:`, error);
      results.push({
        platform,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    // 平台间添加延迟，避免并发问题
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  // 统计结果
  const summary = {
    totalPlatforms: platforms.length,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length,
    totalExecutionTime: totalTime,
    averageExecutionTime: Math.round(totalTime / platforms.length)
  };
  
  console.log('[测试API] 所有平台测试完成:', summary);
  
  res.json({
    success: true,
    summary,
    results,
    timestamp: new Date().toISOString()
  });
});

/**
 * 获取爬虫调试信息
 */
router.get('/debug/:platform', async (req, res) => {
  const { platform } = req.params;
  
  try {
    // 这里可以读取保存的调试文件
    const debugPath = `./debug/${platform}`;
    
    res.json({
      success: true,
      platform,
      message: '调试信息接口，可以扩展读取保存的调试文件',
      debugPath,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 健康检查接口
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '爬虫测试API运行正常',
    timestamp: new Date().toISOString(),
    supportedPlatforms: ['youku', 'tencent', 'iqiyi', 'douyin']
  });
});

export default router;