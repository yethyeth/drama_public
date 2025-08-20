import sqlite3 from 'sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库文件路径
const DB_PATH = join(__dirname, '../data/drama.db');

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  } else {
    console.log('数据库连接成功');
  }
});

// 执行SQL函数
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

// 查询函数
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// 清理数据库测试数据
async function cleanupDatabase() {
  try {
    console.log('\n=== 开始清理数据库测试数据 ===\n');
    
    // 开始事务
    await dbRun('BEGIN TRANSACTION');
    
    // 1. 清空榜单项目表（有外键依赖，先清理）
    console.log('清理榜单项目数据...');
    const rankingItemsResult = await dbRun('DELETE FROM ranking_items');
    console.log(`已删除 ${rankingItemsResult.changes} 条榜单项目记录`);
    
    // 2. 清空演职人员关联表
    console.log('清理演职人员关联数据...');
    const castRelationsResult = await dbRun('DELETE FROM cast_relations');
    console.log(`已删除 ${castRelationsResult.changes} 条演职人员关联记录`);
    
    // 3. 清空短剧平台关联表
    console.log('清理短剧平台关联数据...');
    const dramaPlatformsResult = await dbRun('DELETE FROM drama_platforms');
    console.log(`已删除 ${dramaPlatformsResult.changes} 条短剧平台关联记录`);
    
    // 4. 清空榜单表
    console.log('清理榜单数据...');
    const rankingsResult = await dbRun('DELETE FROM rankings');
    console.log(`已删除 ${rankingsResult.changes} 条榜单记录`);
    
    // 5. 清空演员导演表
    console.log('清理演员导演数据...');
    const celebritiesResult = await dbRun('DELETE FROM celebrities');
    console.log(`已删除 ${celebritiesResult.changes} 条演员导演记录`);
    
    // 6. 清空短剧主表
    console.log('清理短剧数据...');
    const dramasResult = await dbRun('DELETE FROM dramas');
    console.log(`已删除 ${dramasResult.changes} 条短剧记录`);
    
    // 7. 保留平台数据，但重置爬取时间
    console.log('重置平台爬取时间...');
    const platformsResult = await dbRun('UPDATE platforms SET last_crawl = NULL');
    console.log(`已重置 ${platformsResult.changes} 个平台的爬取时间`);
    
    // 提交事务
    await dbRun('COMMIT');
    
    console.log('\n=== 数据清理完成 ===');
    
    // 验证清理结果
    console.log('\n=== 验证清理结果 ===');
    const tables = ['dramas', 'drama_platforms', 'celebrities', 'cast_relations', 'rankings', 'ranking_items'];
    
    for (const table of tables) {
      const countResult = await dbAll(`SELECT COUNT(*) as count FROM ${table}`);
      const count = countResult[0].count;
      console.log(`${table}: ${count} 条记录`);
    }
    
    // 检查平台数据是否保留
    const platformsCount = await dbAll('SELECT COUNT(*) as count FROM platforms');
    console.log(`platforms: ${platformsCount[0].count} 条记录（应保留4个平台）`);
    
    const platforms = await dbAll('SELECT id, name FROM platforms');
    console.log('保留的平台:');
    platforms.forEach(platform => {
      console.log(`  - ${platform.id}: ${platform.name}`);
    });
    
  } catch (error) {
    console.error('清理数据库时出错:', error);
    try {
      await dbRun('ROLLBACK');
      console.log('已回滚事务');
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError);
    }
  } finally {
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接时出错:', err.message);
      } else {
        console.log('\n数据库连接已关闭');
      }
    });
  }
}

// 运行清理
cleanupDatabase();