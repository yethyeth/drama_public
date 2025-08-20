import express from 'express';
import { CrawlerManager } from '../crawler';
import fs from 'fs';
import path from 'path';

const router: express.Router = express.Router();
const crawlerManager = new CrawlerManager();

/**
 * 详细调试单个平台爬虫 - 增强版
 */
router.post('/debug-enhanced/:platform', async (req, res) => {
  const { platform } = req.params;
  const { type = 'drama_list', saveHtml = true, takeScreenshot = true } = req.body;
  
  try {
    console.log(`[增强调试] 开始详细调试 ${platform} 平台的 ${type} 爬虫`);
    
    const startTime = Date.now();
    const debugInfo: any = {
      platform,
      type,
      startTime: new Date().toISOString(),
      logs: [],
      errors: [],
      warnings: [],
      result: null,
      duration: 0,
      pageInfo: null,
      selectors: [],
      foundItems: false,
      dramasCount: 0,
      htmlAnalysis: null
    };
    
    // 重写console方法来捕获所有日志
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      const message = args.join(' ');
      debugInfo.logs.push(`[LOG] ${new Date().toISOString()}: ${message}`);
      originalLog(...args);
    };
    
    console.error = (...args) => {
      const message = args.join(' ');
      debugInfo.errors.push(`[ERROR] ${new Date().toISOString()}: ${message}`);
      originalError(...args);
    };
    
    console.warn = (...args) => {
      const message = args.join(' ');
      debugInfo.warnings.push(`[WARN] ${new Date().toISOString()}: ${message}`);
      originalWarn(...args);
    };
    
    try {
      let result;
      
      if (type === 'drama_list') {
        result = await crawlerManager.getDramaList({ platforms: [platform], page: 1, pageSize: 10 });
      } else if (type === 'ranking') {
        result = await crawlerManager.getRankings({ platforms: [platform], limit: 10 });
      } else {
        throw new Error(`不支持的调试类型: ${type}`);
      }
      
      debugInfo.result = result;
      debugInfo.dramasCount = result?.data?.length || 0;
      debugInfo.foundItems = debugInfo.dramasCount > 0;
      
      // 获取详细页面信息
      const crawler = crawlerManager.getCrawler(platform);
      if (crawler && (crawler as any).page) {
          debugInfo.pageInfo = {
            url: (crawler as any).page.url(),
            title: await (crawler as any).page.title().catch(() => 'N/A'),
            userAgent: await (crawler as any).page.evaluate(() => navigator.userAgent).catch(() => 'N/A'),
            viewport: await (crawler as any).page.viewportSize().catch(() => null),
            cookies: await (crawler as any).page.context().cookies().catch(() => [])
        };
        
        // 分析页面内容
        try {
          const html = await (crawler as any).page.content();
          debugInfo.htmlAnalysis = {
            length: html.length,
            hasJavaScript: html.includes('<script'),
            hasReactApp: html.includes('react') || html.includes('React'),
            hasVueApp: html.includes('vue') || html.includes('Vue'),
            hasAngularApp: html.includes('angular') || html.includes('Angular'),
            containsVideoKeywords: /视频|短剧|电视剧|影视|drama|video/i.test(html),
            containsDataAttributes: /data-[a-z-]+=/i.test(html),
            scriptTags: (html.match(/<script/g) || []).length,
            styleTags: (html.match(/<style/g) || []).length,
            linkTags: (html.match(/<link/g) || []).length
          };
          
          // 保存HTML文件
          if (saveHtml) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const status = debugInfo.foundItems ? 'success' : 'failed';
            const htmlPath = path.join(process.cwd(), 'debug', `html-${platform}-${type}-${status}-${timestamp}.html`);
            
            const debugDir = path.dirname(htmlPath);
            if (!fs.existsSync(debugDir)) {
              fs.mkdirSync(debugDir, { recursive: true });
            }
            
            fs.writeFileSync(htmlPath, html, 'utf8');
            debugInfo.htmlPath = htmlPath;
            debugInfo.logs.push(`[DEBUG] 页面HTML已保存到: ${htmlPath}`);
          }
        } catch (error) {
          debugInfo.errors.push(`[ERROR] HTML分析失败: ${error}`);
        }
        
        // 截图
        if (takeScreenshot) {
          try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const status = debugInfo.foundItems ? 'success' : 'failed';
            const screenshotPath = path.join(process.cwd(), 'debug', `screenshot-${platform}-${type}-${status}-${timestamp}.png`);
            
            const debugDir = path.dirname(screenshotPath);
            if (!fs.existsSync(debugDir)) {
              fs.mkdirSync(debugDir, { recursive: true });
            }
            
            await (crawler as any).page.screenshot({ path: screenshotPath + '.png', fullPage: true });
            debugInfo.screenshotPath = screenshotPath;
            debugInfo.logs.push(`[DEBUG] 页面截图已保存到: ${screenshotPath}`);
          } catch (error) {
            debugInfo.errors.push(`[ERROR] 截图失败: ${error}`);
          }
        }
        
        // 测试选择器
        try {
          const selectorTests = [
            // 通用选择器
            '.video-item', '.drama-item', '.movie-item', '.content-item',
            '.list-item', '.card-item', '.grid-item', '.item',
            '[data-video-id]', '[data-item-id]', '[data-aweme-id]',
            // 平台特有选择器
            ...(platform === 'youku' ? ['.p-thumb', '.p-link', '.video-layer'] : []),
            ...(platform === 'tencent' ? ['.figure_title', '.list_item', '.mod_figure'] : []),
            ...(platform === 'iqiyi' ? ['.wrapper-piclist li', '.site-piclist li', '.qy-mod-poster li'] : []),
            ...(platform === 'douyin' ? ['[data-e2e="search-result"]', '[data-e2e="video-feed-item"]', '.aweme-video-item'] : [])
          ];
          
          for (const selector of selectorTests) {
            try {
              const elements = await (crawler as any).page.$$(selector);
              debugInfo.selectors.push({
                selector,
                count: elements.length,
                found: elements.length > 0
              });
            } catch (e) {
              debugInfo.selectors.push({
                selector,
                count: 0,
                found: false,
                error: e.message
              });
            }
          }
        } catch (error) {
          debugInfo.errors.push(`[ERROR] 选择器测试失败: ${error}`);
        }
      }
      
    } catch (error) {
      debugInfo.errors.push(`[CRAWLER_ERROR] ${error}`);
      debugInfo.result = { success: false, error: error.message };
    } finally {
      // 恢复原始console方法
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      
      debugInfo.duration = Date.now() - startTime;
      debugInfo.endTime = new Date().toISOString();
    }
    
    // 保存调试信息到JSON文件
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const status = debugInfo.foundItems ? 'success' : 'failed';
      const debugPath = path.join(process.cwd(), 'debug', `debug-${platform}-${type}-${status}-${timestamp}.json`);
      
      const debugDir = path.dirname(debugPath);
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      fs.writeFileSync(debugPath, JSON.stringify(debugInfo, null, 2), 'utf8');
      debugInfo.debugPath = debugPath;
    } catch (error) {
      debugInfo.errors.push(`[ERROR] 保存调试信息失败: ${error}`);
    }
    
    res.json({
      success: true,
      debug: debugInfo,
      summary: {
        platform,
        type,
        success: debugInfo.foundItems,
        itemsFound: debugInfo.dramasCount,
        duration: debugInfo.duration,
        errorCount: debugInfo.errors.length,
        warningCount: debugInfo.warnings.length,
        logCount: debugInfo.logs.length
      }
    });
    
  } catch (error) {
    console.error(`[增强调试] ${platform} 平台调试失败:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      platform,
      type
    });
  }
});

/**
 * 调试单个平台爬虫
 */
router.post('/debug/:platform', async (req, res) => {
  const { platform } = req.params;
  const { type = 'drama_list', saveHtml = false, takeScreenshot = false } = req.body;
  
  try {
    console.log(`[调试] 开始调试 ${platform} 平台的 ${type} 爬虫`);
    
    const startTime = Date.now();
    const debugInfo: any = {
      platform,
      type,
      startTime: new Date().toISOString(),
      logs: [],
      errors: [],
      result: null,
      duration: 0,
      pageInfo: null
    };
    
    // 重写console.log来捕获日志
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      debugInfo.logs.push(`[LOG] ${new Date().toISOString()}: ${args.join(' ')}`);
      originalLog(...args);
    };
    
    console.error = (...args) => {
      debugInfo.errors.push(`[ERROR] ${new Date().toISOString()}: ${args.join(' ')}`);
      originalError(...args);
    };
    
    console.warn = (...args) => {
      debugInfo.logs.push(`[WARN] ${new Date().toISOString()}: ${args.join(' ')}`);
      originalWarn(...args);
    };
    
    try {
      let result;
      
      if (type === 'drama_list') {
        result = await crawlerManager.getDramaList({ platforms: [platform], page: 1, pageSize: 5 });
      } else if (type === 'ranking') {
        result = await crawlerManager.getRankings({ platforms: [platform], limit: 5 });
      } else {
        throw new Error(`不支持的调试类型: ${type}`);
      }
      
      debugInfo.result = result;
      
      // 获取页面信息
      const crawler = crawlerManager.getCrawler(platform);
      if (crawler && (crawler as any).page) {
          debugInfo.pageInfo = {
            url: (crawler as any).page.url(),
            title: await (crawler as any).page.title().catch(() => 'N/A'),
            userAgent: await (crawler as any).page.evaluate(() => navigator.userAgent).catch(() => 'N/A')
        };
        
        // 保存页面HTML
        if (saveHtml) {
          try {
            const html = await (crawler as any).page.content();
            const htmlPath = path.join(process.cwd(), 'debug', `${platform}-${type}-${Date.now()}.html`);
            
            // 确保debug目录存在
            const debugDir = path.dirname(htmlPath);
            if (!fs.existsSync(debugDir)) {
              fs.mkdirSync(debugDir, { recursive: true });
            }
            
            fs.writeFileSync(htmlPath, html, 'utf8');
            debugInfo.htmlPath = htmlPath;
            debugInfo.logs.push(`[DEBUG] 页面HTML已保存到: ${htmlPath}`);
          } catch (error) {
            debugInfo.errors.push(`[ERROR] 保存HTML失败: ${error}`);
          }
        }
        
        // 截图
        if (takeScreenshot) {
          try {
            const screenshotPath = path.join(process.cwd(), 'debug', `${platform}-${type}-${Date.now()}.png`);
            
            // 确保debug目录存在
            const debugDir = path.dirname(screenshotPath);
            if (!fs.existsSync(debugDir)) {
              fs.mkdirSync(debugDir, { recursive: true });
            }
            
            await (crawler as any).page.screenshot({ path: screenshotPath + '.png', fullPage: true });
            debugInfo.screenshotPath = screenshotPath;
            debugInfo.logs.push(`[DEBUG] 页面截图已保存到: ${screenshotPath}`);
          } catch (error) {
            debugInfo.errors.push(`[ERROR] 截图失败: ${error}`);
          }
        }
      }
      
    } catch (error) {
      debugInfo.errors.push(`[CRAWLER_ERROR] ${error}`);
      debugInfo.result = { success: false, error: error.message };
    } finally {
      // 恢复原始console方法
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      
      debugInfo.duration = Date.now() - startTime;
      debugInfo.endTime = new Date().toISOString();
    }
    
    // 数据验证
    if (debugInfo.result && debugInfo.result.success && debugInfo.result.data) {
      const data = debugInfo.result.data;
      debugInfo.dataValidation = {
        totalItems: data.length,
        validItems: 0,
        invalidItems: 0,
        issues: []
      };
      
      data.forEach((item: any, index: number) => {
        const issues: string[] = [];
        
        if (!item.title || item.title.length < 2) {
          issues.push('标题无效或过短');
        }
        
        if (!item.source_url || !item.source_url.startsWith('http')) {
          issues.push('source_url无效');
        }
        
        if (!item.platform) {
          issues.push('平台信息缺失');
        }
        
        if (issues.length > 0) {
          debugInfo.dataValidation.invalidItems++;
          debugInfo.dataValidation.issues.push({
            index,
            item: { title: item.title, source_url: item.source_url },
            issues
          });
        } else {
          debugInfo.dataValidation.validItems++;
        }
      });
    }
    
    res.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error(`[调试] ${platform} 平台调试失败:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      platform,
      type
    });
  }
});

