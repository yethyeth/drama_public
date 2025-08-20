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

// 检查所有表的数据
async function checkDatabaseData() {
  try {
    console.log('\n=== 数据库数据检查 ===\n');
    
    // 检查所有表
    const tables = [
      'dramas',
      'platforms', 
      'drama_platforms',
      'celebrities',
      'cast_relations',
      'rankings',
      'ranking_items'
    ];
    
    for (const table of tables) {
      console.log(`--- ${table} 表 ---`);
      
      // 获取表的行数
      const countResult = await dbAll(`SELECT COUNT(*) as count FROM ${table}`);
      const count = countResult[0].count;
      console.log(`总记录数: ${count}`);
      
      if (count > 0) {
        // 显示前5条记录
        const rows = await dbAll(`SELECT * FROM ${table} LIMIT 5`);
        console.log('前5条记录:');
        rows.forEach((row, index) => {
          console.log(`  ${index + 1}:`, JSON.stringify(row, null, 2));
        });
      } else {
        console.log('  表为空');
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('检查数据库时出错:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接时出错:', err.message);
      } else {
        console.log('数据库连接已关闭');
      }
    });
  }
}

// 运行检查
checkDatabaseData();