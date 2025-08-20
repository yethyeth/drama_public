import express, { Request, Response, Router } from 'express';
import { dbGet, dbAll, dbRun } from '../database/index.ts';
import type { Drama, DramaPlatform, Platform } from '../database/index.ts';

const router: Router = express.Router();

/**
 * 获取短剧列表
 * GET /api/drama
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      platform, 
      status, 
      search,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    // 平台筛选
    if (platform) {
      whereClause += ' AND EXISTS (SELECT 1 FROM drama_platforms dp JOIN platforms p ON dp.platform_id = p.id WHERE dp.drama_id = d.id AND p.name = ?)';
      params.push(platform);
    }
    
    // 状态筛选
    if (status) {
      whereClause += ' AND d.status = ?';
      params.push(status);
    }
    
    // 搜索
    if (search) {
      whereClause += ' AND (d.title LIKE ? OR d.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // 排序验证
    const validSorts = ['created_at', 'title', 'release_date', 'episode_count'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSorts.includes(sort as string) ? sort : 'created_at';
    const orderDir = validOrders.includes(order as string) ? order : 'DESC';
    
    const dramas = await dbAll(`
      SELECT 
        d.*,
        GROUP_CONCAT(p.display_name) as platforms
      FROM dramas d
      LEFT JOIN drama_platforms dp ON d.id = dp.drama_id
      LEFT JOIN platforms p ON dp.platform_id = p.id
      ${whereClause}
      GROUP BY d.id
      ORDER BY d.${sortField} ${orderDir}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit as string), offset]) as (Drama & { platforms: string })[];
    
    // 获取总数
    const countResult = await dbGet(`
      SELECT COUNT(DISTINCT d.id) as total
      FROM dramas d
      LEFT JOIN drama_platforms dp ON d.id = dp.drama_id
      LEFT JOIN platforms p ON dp.platform_id = p.id
      ${whereClause}
    `, params) as { total: number };
    
    res.json({
      success: true,
      data: {
        dramas: dramas.map(drama => ({
          ...drama,
          platforms: drama.platforms ? drama.platforms.split(',') : []
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
    console.error('获取短剧列表失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 获取短剧详情
 * GET /api/drama/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 获取短剧基本信息
    const drama = await dbGet('SELECT * FROM dramas WHERE id = ?', [id]) as Drama | undefined;
    
    if (!drama) {
      return res.status(404).json({
        success: false,
        error: '短剧不存在'
      });
    }
    
    // 获取平台信息
    const platforms = await dbAll(`
      SELECT 
        p.*,
        dp.platform_url,
        dp.platform_id as drama_platform_id,
        dp.view_count,
        dp.rating,
        dp.last_updated
      FROM drama_platforms dp
      JOIN platforms p ON dp.platform_id = p.id
      WHERE dp.drama_id = ?
    `, [id]) as (Platform & {
      platform_url: string;
      drama_platform_id: string;
      view_count: number;
      rating: number;
      last_updated: string;
    })[];
    
    // 获取演员信息
    const cast = await dbAll(`
      SELECT 
        c.*,
        cr.role,
        cr.role_type
      FROM cast_relations cr
      JOIN celebrities c ON cr.celebrity_id = c.id
      WHERE cr.drama_id = ?
      ORDER BY 
        CASE cr.role_type 
          WHEN 'director' THEN 1
          WHEN 'lead' THEN 2
          WHEN 'supporting' THEN 3
          ELSE 4
        END,
        cr.role
    `, [id]);
    
    // 获取榜单排名信息
    const rankings = await dbAll(`
      SELECT 
        r.id as ranking_id,
        r.title as ranking_title,
        r.type as ranking_type,
        ri.rank,
        ri.score,
        p.display_name as platform_name
      FROM ranking_items ri
      JOIN rankings r ON ri.ranking_id = r.id
      JOIN platforms p ON r.platform_id = p.id
      WHERE ri.drama_id = ?
      ORDER BY ri.rank ASC
    `, [id]);
    
    res.json({
      success: true,
      data: {
        ...drama,
        platforms,
        cast,
        rankings
      }
    });
    
  } catch (error) {
    console.error('获取短剧详情失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 创建短剧
 * POST /api/drama
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      poster_url,
      release_date,
      episode_count,
      duration,
      genre,
      tags,
      status,
      platforms,
      cast
    } = req.body;
    
    // 验证必要参数
    if (!title) {
      return res.status(400).json({
        success: false,
        error: '短剧标题不能为空'
      });
    }
    
    // 创建短剧
    const result = await dbRun(`
      INSERT INTO dramas (
        title, description, poster_url, release_date, 
        episode_count, duration, genre, tags, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      title,
      description || null,
      poster_url || null,
      release_date || null,
      episode_count || null,
      duration || null,
      genre || null,
      tags || null,
      status || 'unknown'
    ]);
    
    const dramaId = result.lastID;
    
    // 添加平台关联
    if (platforms && Array.isArray(platforms)) {
      for (const platform of platforms) {
        await dbRun(`
          INSERT INTO drama_platforms (
            drama_id, platform_id, platform_url, view_count, rating, created_at
          )
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          dramaId,
          platform.platform_id,
          platform.platform_url || null,
          platform.view_count || 0,
          platform.rating || null
        ]);
      }
    }
    
    // 添加演员关联
    if (cast && Array.isArray(cast)) {
      for (const member of cast) {
        await dbRun(`
          INSERT INTO cast_relations (
            drama_id, celebrity_id, role, role_type, created_at
          )
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          dramaId,
          member.celebrity_id,
          member.role || null,
          member.role_type || 'actor'
        ]);
      }
    }
    
    res.json({
      success: true,
      data: {
        id: dramaId,
        message: '短剧创建成功'
      }
    });
    
  } catch (error) {
    console.error('创建短剧失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 更新短剧信息
 * PUT /api/drama/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // 检查短剧是否存在
    const existingDrama = await dbGet('SELECT id FROM dramas WHERE id = ?', [id]);
    if (!existingDrama) {
      return res.status(404).json({
        success: false,
        error: '短剧不存在'
      });
    }
    
    // 构建更新语句
    const allowedFields = [
      'title', 'description', 'poster_url', 'release_date',
      'episode_count', 'duration', 'genre', 'tags', 'status'
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
      UPDATE dramas 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);
    
    res.json({
      success: true,
      message: '短剧信息更新成功'
    });
    
  } catch (error) {
    console.error('更新短剧失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 删除短剧
 * DELETE /api/drama/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 检查短剧是否存在
    const drama = await dbGet('SELECT id FROM dramas WHERE id = ?', [id]);
    if (!drama) {
      return res.status(404).json({
        success: false,
        error: '短剧不存在'
      });
    }
    
    // 删除相关数据
    await dbRun('DELETE FROM ranking_items WHERE drama_id = ?', [id]);
    await dbRun('DELETE FROM cast_relations WHERE drama_id = ?', [id]);
    await dbRun('DELETE FROM drama_platforms WHERE drama_id = ?', [id]);
    await dbRun('DELETE FROM dramas WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '短剧删除成功'
    });
    
  } catch (error) {
    console.error('删除短剧失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

export default router;