/**
 * 批量调试所有平台
 */
router.post('/debug-all', async (req, res) => {
  const { type = 'drama_list', saveHtml = false, takeScreenshot = false } = req.body;
  const platforms = ['youku', 'tencent', 'douyin', 'iqiyi'];
  
  const results: any = {};
  
  for (const platform of platforms) {
    try {
      console.log(`[批量调试] 开始调试 ${platform}`);
      
      // 调用单个平台调试
      const debugResult = await new Promise((resolve, reject) => {
        const mockReq = {
          params: { platform },
          body: { type, saveHtml, takeScreenshot }
        };
        
        const mockRes = {
          json: (data: any) => resolve(data),
          status: (code: number) => ({
            json: (data: any) => reject(new Error(`HTTP ${code}: ${JSON.stringify(data)}`))
          })
        };
        
        // 这里需要重新实现调试逻辑，因为不能直接调用路由处理器
        // 简化版本：直接调用爬虫
        (async () => {
          try {
            let result;
            if (type === 'drama_list') {
              result = await crawlerManager.getDramaList({ platforms: [platform], page: 1, pageSize: 3 });
            } else {
              result = await crawlerManager.getRankings({ platforms: [platform], limit: 3 });
            }
            resolve({ success: true, result });
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        })();
      });
      
      results[platform] = debugResult;
      
    } catch (error) {
      results[platform] = {
        success: false,
        error: error.message
      };
    }
    
    // 平台间添加延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  res.json({
    success: true,
    results,
    summary: {
      total: platforms.length,
      successful: Object.values(results).filter((r: any) => r.success).length,
      failed: Object.values(results).filter((r: any) => !r.success).length
    }
  });
});

