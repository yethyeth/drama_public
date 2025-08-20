import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库文件路径
const DB_PATH = join(__dirname, '../../data/drama.db');

// 创建数据库连接
export const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功');
  }
});

// 初始化数据库
export const initDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const initSQL = readFileSync(join(__dirname, 'init.sql'), 'utf8');
      
      // 分割SQL语句并执行
      const statements = initSQL.split(';').filter(stmt => stmt.trim());
      
      let completed = 0;
      const total = statements.length;
      
      statements.forEach((statement) => {
        db.run(statement, (err) => {
          if (err) {
            console.error('SQL执行错误:', err.message);
            console.error('SQL语句:', statement);
            reject(err);
            return;
          }
          
          completed++;
          if (completed === total) {
            console.log('数据库初始化完成');
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('读取SQL文件失败:', error);
      reject(error);
    }
  });
};

// 数据库查询封装
export const dbGet = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row as T);
      }
    });
  });
};

export const dbAll = <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
};

export const dbRun = (sql: string, params: any[] = []): Promise<sqlite3.RunResult> => {
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

// 关闭数据库连接
export const closeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('数据库连接已关闭');
        resolve();
      }
    });
  });
};

// 数据类型定义
export interface Drama {
  id: string;
  title: string;
  description?: string;
  director?: string;
  poster_url?: string;
  source_url?: string; // 短剧在原平台的网址
  episode_count: number;
  status: 'ongoing' | 'completed' | 'upcoming';
  created_at: string;
  updated_at: string;
}

export interface Platform {
  id: string;
  name: string;
  base_url: string;
  crawler_config?: string;
  last_crawl?: string;
}

export interface DramaPlatform {
  id: string;
  drama_id: string;
  platform_id: string;
  platform_url?: string;
  view_count: number;
  rating: number;
  metadata?: string;
  updated_at: string;
}

export interface Celebrity {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'unknown';
  type: 'actor' | 'director' | 'both';
  avatar_url?: string;
  popularity_score: number;
  created_at: string;
}

export interface CastRelation {
  id: string;
  drama_id: string;
  celebrity_id: string;
  role_type: 'lead_actor' | 'supporting_actor' | 'director';
  character_name?: string;
}

export interface Ranking {
  id: string;
  platform_id?: string;
  name: string;
  category?: string;
  crawl_time: string;
  is_merged: boolean;
}

export interface RankingItem {
  id: string;
  ranking_id: string;
  drama_id: string;
  position: number;
  metrics?: string;
  recorded_at: string;
}