import { BaseCrawler } from './base';
import { Drama, Celebrity } from '../database';

/**
 * 爱奇艺爬虫类
 */
export class IqiyiCrawler extends BaseCrawler {
  constructor() {
    super('爱奇艺', 'https://www.iqiyi.com');
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
      console.log(`[爱奇艺] 开始获取短剧列表 - 页码: ${page}, 每页: ${pageSize}`);
      
      // 爱奇艺短剧页面URL - 使用用户指定的单一入口页面
      const targetUrl = 'https://www.iqiyi.com/microdrama/';
      console.log(`[爱奇艺] 使用指定URL: ${targetUrl}`);
      
      // 导航到目标页面
      await this.safeGoto(targetUrl);
      
      // 检测反爬机制
      if (await this.detectAntiCrawler()) {
        console.warn('[爱奇艺] 检测到反爬机制，使用备用策略');
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));
      }
      
      // 等待网络空闲
      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        console.warn('[爱奇艺] 网络空闲等待超时');
      }
      
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // 尝试等待短剧列表容器加载
      try {
        await this.page!.waitForSelector('.wrapper-piclist, .site-piclist, .mod-poster, .qy-mod-poster, .album-item, .pic-item', { timeout: 15000 });
      } catch (e) {
        console.warn('[爱奇艺] 未找到预期的短剧列表容器');
      }
      
      // 模拟用户滚动行为
      await this.page!.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 3);
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await this.page!.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await this.page!.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const html = await this.page!.content();
      const $ = this.parseHTML(html);
      
      const dramas: Partial<Drama>[] = [];
      
      // 针对短剧的选择器策略 - 基于爱奇艺结构优化
      const selectors = [
        // 搜索结果页面选择器（优先级最高）
        '.results-wrap .result-item', // 搜索结果包装器
        '.search-results .item', // 搜索结果项
        '.result-list .result-item', // 结果列表项
        '.mod-search-result .item', // 搜索模块结果
        '.search-wrap .result', // 搜索包装结果
        '.search-list .search-item', // 搜索列表项
        '.search-content .item', // 搜索内容项
        '.qy-search-result .item', // 爱奇艺搜索结果
        
        // 爱奇艺短剧专用选择器
        '.wrapper-piclist li[data-widget-searchlist-item*="短剧"]',
        '.site-piclist li[data-searchlist-item*="短剧"]',
        '.qy-mod-poster li[data-item*="短剧"]',
        
        // 短剧分类页面选择器
        '.album-item[href*="短剧"]',
        '.pic-item[href*="短剧"]',
        '.drama-item',
        '.mini-drama-item',
        
        // 搜索结果页选择器
        '.search-item',
        '.result-item',
        '.search-result .item',
        
        // 通用但有效的选择器
        '.wrapper-piclist li',
        '.site-piclist li',
        '.qy-mod-poster li',
        '.album-item',
        '.pic-item',
        
        // 数据属性选择器
        '[data-widget-searchlist-item]',
        '[data-searchlist-item]',
        '[data-item][href*="/v_"]', // 爱奇艺视频链接格式
        
        // 备用选择器
        '.video-item',
        '.list-item',
        '.card-item'
      ];
      
      let foundItems = false;
      
      for (const selector of selectors) {
        const items = $(selector);
        if (items.length > 0) {
          console.log(`[爱奇艺] 使用选择器 ${selector} 找到 ${items.length} 个短剧项目`);
          
          items.each((index, element) => {
            if (dramas.length >= pageSize) return false;
            
            const $item = $(element);
            
            // 提取标题
            let title = '';
            const titleSelectors = [
              '.site-piclist_info_title a', '.album-title', '.pic-text', '.title',
              '.video-title', '.drama-title', '.card-title', '.item-title', '.content-title',
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              '[title]', '[alt]', 'img'
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
                  title = this.cleanText(titleEl.text() || titleEl.attr('title') || '');
                }
                if (title && title.length > 1) break;
              }
            }
            
            // 提取链接
            let link = '';
            const linkSelectors = ['a', '[href]'];
            for (const linkSel of linkSelectors) {
              const linkEl = $item.find(linkSel).first();
              if (linkEl.length > 0) {
                link = linkEl.attr('href') || '';
                if (link) {
                  if (!link.startsWith('http')) {
                    link = link.startsWith('//') ? `https:${link}` : `https://www.iqiyi.com${link}`;
                  }
                  break;
                }
              }
            }
            
            // 提取封面图
            let cover = '';
            const imgSelectors = [
              '.result-pic img', // 搜索结果图片
              '.item-pic img', // 项目图片
              '.pic img', // 通用图片
              '.poster img', // 海报图片
              'img' // 任意图片
            ];
            for (const imgSel of imgSelectors) {
              const imgEl = $item.find(imgSel).first();
              if (imgEl.length > 0) {
                cover = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('rsrc') || imgEl.attr('data-original') || '';
                if (cover) break;
              }
            }
            if (cover && !cover.startsWith('http')) {
              cover = cover.startsWith('//') ? `https:${cover}` : cover;
            }
            
            // 提取描述
            let description = '';
            const descEl = $item.find('.site-piclist_info_describe, .album-desc, .pic-desc, .desc');
            if (descEl.length > 0) {
              description = this.cleanText(descEl.text());
            }
            
            // 提取评分
            let score = '';
            const scoreEl = $item.find('.score-info, .album-score, .pic-score');
            if (scoreEl.length > 0) {
              score = this.cleanText(scoreEl.text());
            }
            
            // 验证是否为短剧内容
            if (title && title.length > 1 && this.isShortDrama(title, description)) {
              dramas.push({
                title,
                description: description || `爱奇艺短剧：${title}${score ? ` (评分: ${score})` : ''}`,
                status: 'ongoing' as const,
                // platform: '爱奇艺',
                poster_url: cover,
                source_url: link,
                episode_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            } else if (title && title.length > 1) {
              console.log(`[爱奇艺] 过滤掉长剧: ${title}`);
            }
          });
          
          foundItems = true;
          break;
        }
      }
      
      if (!foundItems || dramas.length === 0) {
        console.warn('[爱奇艺] 未能从页面提取到短剧数据');
        throw new Error('未能从爱奇艺页面提取到短剧数据');
      }
      
      console.log(`[爱奇艺] 成功获取 ${dramas.length} 个短剧`);
      console.log('[爱奇艺] 提取到的短剧数据:', dramas.map(d => ({ title: d.title, source_url: d.source_url })));
      return dramas;
      
    } catch (error) {
      console.error(`[爱奇艺] 获取短剧列表失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取排行榜
   */
  async getRankings(type: string = 'hot', options: any = {}): Promise<any[]> {
    const { limit = 10 } = options;
    
    try {
      console.log(`[爱奇艺] 开始获取排行榜 - 类型: ${type}, 限制: ${limit}`);
      
      // 爱奇艺热门排行榜页面URL
      const targetUrl = 'https://www.iqiyi.com/lib/m_209394814.html';
      
      // 导航到目标页面
      await this.safeGoto(targetUrl);
      
      // 检测反爬机制
      if (await this.detectAntiCrawler()) {
        console.warn('[爱奇艺] 检测到反爬机制，使用备用策略');
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));
      }
      
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 尝试等待排行榜列表容器加载
      try {
        await this.page!.waitForSelector('.wrapper-piclist, .site-piclist, .rank-list', { timeout: 15000 });
      } catch (e) {
        console.warn('[爱奇艺] 未找到预期的排行榜列表容器');
      }
      
      // 滚动页面加载更多内容
      await this.page!.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 3);
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const html = await this.page!.content();
      const $ = this.parseHTML(html);
      
      const rankings: Partial<Drama>[] = [];
      
      // 尝试多种可能的选择器，优先使用搜索结果页面的选择器
      const selectors = [
        '.results-wrap .result-item', // 搜索结果项
        '.search-results .item', // 搜索结果
        '.result-list .result-item', // 结果列表项
        '.mod-search-result .item', // 搜索模块结果
        '.search-wrap .result', // 搜索包装结果
        '.wrapper-piclist li', // 传统图片列表
        '.site-piclist li', // 站点图片列表
        '.rank-list li',
        '.qy-mod-poster li',
        '.album-item',
        '.pic-item',
        '.rank-item',
        '[data-widget-searchlist] .item', // 数据属性选择器
        '.search-list .search-item' // 搜索列表项
      ];
      
      let foundItems = false;
      
      for (const selector of selectors) {
        const items = $(selector);
        if (items.length > 0) {
          console.log(`[爱奇艺] 使用选择器 ${selector} 找到 ${items.length} 个排行榜项目`);
          
          items.each((index, element) => {
            if (rankings.length >= limit) return false;
            
            const $item = $(element);
            
            // 提取标题
            let title = '';
            const titleSelectors = [
              '.result-title a', // 搜索结果标题
              '.result-title', // 搜索结果标题（无链接）
              '.item-title a', // 项目标题链接
              '.item-title', // 项目标题
              '.title a', // 通用标题链接
              '.title', // 通用标题
              '.site-piclist_info_title a', // 传统选择器
              '.album-title', // 专辑标题
              '.pic-text', // 图片文本
              '.rank-title',
              'h3 a', // h3标题链接
              'h4 a', // h4标题链接
              'img' // 图片alt属性
            ];
            for (const titleSel of titleSelectors) {
              const titleEl = $item.find(titleSel);
              if (titleEl.length > 0) {
                title = titleSel === 'img' ? 
                  this.cleanText(titleEl.attr('alt') || titleEl.attr('title') || '') :
                  this.cleanText(titleEl.text() || titleEl.attr('title') || '');
                if (title) break;
              }
            }
            
            // 提取链接
            let link = '';
            // 首先检查当前元素是否就是链接
            if ($item.is('a')) {
              link = $item.attr('href') || '';
            } else {
              // 查找子元素中的链接
              const linkSelectors = [
                '.result-title a',
                '.item-title a', 
                '.title a',
                'h3 a',
                'h4 a',
                'a[href*="/v_"]', // 爱奇艺视频链接格式
                'a[href*=".html"]', // HTML页面链接
                'a'
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
              link = link.startsWith('//') ? `https:${link}` : `https://www.iqiyi.com${link}`;
            }
            
            // 提取封面图
            let cover = '';
            const imgEl = $item.find('img').first();
            if (imgEl.length > 0) {
              cover = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('rsrc') || '';
              if (cover && !cover.startsWith('http')) {
                cover = cover.startsWith('//') ? `https:${cover}` : cover;
              }
            }
            
            // 提取描述
            let description = '';
            const descSelectors = [
              '.result-desc', // 搜索结果描述
              '.item-desc', // 项目描述
              '.desc', // 通用描述
              '.site-piclist_info_describe', // 传统选择器
              '.album-desc', // 专辑描述
              '.pic-desc', // 图片描述
              '.rank-desc',
              '.summary', // 摘要
              '.intro' // 介绍
            ];
            for (const descSel of descSelectors) {
              const descEl = $item.find(descSel);
              if (descEl.length > 0) {
                description = this.cleanText(descEl.text());
                if (description) break;
              }
            }
            
            // 提取评分或排名
            let score = '';
            const scoreEl = $item.find('.score-info, .album-score, .pic-score, .rank-num');
            if (scoreEl.length > 0) {
              score = this.cleanText(scoreEl.text());
            }
            
            // 提取播放量或热度
            let playCount = '';
            const playEl = $item.find('.play-count, .view-count, .hot-value');
            if (playEl.length > 0) {
              playCount = this.cleanText(playEl.text());
            }
            
            if (title && title.length > 1) {
              rankings.push({
                title,
                description: description || `爱奇艺热门短剧：${title}${score ? ` (评分: ${score})` : ''}${playCount ? ` (播放量: ${playCount})` : ''}`,
                status: 'ongoing' as const,
                // platform: '爱奇艺',
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
        console.warn('[爱奇艺] 未能从页面提取到排行榜数据');
        throw new Error('未能从爱奇艺页面提取到排行榜数据');
      }
      
      console.log(`[爱奇艺] 成功获取 ${rankings.length} 个排行榜短剧`);
      console.log('[爱奇艺] 提取到的排行榜数据:', rankings.map(d => ({ title: d.title, source_url: d.source_url })));
      return rankings;
      
    } catch (error) {
      console.error(`[爱奇艺] 获取排行榜失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取短剧详情
   */
  async getDramaDetail(dramaId: string, options: any = {}): Promise<any> {
    try {
      const detailUrl = dramaId.startsWith('http') ? dramaId : `${this.baseUrl}/v_${dramaId}.html`;
      
      await this.safeGoto(detailUrl);
      
      // 检测反爬机制
      if (await this.detectAntiCrawler()) {
        throw new Error('检测到反爬机制，暂停爬取');
      }
      
      // 等待内容加载
      await this.page!.waitForSelector('.lib-album-detail__info', { timeout: 10000 });
      
      const html = await this.page!.content();
      const $ = this.parseHTML(html);
      
      // 提取详细信息
      const title = this.cleanText($('.lib-album-detail__info .album-title').text());
      const description = this.cleanText($('.lib-album-detail__info .album-intro').text());
      const cover = $('.lib-album-detail__poster img').attr('src') || $('.lib-album-detail__poster img').attr('data-src') || '';
      const score = parseFloat($('.lib-album-detail__score .score-num').text()) || 0;
      
      // 提取播放量
      const playCountText = this.cleanText($('.lib-album-detail__count').text());
      const playCount = this.parsePlayCount(playCountText);
      
      // 提取演员信息
      const actors: Partial<Celebrity>[] = [];
      $('.lib-album-detail__actor .actor-item').each((index, element) => {
        const $actor = $(element);
        const name = this.cleanText($actor.find('.actor-name').text());
        const avatar = $actor.find('.actor-avatar img').attr('src') || '';
        const role = this.cleanText($actor.find('.actor-role').text());
        
        if (name) {
          actors.push({
            name,
            avatar_url: avatar,
            type: role.includes('导演') ? 'director' : 'actor',
            // nationality: '中国', // 移除不存在的字段
            created_at: new Date().toISOString(),
            // updated_at: new Date().toISOString() // 移除不存在的字段
          });
        }
      });
      
      // 提取标签
      const tags: string[] = [];
      $('.lib-album-detail__tag .tag-item').each((index, element) => {
        const tag = this.cleanText($(element).text());
        if (tag) tags.push(tag);
      });
      
      // 提取更新状态
      const statusText = this.cleanText($('.lib-album-detail__status').text());
      const status = statusText || '更新中';
      
      const detail = {
        title,
        description,
        cover_url: cover,
        score,
        play_count: playCount,
        source_url: detailUrl,
        tags: tags.join(','),
        actors,
        platform: '爱奇艺',
        status,
        release_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log(`[爱奇艺] 成功获取短剧详情: ${title}`);
      return detail;
      
    } catch (error) {
      console.error(`[爱奇艺] 获取短剧详情失败:`, error);
      throw error;
    }
  }
  
  /**
   * 解析播放量文本
   */
  private parsePlayCount(text: string): number {
    if (!text) return 0;
    
    const cleanText = text.replace(/[^0-9.万亿千百十]/g, '');
    
    if (cleanText.includes('万')) {
      const num = parseFloat(cleanText.replace('万', ''));
      return Math.floor(num * 10000);
    } else if (cleanText.includes('亿')) {
      const num = parseFloat(cleanText.replace('亿', ''));
      return Math.floor(num * 100000000);
    } else {
      return parseInt(cleanText) || 0;
    }
  }
}