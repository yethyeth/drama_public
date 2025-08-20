import { Router, Request, Response } from 'express';
import { dbRun, dbAll } from '../database/index.ts';

const router: Router = Router();

// 清理数据库测试数据的API接口
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    console.log('开始清理数据库测试数据...');
    
    // 开始事务
    await dbRun('BEGIN TRANSACTION');
    
    const results = {
      ranking_items: 0,
      cast_relations: 0,
      drama_platforms: 0,
      rankings: 0,
      celebrities: 0,
      dramas: 0,
      platforms_reset: 0
    };
    
    // 1. 清空榜单项目表（有外键依赖，先清理）
    const rankingItemsResult = await dbRun('DELETE FROM ranking_items');
    results.ranking_items = rankingItemsResult.changes || 0;
    
    // 2. 清空演职人员关联表
    const castRelationsResult = await dbRun('DELETE FROM cast_relations');
    results.cast_relations = castRelationsResult.changes || 0;
    
    // 3. 清空短剧平台关联表
    const dramaPlatformsResult = await dbRun('DELETE FROM drama_platforms');
    results.drama_platforms = dramaPlatformsResult.changes || 0;
    
    // 4. 清空榜单表
    const rankingsResult = await dbRun('DELETE FROM rankings');
    results.rankings = rankingsResult.changes || 0;
    
    // 5. 清空演员导演表
    const celebritiesResult = await dbRun('DELETE FROM celebrities');
    results.celebrities = celebritiesResult.changes || 0;
    
    // 6. 清空短剧主表
    const dramasResult = await dbRun('DELETE FROM dramas');
    results.dramas = dramasResult.changes || 0;
    
    // 7. 保留平台数据，但重置爬取时间
    const platformsResult = await dbRun('UPDATE platforms SET last_crawl = NULL');
    results.platforms_reset = platformsResult.changes || 0;
    
    // 提交事务
    await dbRun('COMMIT');
    
    // 验证清理结果
    const verification: any = {};
    const tables = ['dramas', 'drama_platforms', 'celebrities', 'cast_relations', 'rankings', 'ranking_items'];
    
    for (const table of tables) {
      const countResult = await dbAll(`SELECT COUNT(*) as count FROM ${table}`);
      verification[table] = countResult[0].count;
    }
    
    // 检查平台数据
    const platformsCount = await dbAll('SELECT COUNT(*) as count FROM platforms');
    verification.platforms = platformsCount[0].count;
    
    const platforms = await dbAll('SELECT id, name FROM platforms');
    
    console.log('数据清理完成');
    
    res.json({
      success: true,
      message: '数据库测试数据清理完成',
      deleted_records: results,
      verification: verification,
      preserved_platforms: platforms
    });
    
  } catch (error) {
    console.error('清理数据库时出错:', error);
    
    try {
      await dbRun('ROLLBACK');
      console.log('已回滚事务');
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError);
    }
    
    res.status(500).json({
      success: false,
      message: '清理数据库时出错',
      error: error.message
    });
  }
});

// 获取数据库状态的API接口
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = {};
    const tables = ['dramas', 'platforms', 'drama_platforms', 'celebrities', 'cast_relations', 'rankings', 'ranking_items'];
    
    for (const table of tables) {
      const countResult = await dbAll(`SELECT COUNT(*) as count FROM ${table}`);
      status[table] = countResult[0].count;
    }
    
    // 获取平台信息
    const platforms = await dbAll('SELECT id, name, last_crawl FROM platforms');
    
    res.json({
      success: true,
      table_counts: status,
      platforms: platforms
    });
    
  } catch (error) {
    console.error('获取数据库状态时出错:', error);
    res.status(500).json({
      success: false,
      message: '获取数据库状态时出错',
      error: error.message
    });
  }
});

export default router;