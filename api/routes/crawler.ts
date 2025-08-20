import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { crawlerManager } from '../crawler/index.ts';
import { dbRun, dbGet } from '../database/index.ts';

const router: Router = Router();

// 爬虫任务状态接口
interface CrawlerTask {
  id: string;
  platform: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

// 活跃任务存储
const activeTasks = new Map<string, CrawlerTask>();

/**
 * 启动爬虫任务
 * POST /api/crawler/start
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { platform, type, options = {} } = req.body;
    
    // 验证必需参数
    if (!platform || !type) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: platform 和 type'
      });
    }
    
    // 获取支持的平台列表
    const supportedPlatforms = [...crawlerManager.getSupportedPlatforms(), 'all'];
    if (!supportedPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `不支持的平台: ${platform}。支持的平台: ${supportedPlatforms.join(', ')}`
      });
    }
    
    // 验证任务类型
    const supportedTypes = ['drama_list', 'ranking', 'detail', 'health_check'];
    if (!supportedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `不支持的任务类型: ${type}。支持的类型: ${supportedTypes.join(', ')}`
      });
    }
    
    // 创建新任务
    const taskId = uuidv4();
    const task: CrawlerTask = {
      id: taskId,
      platform,
      type,
      status: 'pending',
      progress: 0,
      ...options // 将额外选项合并到任务中
    };
    
    // 存储任务
    activeTasks.set(taskId, task);
    
    // 异步执行任务
    executeCrawlerTask(task).catch(error => {
      console.error(`任务执行异常: ${taskId}`, error);
    });
    
    res.json({
      success: true,
      data: {
        taskId,
        message: '爬虫任务已启动',
        task: {
          id: task.id,
          platform: task.platform,
          type: task.type,
          status: task.status,
          progress: task.progress
        }
      }
    });
    
  } catch (error) {
    console.error('启动爬虫任务失败:', error);
    res.status(500).json({
      success: false,
      error: '启动爬虫任务失败'
    });
  }
});

/**
 * 获取任务状态
 * GET /api/crawler/status/:taskId
 */
router.get('/status/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = activeTasks.get(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    res.json({
      success: true,
      data: {
        taskId: task.id,
        platform: task.platform,
        type: task.type,
        status: task.status,
        progress: task.progress || 0,
        error: task.error,
        startTime: task.startTime,
        endTime: task.endTime
      }
    });
    
  } catch (error) {
    console.error('获取任务状态失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 获取所有任务列表
 * GET /api/crawler/tasks
 */
router.get('/tasks', (req: Request, res: Response) => {
  try {
    const tasks = Array.from(activeTasks.values()).map(task => ({
      taskId: task.id,
      platform: task.platform,
      type: task.type,
      status: task.status,
      progress: task.progress || 0,
      startTime: task.startTime,
      endTime: task.endTime
    }));
    
    res.json({
      success: true,
      data: tasks
    });
    
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 停止爬虫任务
 * POST /api/crawler/stop/:taskId
 */
router.post('/stop/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = activeTasks.get(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    if (task.status === 'completed' || task.status === 'failed') {
      return res.status(400).json({
        success: false,
        error: '任务已结束，无法停止'
      });
    }
    
    task.status = 'failed';
    task.error = '用户手动停止';
    task.endTime = new Date();
    
    res.json({
      success: true,
      message: '任务已停止'
    });
    
  } catch (error) {
    console.error('停止任务失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 执行爬虫任务的核心逻辑
 */
async function executeCrawlerTask(task: CrawlerTask): Promise<void> {
  try {
    console.log(`开始执行爬虫任务: ${task.id} - ${task.platform} - ${task.type}`);
    
    task.status = 'running';
    task.startTime = new Date();
    task.progress = 10;
    
    let result;
    
    // 根据任务类型执行不同的爬虫操作
    switch (task.type) {
      case 'drama_list':
        task.progress = 30;
        if (task.platform === 'all') {
          result = await crawlerManager.getDramaList();
        } else {
          result = await crawlerManager.executeSingleTask(task.platform, 'drama_list');
        }
        break;
        
      case 'ranking':
        task.progress = 30;
        if (task.platform === 'all') {
          result = await crawlerManager.getRankings();
        } else {
          result = await crawlerManager.executeSingleTask(task.platform, 'ranking');
        }
        break;
        
      case 'detail':
        task.progress = 30;
        // 详情任务需要额外参数
        const dramaId = (task as any).dramaId;
        if (!dramaId) {
          throw new Error('获取详情需要提供短剧ID');
        }
        result = await crawlerManager.getDramaDetail(task.platform, dramaId);
        break;
        
      case 'health_check':
        task.progress = 30;
        result = await crawlerManager.healthCheck();
        break;
        
      default:
        throw new Error(`不支持的任务类型: ${task.type}`);
    }
    
    task.progress = 80;
    
    // 严格检查结果有效性
    if (!result) {
      throw new Error('爬虫任务未返回数据');
    }
    
    // 检查结果是否包含真实数据
    if (task.type === 'drama_list' || task.type === 'ranking') {
      let hasValidData = false;
      
      if (result.success) {
        // 多平台结果检查
        if (result.results && Array.isArray(result.results)) {
          hasValidData = result.results.some((platformResult: any) => 
            platformResult.success && 
            platformResult.data && 
            Array.isArray(platformResult.data) && 
            platformResult.data.length > 0
          );
        }
        // 单平台结果检查
        else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          hasValidData = true;
        }
      }
      
      if (!hasValidData) {
        throw new Error(`${task.platform}平台爬虫未能获取到有效的${task.type === 'drama_list' ? '短剧列表' : '排行榜'}数据`);
      }
    }
    
    task.result = result;
    
    // 保存数据到数据库
    await saveTaskResultToDatabase(task.type, result);
    
    task.status = 'completed';
    task.endTime = new Date();
    task.progress = 100;
    
    console.log(`爬虫任务完成: ${task.id}`);
    
  } catch (error) {
    console.error(`爬虫任务失败: ${task.id}`, error);
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : '未知错误';
    task.endTime = new Date();
    task.progress = 100; // 确保失败的任务也显示为完成状态
  }
}

// 获取爬虫统计信息
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = crawlerManager.getStats();
    const activeTaskCount = activeTasks.size;
    const runningTasks = Array.from(activeTasks.values()).filter(t => t.status === 'running').length;
    
    res.json({
      success: true,
      data: {
        ...stats,
        activeTasks: activeTaskCount,
        runningTasks,
        taskHistory: {
          total: activeTasks.size,
          completed: Array.from(activeTasks.values()).filter(t => t.status === 'completed').length,
          failed: Array.from(activeTasks.values()).filter(t => t.status === 'failed').length
        }
      }
    });
  } catch (error) {
    console.error('获取爬虫统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息失败'
    });
  }
});

// 健康检查
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthStatus = await crawlerManager.healthCheck();
    
    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('爬虫健康检查失败:', error);
    res.status(500).json({
      success: false,
      error: '健康检查失败'
    });
  }
});