/**
 * 测试单个平台爬虫 (GET方法)
 */
router.get('/test/:platform', async (req, res) => {
  const { platform } = req.params;
  const { type = 'drama_list', limit = 5 } = req.query;
  
  try {
    console.log(`[测试] 开始测试 ${platform} 平台的 ${type} 爬虫`);
    
    const startTime = Date.now();
    let result;
    
    if (type === 'drama_list') {
      result = await crawlerManager.getDramaList({ platforms: [platform], page: 1, pageSize: parseInt(limit as string) });
    } else if (type === 'ranking') {
      result = await crawlerManager.getRankings({ platforms: [platform], limit: parseInt(limit as string) });
    } else {
      throw new Error(`不支持的测试类型: ${type}`);
    }
    
    const duration = Date.now() - startTime;
    
    // 简单的数据验证
    let dataValidation = null;
    if (result && result.success && result.data) {
      const data = result.data;
      dataValidation = {
        totalItems: data.length,
        validItems: data.filter((item: any) => 
          item.title && item.title.length > 1 && 
          item.source_url && item.source_url.startsWith('http')
        ).length,
        sampleData: data.slice(0, 2) // 返回前2条数据作为样本
      };
    }
    
    res.json({
      success: true,
      platform,
      type,
      duration: `${duration}ms`,
      result,
      dataValidation
    });
    
  } catch (error) {
    console.error(`[测试] ${platform} 平台测试失败:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      platform,
      type
    });
  }
});

/**
 * 获取调试文件列表
 */
router.get('/debug-files', (req, res) => {
  try {
    const debugDir = path.join(process.cwd(), 'debug');
    
    if (!fs.existsSync(debugDir)) {
      return res.json({ success: true, files: [] });
    }
    
    const files = fs.readdirSync(debugDir)
      .filter(file => file.endsWith('.html') || file.endsWith('.png'))
      .map(file => ({
        name: file,
        path: path.join(debugDir, file),
        size: fs.statSync(path.join(debugDir, file)).size,
        created: fs.statSync(path.join(debugDir, file)).ctime
      }))
      .sort((a, b) => b.created.getTime() - a.created.getTime());
    
    res.json({ success: true, files });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;