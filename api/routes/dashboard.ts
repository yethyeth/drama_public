import express, { Request, Response, Router } from 'express';
import { dbGet, dbAll } from '../database/index.ts';

const router: Router = express.Router();

/**
 * 获取仪表板统计数据
 * GET /api/dashboard/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // 获取短剧总数
    const dramaCount = await dbGet('SELECT COUNT(*) as count FROM dramas') as { count: number };
    
    // 获取演员总数
    const celebrityCount = await dbGet('SELECT COUNT(*) as count FROM celebrities') as { count: number };
    
    // 获取平台分布
    const platformStats = await dbAll(`
      SELECT 
        p.name as platform,
        COUNT(DISTINCT dp.drama_id) as count
      FROM platforms p
      LEFT JOIN drama_platforms dp ON p.id = dp.platform_id
      GROUP BY p.id, p.name
      ORDER BY count DESC
    `) as { platform: string; count: number }[];
    
    // 获取总浏览量（所有平台的浏览量总和）
    const totalViewsResult = await dbGet(`
      SELECT COALESCE(SUM(dp.view_count), 0) as total_views
      FROM drama_platforms dp
    `) as { total_views: number };
    
    // 获取最近7天的数据趋势（按创建时间）
    const trendData = await dbAll(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM dramas 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `) as { date: string; count: number }[];
    
    // 获取热门短剧（基于播放量）
    const topDramas = await dbAll(`
      SELECT 
        d.title,
        '' as poster,
        COALESCE(SUM(dp.view_count), 0) as views
      FROM dramas d
      LEFT JOIN drama_platforms dp ON d.id = dp.drama_id
      GROUP BY d.id, d.title
      ORDER BY views DESC
      LIMIT 5
    `) as { title: string; poster: string; views: number }[];
    
    // 获取榜单统计
    const rankingCount = await dbGet('SELECT COUNT(*) as count FROM rankings') as { count: number };
    
    // 构建响应数据
    const stats = {
      overview: {
        totalDramas: dramaCount.count,
        totalViews: totalViewsResult.total_views,
        totalCelebrities: celebrityCount.count,
        totalRankings: rankingCount.count
      },
      platformDistribution: platformStats,
      trendData: trendData.map(item => ({
        date: item.date,
        dramas: item.count
      })),
      topDramas: topDramas.map(drama => ({
        title: drama.title,
        poster: drama.poster,
        views: drama.views || 0
      })),
      recentActivity: {
        newDramas: trendData.reduce((sum, item) => sum + item.count, 0),
        activePlatforms: platformStats.filter(p => p.count > 0).length
      }
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('获取仪表板统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 获取平台详细统计
 * GET /api/dashboard/platform-stats
 */
router.get('/platform-stats', async (req: Request, res: Response) => {
  try {
    const platformDetails = await dbAll(`
      SELECT 
        p.name as platform,
        p.name as platform_key,
        COUNT(DISTINCT dp.drama_id) as drama_count,
        COALESCE(SUM(dp.view_count), 0) as total_views,
        COALESCE(AVG(dp.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as ranking_count
      FROM platforms p
      LEFT JOIN drama_platforms dp ON p.id = dp.platform_id
      LEFT JOIN rankings r ON p.id = r.platform_id
      GROUP BY p.id, p.name, p.name
      ORDER BY drama_count DESC
    `) as {
      platform: string;
      platform_key: string;
      drama_count: number;
      total_views: number;
      avg_rating: number;
      ranking_count: number;
    }[];
    
    res.json({
      success: true,
      data: platformDetails
    });
    
  } catch (error) {
    console.error('获取平台统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 获取最近短剧
 * GET /api/dashboard/recent-dramas
 */
router.get('/recent-dramas', async (req: Request, res: Response) => {
  try {
    const recentDramas = await dbAll(`
      SELECT 
        d.id,
        d.title,
        d.description,
        '' as poster_url,
        d.created_at,
        COALESCE(SUM(dp.view_count), 0) as total_views
      FROM dramas d
      LEFT JOIN drama_platforms dp ON d.id = dp.drama_id
      GROUP BY d.id, d.title, d.description, d.created_at
      ORDER BY d.created_at DESC
      LIMIT 10
    `) as {
      id: number;
      title: string;
      description: string;
      poster_url: string;
      created_at: string;
      total_views: number;
    }[];
    
    res.json({
      success: true,
      data: recentDramas
    });
    
  } catch (error) {
    console.error('获取最近短剧失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

export default router;