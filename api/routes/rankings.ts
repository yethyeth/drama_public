import express, { Request, Response, Router } from 'express';
import { dbGet, dbAll, dbRun } from '../database/index.ts';
import type { Ranking, RankingItem, Drama, Platform } from '../database/index.ts';

const router: Router = express.Router();

/**
 * 获取所有榜单列表
 * GET /api/rankings
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const rankings = await dbAll(`
      SELECT 
        r.*,
        p.name as platform_name,
        p.display_name as platform_display_name,
        COUNT(ri.id) as item_count
      FROM rankings r
      LEFT JOIN platforms p ON r.platform_id = p.id
      LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `) as (Ranking & { platform_name: string; platform_display_name: string; item_count: number })[];
    
    res.json({
      success: true,
      data: rankings
    });
    
  } catch (error) {
    console.error('获取榜单列表失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 获取特定榜单详情
 * GET /api/rankings/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取榜单基本信息
    const ranking = await dbGet(`
      SELECT 
        r.*,
        p.name as platform_name,
        p.display_name as platform_display_name
      FROM rankings r
      LEFT JOIN platforms p ON r.platform_id = p.id
      WHERE r.id = ?
    `, [id]) as (Ranking & { platform_name: string; platform_display_name: string }) | undefined;
    
    if (!ranking) {
      return res.status(404).json({
        success: false,
        error: '榜单不存在'
      });
    }
    
    // 获取榜单项目
    const items = await dbAll(`
      SELECT 
        ri.*,
        d.title as drama_title,
        d.description as drama_description,
        d.poster_url,
        d.release_date,
        d.episode_count,
        d.status as drama_status
      FROM ranking_items ri
      LEFT JOIN dramas d ON ri.drama_id = d.id
      WHERE ri.ranking_id = ?
      ORDER BY ri.rank ASC
    `, [id]) as (RankingItem & {
      drama_title: string;
      drama_description: string;
      poster_url: string;
      release_date: string;
      episode_count: number;
      drama_status: string;
    })[];
    
    res.json({
      success: true,
      data: {
        ...ranking,
        items
      }
    });
    
  } catch (error) {
    console.error('获取榜单详情失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 按平台获取榜单
 * GET /api/rankings/platform/:platformId
 */
router.get('/platform/:platformId', async (req: Request, res: Response) => {
  try {
    const { platformId } = req.params;
    const { type, limit = '10' } = req.query;
    
    let whereClause = 'WHERE r.platform_id = ?';
    const params: any[] = [platformId];
    
    if (type) {
      whereClause += ' AND r.type = ?';
      params.push(type);
    }
    
    const rankings = await dbAll(`
      SELECT 
        r.*,
        p.name as platform_name,
        p.display_name as platform_display_name,
        COUNT(ri.id) as item_count
      FROM rankings r
      LEFT JOIN platforms p ON r.platform_id = p.id
      LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
      ${whereClause}
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT ?
    `, [...params, parseInt(limit as string)]) as (Ranking & {
      platform_name: string;
      platform_display_name: string;
      item_count: number;
    })[];
    
    res.json({
      success: true,
      data: rankings
    });
    
  } catch (error) {
    console.error('按平台获取榜单失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 获取综合排行榜（跨平台整合）
 * GET /api/rankings/integrated
 */
router.get('/integrated/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { limit = '20' } = req.query;
    
    // 获取各平台相同类型的最新榜单数据，按热度分数整合
    const integratedRanking = await dbAll(`
      SELECT 
        d.id,
        d.title,
        d.description,
        d.poster_url,
        d.release_date,
        d.episode_count,
        d.status,
        AVG(ri.score) as avg_score,
        COUNT(DISTINCT ri.ranking_id) as platform_count,
        GROUP_CONCAT(DISTINCT p.display_name) as platforms,
        MIN(ri.rank) as best_rank
      FROM ranking_items ri
      JOIN rankings r ON ri.ranking_id = r.id
      JOIN dramas d ON ri.drama_id = d.id
      JOIN platforms p ON r.platform_id = p.id
      WHERE r.type = ?
        AND r.created_at >= datetime('now', '-7 days')
      GROUP BY d.id
      HAVING platform_count >= 2
      ORDER BY avg_score DESC, platform_count DESC, best_rank ASC
      LIMIT ?
    `, [type, parseInt(limit as string)]) as {
      id: string;
      title: string;
      description: string;
      poster_url: string;
      release_date: string;
      episode_count: number;
      status: string;
      avg_score: number;
      platform_count: number;
      platforms: string;
      best_rank: number;
    }[];
    
    res.json({
      success: true,
      data: {
        type,
        title: `综合${type === 'hot' ? '热度' : type === 'new' ? '新剧' : '推荐'}榜`,
        description: '基于多平台数据整合的综合排行榜',
        generated_at: new Date().toISOString(),
        items: integratedRanking.map((item, index) => ({
          rank: index + 1,
          drama_id: item.id,
          title: item.title,
          description: item.description,
          poster_url: item.poster_url,
          release_date: item.release_date,
          episode_count: item.episode_count,
          status: item.status,
          score: Math.round(item.avg_score * 100) / 100,
          platform_count: item.platform_count,
          platforms: item.platforms.split(','),
          best_rank: item.best_rank
        }))
      }
    });
    
  } catch (error) {
    console.error('获取综合排行榜失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 创建新榜单
 * POST /api/rankings
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { platform_id, type, title, description, items } = req.body;
    
    // 验证参数
    if (!platform_id || !type || !title || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 创建榜单
    const result = await dbRun(`
      INSERT INTO rankings (platform_id, type, title, description, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [platform_id, type, title, description]);
    
    const rankingId = result.lastID;
    
    // 添加榜单项目
    for (const item of items) {
      await dbRun(`
        INSERT INTO ranking_items (ranking_id, drama_id, rank, score, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [rankingId, item.drama_id, item.rank, item.score || 0]);
    }
    
    res.json({
      success: true,
      data: {
        id: rankingId,
        message: '榜单创建成功'
      }
    });
    
  } catch (error) {
    console.error('创建榜单失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 删除榜单
 * DELETE /api/rankings/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查榜单是否存在
    const ranking = await dbGet('SELECT id FROM rankings WHERE id = ?', [id]);
    if (!ranking) {
      return res.status(404).json({
        success: false,
        error: '榜单不存在'
      });
    }
    
    // 删除榜单项目
    await dbRun('DELETE FROM ranking_items WHERE ranking_id = ?', [id]);
    
    // 删除榜单
    await dbRun('DELETE FROM rankings WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '榜单删除成功'
    });
    
  } catch (error) {
    console.error('删除榜单失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

export default router;