/**
 * 保存任务结果到数据库
 */
async function saveTaskResultToDatabase(taskType: string, result: any): Promise<void> {
  try {
    console.log(`开始保存${taskType}数据到数据库`);
    
    switch (taskType) {
      case 'drama_list':
        await saveDramaListToDatabase(result);
        break;
      case 'ranking':
        await saveRankingToDatabase(result);
        break;
      case 'detail':
        // 详情数据通常用于更新现有记录
        console.log('详情数据暂不保存到数据库');
        break;
      case 'health_check':
        // 健康检查结果不需要保存
        console.log('健康检查结果不保存到数据库');
        break;
      default:
        console.log(`未知任务类型: ${taskType}，跳过数据保存`);
    }
    
    console.log(`${taskType}数据保存完成`);
  } catch (error) {
    console.error(`保存${taskType}数据失败:`, error);
    throw error;
  }
}

/**
 * 保存短剧列表数据到数据库
 */
async function saveDramaListToDatabase(result: any): Promise<void> {
  if (!result || !result.success) {
    console.log('短剧列表结果无效，跳过保存');
    throw new Error('短剧列表结果无效，无法保存到数据库');
  }
  
  let dramas: any[] = [];
  
  // 处理多平台结果
  if (result.results && Array.isArray(result.results)) {
    for (const platformResult of result.results) {
      if (platformResult.success && platformResult.data && Array.isArray(platformResult.data)) {
        // 验证每个短剧数据的有效性
        const validDramas = platformResult.data.filter((drama: any) => {
          return drama && 
                 typeof drama.title === 'string' && 
                 drama.title.trim() !== '' &&
                 typeof drama.platform === 'string' &&
                 drama.platform.trim() !== '';
        });
        dramas = dramas.concat(validDramas);
        console.log(`${platformResult.platform || '未知平台'}: 过滤后有效短剧数量 ${validDramas.length}/${platformResult.data.length}`);
      }
    }
  }
  // 处理单平台结果
  else if (result.data && Array.isArray(result.data)) {
    // 验证每个短剧数据的有效性
    dramas = result.data.filter((drama: any) => {
      return drama && 
             typeof drama.title === 'string' && 
             drama.title.trim() !== '' &&
             typeof drama.platform === 'string' &&
             drama.platform.trim() !== '';
    });
    console.log(`单平台结果: 过滤后有效短剧数量 ${dramas.length}/${result.data.length}`);
  }
  
  if (dramas.length === 0) {
    console.log('没有有效的短剧数据，跳过保存');
    throw new Error('没有有效的短剧数据可以保存到数据库');
  }
  
  console.log(`准备保存 ${dramas.length} 部有效短剧到数据库`);
  
  for (const drama of dramas) {
    try {
      console.log(`处理短剧: ${drama.title}, platform字段值:`, drama.platform, `类型: ${typeof drama.platform}`);
      console.log(`短剧数据结构:`, JSON.stringify(drama, null, 2));
      
      // 检查平台是否存在，不存在则创建
      let platformId = await ensurePlatformExists(drama.platform);
      
      // 生成短剧ID
      const dramaId = `drama_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 插入短剧基本信息
      await dbRun(
        `INSERT OR REPLACE INTO dramas 
         (id, title, description, episode_count, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          dramaId,
          drama.title || '未知标题',
          drama.description || '',
          drama.episode_count || 0,
          drama.status || 'ongoing'
        ]
      );
      
      // 插入平台关联信息
      await dbRun(
        `INSERT OR REPLACE INTO drama_platforms 
         (id, drama_id, platform_id, platform_url, view_count, rating, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          `dp_${dramaId}_${platformId}`,
          dramaId,
          platformId,
          drama.source_url || '',
          drama.view_count || 0,
          drama.score || 0
        ]
      );
      
      // 保存演员数据
      if (drama.actors && Array.isArray(drama.actors)) {
        console.log(`短剧 ${drama.title} 包含 ${drama.actors.length} 个演员`);
        await saveActorsToDatabase(drama.actors, dramaId);
      } else {
        console.log(`短剧 ${drama.title} 没有演员数据:`, drama.actors);
      }
      
      console.log(`保存短剧: ${drama.title}`);
    } catch (error) {
      console.error(`保存短剧失败: ${drama.title}`, error);
    }
  }
}

/**
 * 保存排行榜数据到数据库
 */
async function saveRankingToDatabase(result: any): Promise<void> {
  console.log('排行榜数据保存功能待实现');
  // TODO: 实现排行榜数据保存逻辑
}

/**
 * 保存演员数据到数据库
 */
async function saveActorsToDatabase(actors: any[], dramaId: string): Promise<void> {
  if (!actors || !Array.isArray(actors) || actors.length === 0) {
    return;
  }
  
  console.log(`准备保存 ${actors.length} 个演员到数据库`);
  
  for (const actor of actors) {
    try {
      if (!actor.name || typeof actor.name !== 'string') {
        continue;
      }
      
      const actorName = actor.name.trim();
      if (!actorName) {
        continue;
      }
      
      // 检查演员是否已存在（根据姓名去重）
      let existingActor = await dbGet(
        'SELECT id FROM celebrities WHERE name = ?',
        [actorName]
      );
      
      let celebrityId: string;
      
      if (existingActor) {
        // 演员已存在，使用现有ID
        celebrityId = existingActor.id;
        console.log(`演员已存在: ${actorName}`);
      } else {
        // 创建新演员
        celebrityId = `celebrity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await dbRun(
          `INSERT INTO celebrities 
           (id, name, gender, type, avatar_url, popularity_score, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            celebrityId,
            actorName,
            'unknown', // 默认性别
            actor.type || 'actor', // 演员类型：actor, director, both
            actor.avatar_url || '',
            0 // 默认人气分数
          ]
        );
        
        console.log(`创建新演员: ${actorName}`);
      }
      
      // 检查演员与短剧的关联关系是否已存在
      const existingRelation = await dbGet(
        'SELECT id FROM cast_relations WHERE drama_id = ? AND celebrity_id = ?',
        [dramaId, celebrityId]
      );
      
      if (!existingRelation) {
        // 创建演员与短剧的关联关系
        const relationId = `relation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 根据演员类型确定角色类型
        let roleType = 'supporting_actor'; // 默认为配角
        if (actor.type === 'director') {
          roleType = 'director';
        } else if (actor.type === 'actor') {
          roleType = 'lead_actor'; // 假设爬取到的演员都是主演
        }
        
        await dbRun(
          `INSERT INTO cast_relations 
           (id, drama_id, celebrity_id, role_type, character_name) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            relationId,
            dramaId,
            celebrityId,
            roleType,
            actor.character_name || '' // 角色名称，如果有的话
          ]
        );
        
        console.log(`创建演员关联: ${actorName} -> ${dramaId}`);
      }
      
    } catch (error) {
      console.error(`保存演员失败: ${actor.name}`, error);
    }
  }
}

/**
 * 确保平台存在，不存在则创建
 */
async function ensurePlatformExists(platformName: string): Promise<string> {
  // 验证平台名称
  if (!platformName || typeof platformName !== 'string' || platformName.trim() === '') {
    throw new Error(`无效的平台名称: ${platformName}`);
  }
  
  const normalizedName = platformName.trim();
  
  // 查找现有平台
  const existingPlatform = await dbGet(
    'SELECT id FROM platforms WHERE name = ?',
    [normalizedName]
  );
  
  if (existingPlatform) {
    return existingPlatform.id;
  }
  
  // 创建新平台
  const platformId = `platform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await dbRun(
    'INSERT INTO platforms (id, name, base_url) VALUES (?, ?, ?)',
    [platformId, normalizedName, '']
  );
  
  console.log(`创建新平台: ${normalizedName}`);
  return platformId;
}

export default router;