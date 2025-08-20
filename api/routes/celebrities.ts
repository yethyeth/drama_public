import express, { Request, Response, Router } from 'express';
import { dbGet, dbAll, dbRun } from '../database/index.ts';
import type { Celebrity, CastRelation } from '../database/index.ts';

const router: Router = express.Router();

/**
 * 获取演员导演列表
 * GET /api/celebrities
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      type, 
      search,
      sort = 'popularity_score',
      order = 'DESC'
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    // 类型筛选（演员/导演）
    if (type) {
      whereClause += ' AND EXISTS (SELECT 1 FROM cast_relations cr WHERE cr.celebrity_id = c.id AND cr.role_type = ?)';
      params.push(type);
    }
    
    // 搜索
    if (search) {
      whereClause += ' AND (c.name LIKE ? OR c.english_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // 排序验证
    const validSorts = ['name', 'popularity_score', 'created_at'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort as string) ? sort : 'popularity_score';
    const orderDir = validOrders.includes(order as string) ? order : 'DESC';
    
    const celebrities = await dbAll(`
      SELECT 
        c.*,
        COUNT(DISTINCT cr.drama_id) as drama_count,
        GROUP_CONCAT(DISTINCT cr.role_type) as role_types
      FROM celebrities c
      LEFT JOIN cast_relations cr ON c.id = cr.celebrity_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.${sortField} ${orderDir}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit as string), offset]) as (Celebrity & {
      drama_count: number;
      role_types: string;
    })[];
    
    // 获取总数
    const countResult = await dbGet(`
      SELECT COUNT(DISTINCT c.id) as total
      FROM celebrities c
      LEFT JOIN cast_relations cr ON c.id = cr.celebrity_id
      ${whereClause}
    `, params) as { total: number };
    
    res.json({
      success: true,
      data: {
        celebrities: celebrities.map(celebrity => ({
          ...celebrity,
          role_types: celebrity.role_types ? celebrity.role_types.split(',') : []
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: countResult.total,
          pages: Math.ceil(countResult.total / parseInt(limit as string))
        }
      }
    });
    
  } catch (error) {
    console.error('获取演员导演列表失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 获取演员导演详情
 * GET /api/celebrities/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取基本信息
    const celebrity = await dbGet('SELECT * FROM celebrities WHERE id = ?', [id]) as Celebrity | undefined;
    
    if (!celebrity) {
      return res.status(404).json({
        success: false,
        error: '演员/导演不存在'
      });
    }
    
    // 获取参演作品
    const works = await dbAll(`
      SELECT 
        d.id,
        d.title,
        d.poster_url,
        d.release_date,
        d.status,
        cr.role,
        cr.role_type,
        GROUP_CONCAT(DISTINCT p.display_name) as platforms
      FROM cast_relations cr
      JOIN dramas d ON cr.drama_id = d.id
      LEFT JOIN drama_platforms dp ON d.id = dp.drama_id
      LEFT JOIN platforms p ON dp.platform_id = p.id
      WHERE cr.celebrity_id = ?
      GROUP BY d.id, cr.role, cr.role_type
      ORDER BY d.release_date DESC
    `, [id]) as {
      id: string;
      title: string;
      poster_url: string;
      release_date: string;
      status: string;
      role: string;
      role_type: string;
      platforms: string;
    }[];
    
    // 获取热度统计
    const stats = await dbGet(`
      SELECT 
        COUNT(DISTINCT cr.drama_id) as total_works,
        COUNT(DISTINCT CASE WHEN cr.role_type = 'director' THEN cr.drama_id END) as director_works,
        COUNT(DISTINCT CASE WHEN cr.role_type IN ('lead', 'supporting', 'actor') THEN cr.drama_id END) as actor_works,
        AVG(ri.score) as avg_ranking_score
      FROM cast_relations cr
      LEFT JOIN ranking_items ri ON cr.drama_id = ri.drama_id
      WHERE cr.celebrity_id = ?
    `, [id]) as {
      total_works: number;
      director_works: number;
      actor_works: number;
      avg_ranking_score: number;
    };
    
    res.json({
      success: true,
      data: {
        ...celebrity,
        works: works.map(work => ({
          ...work,
          platforms: work.platforms ? work.platforms.split(',') : []
        })),
        stats
      }
    });
    
  } catch (error) {
    console.error('获取演员导演详情失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 获取热度榜单
 * GET /api/celebrities/hot-ranking
 */
