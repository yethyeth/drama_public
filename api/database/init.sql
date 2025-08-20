-- 短剧数据分析工具数据库初始化脚本
-- 创建所有必要的表结构和索引

-- 创建短剧主表
CREATE TABLE IF NOT EXISTS dramas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    director TEXT,
    poster_url TEXT,
    source_url TEXT, -- 短剧在原平台的网址
    episode_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'upcoming')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建平台表
CREATE TABLE IF NOT EXISTS platforms (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    base_url TEXT NOT NULL,
    crawler_config TEXT, -- JSON格式存储爬虫配置
    last_crawl DATETIME
);

-- 创建短剧平台关联表
CREATE TABLE IF NOT EXISTS drama_platforms (
    id TEXT PRIMARY KEY,
    drama_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    platform_url TEXT,
    view_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    metadata TEXT, -- JSON格式存储平台特有数据
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drama_id) REFERENCES dramas(id),
    FOREIGN KEY (platform_id) REFERENCES platforms(id)
);

-- 创建演员导演表
CREATE TABLE IF NOT EXISTS celebrities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female', 'unknown')),
    type TEXT CHECK (type IN ('actor', 'director', 'both')),
    avatar_url TEXT,
    popularity_score INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建演职人员关联表
CREATE TABLE IF NOT EXISTS cast_relations (
    id TEXT PRIMARY KEY,
    drama_id TEXT NOT NULL,
    celebrity_id TEXT NOT NULL,
    role_type TEXT CHECK (role_type IN ('lead_actor', 'supporting_actor', 'director')),
    character_name TEXT,
    FOREIGN KEY (drama_id) REFERENCES dramas(id),
    FOREIGN KEY (celebrity_id) REFERENCES celebrities(id)
);

-- 创建榜单表
CREATE TABLE IF NOT EXISTS rankings (
    id TEXT PRIMARY KEY,
    platform_id TEXT,
    name TEXT NOT NULL,
    category TEXT,
    crawl_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_merged BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (platform_id) REFERENCES platforms(id)
);

-- 创建榜单项目表
CREATE TABLE IF NOT EXISTS ranking_items (
    id TEXT PRIMARY KEY,
    ranking_id TEXT NOT NULL,
    drama_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    metrics TEXT, -- JSON格式存储评分、播放量等指标
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ranking_id) REFERENCES rankings(id),
    FOREIGN KEY (drama_id) REFERENCES dramas(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_drama_platforms_drama_id ON drama_platforms(drama_id);
CREATE INDEX IF NOT EXISTS idx_drama_platforms_platform_id ON drama_platforms(platform_id);
CREATE INDEX IF NOT EXISTS idx_cast_relations_drama_id ON cast_relations(drama_id);
CREATE INDEX IF NOT EXISTS idx_cast_relations_celebrity_id ON cast_relations(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_ranking_items_ranking_id ON ranking_items(ranking_id);
CREATE INDEX IF NOT EXISTS idx_ranking_items_position ON ranking_items(position);
CREATE INDEX IF NOT EXISTS idx_celebrities_popularity_score ON celebrities(popularity_score DESC);

-- 初始化平台数据
INSERT OR IGNORE INTO platforms (id, name, base_url) VALUES 
('tencent', '腾讯视频', 'https://v.qq.com/channel/mini_drama'),
('youku', '优酷', 'https://www.youku.com/ku/webduanju'),
('iqiyi', '爱奇艺', 'https://www.iqiyi.com/microdrama/'),
('douyin', '抖音', 'https://www.douyin.com/series');