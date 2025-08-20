import { Router } from 'express';
import { dbRun } from '../database';
import { v4 as uuidv4 } from 'uuid';

const router: Router = Router();

/**
 * 插入测试数据
 */
router.post('/insert', async (req, res) => {
  try {
    const now = new Date().toISOString();
    
    // 插入平台数据
    const platforms = [
      { id: 'tencent', name: '腾讯视频', base_url: 'https://v.qq.com' },
      { id: 'youku', name: '优酷', base_url: 'https://www.youku.com' },
      { id: 'iqiyi', name: '爱奇艺', base_url: 'https://www.iqiyi.com' },
      { id: 'douyin', name: '抖音', base_url: 'https://www.douyin.com' }
    ];
    
    for (const platform of platforms) {
      await dbRun(
        'INSERT OR REPLACE INTO platforms (id, name, base_url, last_crawl) VALUES (?, ?, ?, ?)',
        [platform.id, platform.name, platform.base_url, now]
      );
    }
    
    // 插入短剧数据
    const dramas = [
      {
        id: uuidv4(),
        title: '霸道总裁爱上我',
        description: '一个普通女孩与霸道总裁的爱情故事',
        director: '张导演',
        episode_count: 24,
        status: 'completed'
      },
      {
        id: uuidv4(),
        title: '穿越之王妃很忙',
        description: '现代女孩穿越古代成为王妃的故事',
        director: '李导演',
        episode_count: 30,
        status: 'ongoing'
      },
      {
        id: uuidv4(),
        title: '重生之商业帝国',
        description: '重生回到过去创建商业帝国',
        director: '王导演',
        episode_count: 36,
        status: 'completed'
      },
      {
        id: uuidv4(),
        title: '校园甜宠日记',
        description: '校园里的甜蜜爱情故事',
        director: '赵导演',
        episode_count: 20,
        status: 'ongoing'
      },
      {
        id: uuidv4(),
        title: '都市修仙传',
        description: '现代都市中的修仙故事',
        director: '陈导演',
        episode_count: 40,
        status: 'upcoming'
      }
    ];
    
    for (const drama of dramas) {
      await dbRun(
        'INSERT OR REPLACE INTO dramas (id, title, description, director, episode_count, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [drama.id, drama.title, drama.description, drama.director, drama.episode_count, drama.status, now, now]
      );
      
      // 为每个短剧添加平台数据
      for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        const viewCount = Math.floor(Math.random() * 10000000) + 100000; // 10万到1000万播放量
        const rating = Math.floor(Math.random() * 50) + 50; // 5.0到10.0评分
        
        await dbRun(
          'INSERT OR REPLACE INTO drama_platforms (id, drama_id, platform_id, platform_url, view_count, rating, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            uuidv4(),
            drama.id,
            platform.id,
            `${platform.base_url}/drama/${drama.id}`,
            viewCount,
            rating / 10,
            now
          ]
        );
      }
    }
    
    // 插入演员数据
    const celebrities = [
      { id: uuidv4(), name: '张三', gender: 'male', type: 'actor', popularity_score: 85 },
      { id: uuidv4(), name: '李四', gender: 'female', type: 'actor', popularity_score: 92 },
      { id: uuidv4(), name: '王五', gender: 'male', type: 'director', popularity_score: 78 },
      { id: uuidv4(), name: '赵六', gender: 'female', type: 'actor', popularity_score: 88 },
      { id: uuidv4(), name: '钱七', gender: 'male', type: 'both', popularity_score: 95 }
    ];
    
    for (const celebrity of celebrities) {
      await dbRun(
        'INSERT OR REPLACE INTO celebrities (id, name, gender, type, popularity_score, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [celebrity.id, celebrity.name, celebrity.gender, celebrity.type, celebrity.popularity_score, now]
      );
    }
    
    // 插入排行榜数据
    const rankings = [
      { id: uuidv4(), platform_id: 'tencent', name: '腾讯热播榜', category: 'hot', is_merged: false },
      { id: uuidv4(), platform_id: 'youku', name: '优酷新剧榜', category: 'new', is_merged: false },
      { id: uuidv4(), platform_id: null, name: '综合热度榜', category: 'merged', is_merged: true }
    ];
    
    for (const ranking of rankings) {
      await dbRun(
        'INSERT OR REPLACE INTO rankings (id, platform_id, name, category, crawl_time, is_merged) VALUES (?, ?, ?, ?, ?, ?)',
        [ranking.id, ranking.platform_id, ranking.name, ranking.category, now, ranking.is_merged ? 1 : 0]
      );
      
      // 为每个排行榜添加排行项目
      for (let i = 0; i < Math.min(dramas.length, 3); i++) {
        await dbRun(
          'INSERT OR REPLACE INTO ranking_items (id, ranking_id, drama_id, position, recorded_at) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), ranking.id, dramas[i].id, i + 1, now]
        );
      }
    }
    
    res.json({
      success: true,
      message: '测试数据插入成功',
      data: {
        platforms: platforms.length,
        dramas: dramas.length,
        celebrities: celebrities.length,
        rankings: rankings.length
      }
    });
    
  } catch (error) {
    console.error('插入测试数据失败:', error);
    res.status(500).json({
      success: false,
      message: '插入测试数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 清空所有数据
 */
router.delete('/clear', async (req, res) => {
  try {
    const tables = ['ranking_items', 'rankings', 'cast_relations', 'drama_platforms', 'celebrities', 'dramas', 'platforms'];
    
    for (const table of tables) {
      await dbRun(`DELETE FROM ${table}`);
    }
    
    res.json({
      success: true,
      message: '所有数据已清空'
    });
    
  } catch (error) {
    console.error('清空数据失败:', error);
    res.status(500).json({
      success: false,
      message: '清空数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;