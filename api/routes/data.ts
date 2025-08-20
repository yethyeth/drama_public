import { Router, Request, Response } from 'express';
import { dbAll, dbRun } from '../database/index.ts';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router: Router = Router();

// 数据库路径
const dbPath = path.join(__dirname, '../../drama.db');

// 获取所有短剧数据
router.get('/dramas', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // 获取总数
    const countResult = await dbAll('SELECT COUNT(*) as total FROM dramas');
    const total = countResult[0]?.total || 0;

    // 获取分页数据
    const query = `
      SELECT d.*, GROUP_CONCAT(p.name) as platforms
      FROM dramas d
      LEFT JOIN drama_platforms dp ON d.id = dp.drama_id
      LEFT JOIN platforms p ON dp.platform_id = p.id
      GROUP BY d.id
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const dramas = await dbAll(query, [limit, offset]);

    res.json({
      success: true,
      data: {
        dramas,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    console.error('获取短剧数据失败:', err);
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

// 获取所有平台数据
router.get('/platforms', async (req: Request, res: Response) => {
  try {
    const platforms = await dbAll('SELECT * FROM platforms ORDER BY name');
    res.json({ success: true, data: platforms });
  } catch (err) {
    console.error('获取平台数据失败:', err);
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

// 获取所有演员数据
router.get('/celebrities', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // 获取总数
    const countResult = await dbAll('SELECT COUNT(*) as total FROM celebrities');
    const total = countResult[0]?.total || 0;

    // 获取分页数据
    const celebrities = await dbAll('SELECT * FROM celebrities ORDER BY name LIMIT ? OFFSET ?', [limit, offset]);

    res.json({
      success: true,
      data: {
        celebrities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    console.error('获取演员数据失败:', err);
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

// 获取榜单数据
router.get('/rankings', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT r.*, 
             COUNT(ri.id) as item_count,
             GROUP_CONCAT(d.title) as drama_titles
      FROM rankings r
      LEFT JOIN ranking_items ri ON r.id = ri.ranking_id
      LEFT JOIN dramas d ON ri.drama_id = d.id
      GROUP BY r.id
      ORDER BY r.crawl_time DESC
    `;

    const rankings = await dbAll(query);
    res.json({ success: true, data: rankings });
  } catch (err) {
    console.error('获取榜单数据失败:', err);
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

// 删除短剧
router.delete('/dramas/:id', async (req: Request, res: Response) => {
  try {
    const dramaId = req.params.id;

    // 删除相关的平台关联
    await dbRun('DELETE FROM drama_platforms WHERE drama_id = ?', [dramaId]);
    
    // 删除相关的演员关联
    await dbRun('DELETE FROM cast_relations WHERE drama_id = ?', [dramaId]);
    
    // 删除相关的榜单项
    await dbRun('DELETE FROM ranking_items WHERE drama_id = ?', [dramaId]);
    
    // 删除短剧本身
    const result = await dbRun('DELETE FROM dramas WHERE id = ?', [dramaId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '短剧不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除短剧失败:', err);
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

// 删除演员
router.delete('/celebrities/:id', async (req: Request, res: Response) => {
  try {
    const celebrityId = req.params.id;
    
    // 删除相关的演员关联
    await dbRun('DELETE FROM cast_relations WHERE celebrity_id = ?', [celebrityId]);
    
    // 删除演员本身
    const result = await dbRun('DELETE FROM celebrities WHERE id = ?', [celebrityId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '演员不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('删除演员失败:', err);
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

export default router;