router.get('/hot-ranking/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params; // 'actor' 或 'director'
    const { limit = '50', period = '7' } = req.query;
    
    // 验证类型
    if (!['actor', 'director'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: '无效的榜单类型，只支持 actor 或 director'
      });
    }
    
    const roleTypeCondition = type === 'director' 
      ? "cr.role_type = 'director'"
      : "cr.role_type IN ('lead', 'supporting', 'actor')";
    
    // 计算热度分数（基于作品数量、排名分数、最近活跃度）
    const hotRanking = await dbAll(`
      SELECT 
        c.id,
        c.name,
        c.english_name,
        c.avatar_url,
        c.birth_date,
        c.nationality,
        c.popularity_score,
        COUNT(DISTINCT cr.drama_id) as recent_works,
        AVG(ri.score) as avg_score,
        MAX(d.release_date) as latest_work_date,
        (
          COUNT(DISTINCT cr.drama_id) * 10 +
          COALESCE(AVG(ri.score), 0) * 5 +
          c.popularity_score +
          CASE 
            WHEN MAX(d.release_date) >= date('now', '-30 days') THEN 20
            WHEN MAX(d.release_date) >= date('now', '-90 days') THEN 10
            ELSE 0
          END
        ) as heat_score
      FROM celebrities c
      JOIN cast_relations cr ON c.id = cr.celebrity_id
      JOIN dramas d ON cr.drama_id = d.id
      LEFT JOIN ranking_items ri ON d.id = ri.drama_id
      WHERE ${roleTypeCondition}
        AND d.release_date >= date('now', '-${period} days')
      GROUP BY c.id
      ORDER BY heat_score DESC
      LIMIT ?
    `, [parseInt(limit as string)]) as {
      id: string;
      name: string;
      english_name: string;
      avatar_url: string;
      birth_date: string;
      nationality: string;
      popularity_score: number;
      recent_works: number;
      avg_score: number;
      latest_work_date: string;
      heat_score: number;
    }[];
    
    res.json({
      success: true,
      data: {
        type,
        title: `${type === 'director' ? '导演' : '演员'}热度榜`,
        period: `最近${period}天`,
        generated_at: new Date().toISOString(),
        ranking: hotRanking.map((item, index) => ({
          rank: index + 1,
          ...item,
          heat_score: Math.round(item.heat_score * 100) / 100,
          avg_score: item.avg_score ? Math.round(item.avg_score * 100) / 100 : null
        }))
      }
    });
    
  } catch (error) {
    console.error('获取热度榜单失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 创建演员导演
 * POST /api/celebrities
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      english_name,
      avatar_url,
      birth_date,
      nationality,
      biography,
      popularity_score
    } = req.body;
    
    // 验证必要参数
    if (!name) {
      return res.status(400).json({
        success: false,
        error: '姓名不能为空'
      });
    }
    
    // 检查是否已存在
    const existing = await dbGet(
      'SELECT id FROM celebrities WHERE name = ? OR (english_name IS NOT NULL AND english_name = ?)',
      [name, english_name]
    );
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '该演员/导演已存在'
      });
    }
    
    // 创建记录
    const result = await dbRun(`
      INSERT INTO celebrities (
        name, english_name, avatar_url, birth_date, 
        nationality, biography, popularity_score, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      name,
      english_name || null,
      avatar_url || null,
      birth_date || null,
      nationality || null,
      biography || null,
      popularity_score || 0
    ]);
    
    res.json({
      success: true,
      data: {
        id: result.lastID,
        message: '演员/导演创建成功'
      }
    });
    
  } catch (error) {
    console.error('创建演员导演失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 更新演员导演信息
 * PUT /api/celebrities/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // 检查是否存在
    const existing = await dbGet('SELECT id FROM celebrities WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '演员/导演不存在'
      });
    }
    
    // 构建更新语句
    const allowedFields = [
      'name', 'english_name', 'avatar_url', 'birth_date',
      'nationality', 'biography', 'popularity_score'
    ];
    
    const updateFields = [];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有有效的更新字段'
      });
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);
    
    await dbRun(`
      UPDATE celebrities 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);
    
    res.json({
      success: true,
      message: '演员/导演信息更新成功'
    });
    
  } catch (error) {
    console.error('更新演员导演失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

export default router;