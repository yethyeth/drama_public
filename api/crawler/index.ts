import { TencentCrawler } from './tencent';
import { YoukuCrawler } from './youku';
import { IqiyiCrawler } from './iqiyi';
import { DouyinCrawler } from './douyin';
import { BaseCrawler } from './base';

/**
 * 爬虫管理器 - 统一管理所有平台爬虫
 */
export class CrawlerManager {
  private crawlers: Map<string, BaseCrawler>;
  
  constructor() {
    this.crawlers = new Map();
    this.initCrawlers();
  }
  
  /**
   * 初始化所有爬虫实例
   */
  private initCrawlers(): void {
    this.crawlers.set('tencent', new TencentCrawler());
    this.crawlers.set('youku', new YoukuCrawler());
    this.crawlers.set('iqiyi', new IqiyiCrawler());
    this.crawlers.set('douyin', new DouyinCrawler());
  }
  
  /**
   * 获取指定平台的爬虫实例
   */
  getCrawler(platform: string): BaseCrawler | null {
    return this.crawlers.get(platform.toLowerCase()) || null;
  }
  
  /**
   * 获取所有支持的平台列表
   */
  getSupportedPlatforms(): string[] {
    return Array.from(this.crawlers.keys());
  }
  
  /**
   * 执行单个平台的爬虫任务
   */
  async executeSingleTask(
    platform: string,
    taskType: string,
    options?: any
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    platform: string;
  }> {
    try {
      const crawler = this.getCrawler(platform);
      if (!crawler) {
        return {
          success: false,
          error: `不支持的平台: ${platform}`,
          platform
        };
      }
      
      console.log(`[爬虫管理器] 开始执行 ${platform} 平台的 ${taskType} 任务`);
      
      const data = await crawler.execute(taskType, options);
      
      console.log(`[爬虫管理器] ${platform} 平台任务执行成功，获取 ${Array.isArray(data) ? data.length : 1} 条数据`);
      
      return {
        success: true,
        data,
        platform
      };
      
    } catch (error) {
      console.error(`[爬虫管理器] ${platform} 平台任务执行失败:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        platform
      };
    }
  }
  
  /**
   * 执行多平台并行爬虫任务
   */
  async executeMultiPlatformTask(
    platforms: string[],
    taskType: string,
    options?: any
  ): Promise<{
    success: boolean;
    results: Array<{
      success: boolean;
      data?: any;
      error?: string;
      platform: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      totalData: number;
    };
  }> {
    console.log(`[爬虫管理器] 开始执行多平台任务: ${platforms.join(', ')} - ${taskType}`);
    
    const tasks = platforms.map(platform => 
      this.executeSingleTask(platform, taskType, options)
    );
    
    const results = await Promise.allSettled(tasks);
    
    const processedResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || '任务执行失败',
          platform: 'unknown'
        };
      }
    });
    
    // 统计结果
    const successful = processedResults.filter(r => r.success).length;
    const failed = processedResults.length - successful;
    const totalData = processedResults
      .filter(r => r.success && 'data' in r && r.data)
      .reduce((sum, r) => {
        const data = 'data' in r ? r.data : null;
        return sum + (Array.isArray(data) ? data.length : 1);
      }, 0);
    
    console.log(`[爬虫管理器] 多平台任务完成: 成功 ${successful}/${processedResults.length}，共获取 ${totalData} 条数据`);
    
    return {
      success: successful > 0,
      results: processedResults,
      summary: {
        total: processedResults.length,
        successful,
        failed,
        totalData
      }
    };
  }
  
  /**
   * 获取短剧列表 - 多平台聚合
   */
  async getDramaList(options: {
    platforms?: string[];
    page?: number;
    pageSize?: number;
    category?: string;
  } = {}): Promise<any> {
    const {
      platforms = this.getSupportedPlatforms(),
      page = 1,
      pageSize = 20,
      category = ''
    } = options;
    
    return await this.executeMultiPlatformTask(
      platforms,
      'drama_list',
      { page, pageSize, category }
    );
  }
  
  /**
   * 获取排行榜 - 多平台聚合
   */
  async getRankings(options: {
    platforms?: string[];
    type?: string;
    limit?: number;
  } = {}): Promise<any> {
    const {
      platforms = this.getSupportedPlatforms(),
      type = 'hot',
      limit = 50
    } = options;
    
    return await this.executeMultiPlatformTask(
      platforms,
      'ranking',
      { type, limit }
    );
  }
  
  /**
   * 获取短剧详情
   */
  async getDramaDetail(platform: string, dramaId: string, options?: any): Promise<any> {
    return await this.executeSingleTask(
      platform,
      'detail',
      { dramaId, ...options }
    );
  }
  
  /**
   * 健康检查 - 检测所有爬虫状态（不依赖浏览器启动）
   */
  async healthCheck(): Promise<{
    overall: boolean;
    platforms: Array<{
      platform: string;
      status: 'healthy' | 'error';
      error?: string;
    }>;
  }> {
    console.log('[爬虫管理器] 开始健康检查（轻量级模式）');
    
    const platforms = this.getSupportedPlatforms();
    const platformUrls: Record<string, string> = {
      'tencent': 'https://v.qq.com',
      'youku': 'https://www.youku.com',
      'iqiyi': 'https://www.iqiyi.com',
      'douyin': 'https://www.douyin.com'
    };
    
    const checks = platforms.map(async (platform) => {
      try {
        const crawler = this.getCrawler(platform);
        if (!crawler) {
          return {
            platform,
            status: 'error' as const,
            error: '爬虫实例不存在'
          };
        }
        
        // 轻量级健康检查 - 仅检查平台URL可访问性
        const url = platformUrls[platform];
        if (!url) {
          return {
            platform,
            status: 'error' as const,
            error: '平台URL未配置'
          };
        }
        
        // 使用HTTP请求检查平台可访问性，避免浏览器启动
        const axios = require('axios');
        const response = await axios.head(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.status === 200 || response.status === 301 || response.status === 302) {
          return {
            platform,
            status: 'healthy' as const
          };
        } else {
          return {
            platform,
            status: 'error' as const,
            error: `HTTP状态码: ${response.status}`
          };
        }
      } catch (error) {
        return {
          platform,
          status: 'error' as const,
          error: error instanceof Error ? error.message : '未知错误'
        };
      }
    });
    
    const results = await Promise.allSettled(checks);
    const platformResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          platform: 'unknown',
          status: 'error' as const,
          error: '健康检查失败'
        };
      }
    });
    
    const healthyCount = platformResults.filter(r => r.status === 'healthy').length;
    const overall = healthyCount > 0;
    
    console.log(`[爬虫管理器] 健康检查完成: ${healthyCount}/${platformResults.length} 个平台正常`);
    
    return {
      overall,
      platforms: platformResults
    };
  }
  
  /**
   * 获取爬虫统计信息
   */
  getStats(): {
    totalPlatforms: number;
    supportedPlatforms: string[];
    features: string[];
  } {
    return {
      totalPlatforms: this.crawlers.size,
      supportedPlatforms: this.getSupportedPlatforms(),
      features: [
        '短剧列表采集',
        '排行榜采集',
        '短剧详情采集',
        '反爬机制检测',
        '多平台并行处理',
        '健康状态监控'
      ]
    };
  }
}

// 导出单例实例
export const crawlerManager = new CrawlerManager();

// 导出所有爬虫类
export {
  BaseCrawler,
  TencentCrawler,
  YoukuCrawler,
  IqiyiCrawler,
  DouyinCrawler
};