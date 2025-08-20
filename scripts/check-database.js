import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库文件路径
const dbPath = path.join(__dirname, '..', 'data', 'drama.db');

console.log('正在检查数据库:', dbPath);

// 连接数据库
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('连接数据库失败:', err.message);
    return;
  }
  console.log('成功连接到SQLite数据库');
});

// 检查各个表的数据量
function checkTableCounts() {
  const tables = ['dramas', 'platforms', 'drama_platforms', 'celebrities', 'cast_relations', 'rankings', 'ranking_items'];
  
  console.log('\n=== 数据表统计 ===');
  
  let completed = 0;
  tables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
      if (err) {
        console.error(`查询${table}表失败:`, err.message);
      } else {
        console.log(`${table}: ${row.count} 条记录`);
      }
      
      completed++;
      if (completed === tables.length) {
        checkSampleData();
      }
    });
  });
}

// 检查样本数据
function checkSampleData() {
  console.log('\n=== 短剧数据样本 ===');
  
  db.all(`
    SELECT 
      d.id, d.title, d.description, dp.view_count, dp.rating, d.episode_count,
      p.name as platform_name,
      d.created_at
    FROM dramas d
    LEFT JOIN drama_platforms dp ON d.id = dp.drama_id
    LEFT JOIN platforms p ON dp.platform_id = p.id
    ORDER BY d.created_at DESC
    LIMIT 10
  `, (err, rows) => {
    if (err) {
      console.error('查询短剧数据失败:', err.message);
    } else {
      if (rows.length === 0) {
        console.log('❌ 没有找到短剧数据');
      } else {
        console.log(`✅ 找到 ${rows.length} 条短剧记录:`);
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.title} (${row.platform_name || '未知平台'})`);
          console.log(`   观看量: ${row.view_count || 0}, 评分: ${row.rating || 'N/A'}, 集数: ${row.episode_count || 0}`);
          console.log(`   创建时间: ${row.created_at}`);
          console.log('');
        });
      }
    }
    
    checkPlatforms();
  });
}

// 检查平台数据
function checkPlatforms() {
  console.log('\n=== 平台数据 ===');
  
  db.all(`
    SELECT 
      p.id, p.name, p.base_url,
      COUNT(dp.drama_id) as drama_count
    FROM platforms p
    LEFT JOIN drama_platforms dp ON p.id = dp.platform_id
    GROUP BY p.id, p.name, p.base_url
  `, (err, rows) => {
    if (err) {
      console.error('查询平台数据失败:', err.message);
    } else {
      if (rows.length === 0) {
        console.log('❌ 没有找到平台数据');
      } else {
        console.log(`✅ 找到 ${rows.length} 个平台:`);
        rows.forEach(row => {
          console.log(`- ${row.name}: ${row.drama_count} 部短剧`);
        });
      }
    }
    
    checkCelebrities();
  });
}

// 检查演员数据
function checkCelebrities() {
  console.log('\n=== 演员数据 ===');
  
  db.all(`
    SELECT 
      c.id, c.name, c.avatar_url,
      COUNT(cr.drama_id) as drama_count
    FROM celebrities c
    LEFT JOIN cast_relations cr ON c.id = cr.celebrity_id
    GROUP BY c.id, c.name, c.avatar_url
    ORDER BY drama_count DESC
    LIMIT 10
  `, (err, rows) => {
    if (err) {
      console.error('查询演员数据失败:', err.message);
    } else {
      if (rows.length === 0) {
        console.log('❌ 没有找到演员数据');
      } else {
        console.log(`✅ 找到 ${rows.length} 位演员 (显示前10位):`);
        rows.forEach(row => {
          console.log(`- ${row.name}: 参演 ${row.drama_count} 部短剧`);
        });
      }
    }
    
    checkRecentActivity();
  });
}

// 检查最近活动
function checkRecentActivity() {
  console.log('\n=== 最近数据更新 ===');
  
  db.get(`
    SELECT 
      MAX(created_at) as latest_drama,
      COUNT(*) as total_dramas
    FROM dramas
  `, (err, row) => {
    if (err) {
      console.error('查询最近活动失败:', err.message);
    } else {
      console.log(`最新短剧添加时间: ${row.latest_drama || '无数据'}`);
      console.log(`短剧总数: ${row.total_dramas}`);
    }
    
    // 关闭数据库连接
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接失败:', err.message);
      } else {
        console.log('\n数据库检查完成');
      }
    });
  });
}

// 开始检查
checkTableCounts();