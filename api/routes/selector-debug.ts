import express from 'express';
import { CrawlerManager } from '../crawler';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const router: express.Router = express.Router();
const crawlerManager = new CrawlerManager();

/**
 * 选择器调试和页面分析工具
 */
router.post('/analyze/:platform', async (req, res) => {
  const { platform } = req.params;
  const { url, customSelectors = [] } = req.body;
  
  try {
    console.log(`[选择器分析] 开始分析 ${platform} 平台页面`);
    
    const crawler = crawlerManager.getCrawler(platform);
    if (!crawler) {
      return res.status(400).json({ success: false, error: '不支持的平台' });
    }
    
    // 初始化浏览器 - 使用反射访问protected方法
    await (crawler as any).initBrowser();
    
    const analysisResult: any = {
      platform,
      url: url || (crawler as any).baseUrl,
      timestamp: new Date().toISOString(),
      pageInfo: {},
      selectorAnalysis: [],
      contentAnalysis: {},
      recommendations: []
    };
    
    // 访问页面
    const targetUrl = url || getDefaultUrl(platform);
    await (crawler as any).safeGoto(targetUrl);
    
    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // 获取页面信息
    const page = (crawler as any).page;
    let viewport = { width: 1920, height: 1080 };
    try {
      // 尝试获取视口大小
      const viewportSize = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight
      }));
      viewport = viewportSize;
    } catch (error) {
      console.warn('获取视口大小失败，使用默认值');
    }
    
    analysisResult.pageInfo = {
      finalUrl: page.url(),
      title: await page.title(),
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: viewport
    };
    
    // 获取页面HTML
    const html = await (crawler as any).page.content();
    const $ = cheerio.load(html);
    
    // 内容分析
    analysisResult.contentAnalysis = {
      htmlLength: html.length,
      totalElements: $('*').length,
      hasJavaScript: html.includes('<script'),
      hasReactApp: /react|React/i.test(html),
      hasVueApp: /vue|Vue/i.test(html),
      hasAngularApp: /angular|Angular/i.test(html),
      containsVideoKeywords: /视频|短剧|电视剧|影视|drama|video|movie/i.test(html),
      containsDataAttributes: /data-[a-z-]+=/i.test(html),
      scriptTags: (html.match(/<script/g) || []).length,
      styleTags: (html.match(/<style/g) || []).length,
      linkTags: (html.match(/<link/g) || []).length,
      imageCount: $('img').length,
      linkCount: $('a').length
    };
    
    // 定义要测试的选择器
    const testSelectors = [
      // 通用视频/内容选择器
      '.video-item', '.drama-item', '.movie-item', '.content-item',
      '.list-item', '.card-item', '.grid-item', '.item',
      '.video-card', '.drama-card', '.movie-card', '.content-card',
      
      // 数据属性选择器
      '[data-video-id]', '[data-item-id]', '[data-aweme-id]',
      '[data-vid]', '[data-album-id]', '[data-movie-id]',
      '[data-spm-anchor-id]', '[data-spm]',
      
      // 平台特有选择器
      ...(platform === 'youku' ? [
        '.p-thumb', '.p-link', '.video-layer', '.yk-col4',
        '.yk-pack', '.pack-ykpack4', '.yk-pack4',
        '[data-spm-anchor-id]', '.video-box'
      ] : []),
      
      ...(platform === 'tencent' ? [
        '.figure_title', '.list_item', '.mod_figure',
        '.figure_pic', '.mod_list_pic', '.list_pic'
      ] : []),
      
      ...(platform === 'iqiyi' ? [
        '.wrapper-piclist li', '.site-piclist li', '.qy-mod-poster li',
        '.mod-poster li', '.album-item', '.pic-item'
      ] : []),
      
      ...(platform === 'douyin' ? [
        '[data-e2e="search-result"]', '[data-e2e="video-feed-item"]',
        '.aweme-video-item', '.video-item'
      ] : []),
      
      // 自定义选择器
      ...customSelectors
    ];
    
    // 测试每个选择器
    for (const selector of testSelectors) {
      try {
        const elements = $(selector);
        const count = elements.length;
        
        const selectorResult: any = {
          selector,
          count,
          found: count > 0,
          samples: []
        };
        
        // 如果找到元素，分析前几个样本
        if (count > 0) {
          elements.slice(0, 3).each((index, element) => {
            const $el = $(element);
            
            // 提取可能的标题
            const possibleTitles = [
              $el.find('.title').text(),
              $el.find('h1, h2, h3, h4, h5, h6').text(),
              $el.find('[title]').attr('title'),
              $el.find('img').attr('alt'),
              $el.text().substring(0, 100)
            ].filter(t => t && t.trim().length > 0);
            
            // 提取可能的链接
            const possibleLinks = [
              $el.find('a').attr('href'),
              $el.attr('href'),
              $el.find('[href]').attr('href')
            ].filter(l => l && l.trim().length > 0);
            
            // 提取可能的图片
            const possibleImages = [
              $el.find('img').attr('src'),
              $el.find('img').attr('data-src'),
              $el.find('[data-src]').attr('data-src')
            ].filter(i => i && i.trim().length > 0);
            
            selectorResult.samples.push({
              index,
              tagName: element.tagName,
              className: $el.attr('class') || '',
              id: $el.attr('id') || '',
              possibleTitles: possibleTitles.slice(0, 3),
              possibleLinks: possibleLinks.slice(0, 2),
              possibleImages: possibleImages.slice(0, 2),
              textContent: $el.text().substring(0, 200).trim(),
              hasChildren: $el.children().length > 0,
              childrenCount: $el.children().length
            });
          });
        }
        
        analysisResult.selectorAnalysis.push(selectorResult);
        
      } catch (error) {
        analysisResult.selectorAnalysis.push({
          selector,
          count: 0,
          found: false,
          error: error.message
        });
      }
    }
    
    // 生成推荐
    const goodSelectors = analysisResult.selectorAnalysis
      .filter(s => s.found && s.count > 0 && s.count < 1000)
      .sort((a, b) => {
        // 优先选择有有效内容的选择器
        const aHasContent = a.samples?.some(s => s.possibleTitles?.length > 0 || s.possibleLinks?.length > 0);
        const bHasContent = b.samples?.some(s => s.possibleTitles?.length > 0 || s.possibleLinks?.length > 0);
        
        if (aHasContent && !bHasContent) return -1;
        if (!aHasContent && bHasContent) return 1;
        
        // 然后按元素数量排序（适中的数量更好）
        const aScore = Math.abs(a.count - 20); // 理想数量是20左右
        const bScore = Math.abs(b.count - 20);
        return aScore - bScore;
      });
    
    analysisResult.recommendations = goodSelectors.slice(0, 5).map(s => ({
      selector: s.selector,
      count: s.count,
      reason: generateRecommendationReason(s)
    }));
    
    // 保存分析结果
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const analysisPath = path.join(process.cwd(), 'debug', `selector-analysis-${platform}-${timestamp}.json`);
    
    const debugDir = path.dirname(analysisPath);
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    fs.writeFileSync(analysisPath, JSON.stringify(analysisResult, null, 2), 'utf8');
    
    // 保存页面HTML
    const htmlPath = path.join(process.cwd(), 'debug', `page-analysis-${platform}-${timestamp}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    
    // 截图
    const screenshotPath = path.join(process.cwd(), 'debug', `page-analysis-${platform}-${timestamp}.png`);
    await (crawler as any).page.screenshot({ path: screenshotPath, fullPage: true });
    
    // 关闭浏览器
    await (crawler as any).closeBrowser();
    
    res.json({
      success: true,
      data: analysisResult,
      files: {
        analysis: analysisPath,
        html: htmlPath,
        screenshot: screenshotPath
      }
    });
    
  } catch (error) {
    console.error(`[选择器分析] 分析失败:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取平台默认URL
 */
function getDefaultUrl(platform: string): string {
  const urls = {
    youku: 'https://list.youku.com/category/show/c_96.html',
    tencent: 'https://v.qq.com/channel/mini_drama',
    iqiyi: 'https://www.iqiyi.com/dianying/duanju/',
    douyin: 'https://www.douyin.com/search/%E7%9F%AD%E5%89%A7?type=video'
  };
  
  return urls[platform as keyof typeof urls] || '';
}

/**
 * 生成推荐理由
 */
function generateRecommendationReason(selectorResult: any): string {
  const reasons = [];
  
  if (selectorResult.count > 0 && selectorResult.count <= 50) {
    reasons.push(`找到${selectorResult.count}个元素，数量适中`);
  }
  
  if (selectorResult.samples?.some((s: any) => s.possibleTitles?.length > 0)) {
    reasons.push('包含标题信息');
  }
  
  if (selectorResult.samples?.some((s: any) => s.possibleLinks?.length > 0)) {
    reasons.push('包含链接信息');
  }
  
  if (selectorResult.samples?.some((s: any) => s.possibleImages?.length > 0)) {
    reasons.push('包含图片信息');
  }
  
  return reasons.join('，') || '基础匹配';
}

export default router;