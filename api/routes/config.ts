import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router: Router = Router();

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件路径
const CONFIG_FILE_PATH = path.join(__dirname, '../../config/app-config.json');

// 默认配置
const DEFAULT_CONFIG = {
  ports: {
    frontendPort: 5173,
    backendPort: 3004,
    autoStart: true,
    enableHttps: false,
    corsEnabled: true
  },
  crawler: {
    maxConcurrentTasks: 5,
    requestDelay: 1000,
    timeout: 30000,
    retryAttempts: 3,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    headless: true,
    antiDetection: {
      randomDelay: true,
      rotateUserAgent: false,
      enableCookies: true,
      respectRobotsTxt: true
    }
  },
  database: {
    autoBackup: true,
    backupInterval: 24,
    maxBackups: 7,
    compressionEnabled: true
  },
  notifications: {
    emailEnabled: false,
    webhookEnabled: false,
    webhookUrl: ''
  }
};

/**
 * 迁移旧配置结构到新结构
 */
function migrateConfig(config: any) {
  const migratedConfig = { ...config };
  
  // 迁移 crawlerConfig 到 crawler
  if (config.crawlerConfig) {
    if (!config.crawler) {
      migratedConfig.crawler = {
        ...config.crawlerConfig,
        // 添加新的反检测配置
        antiDetection: {
          randomDelay: true,
          rotateUserAgent: false,
          enableCookies: true,
          respectRobotsTxt: true
        }
      };
    } else {
      // 如果 crawler 已存在，合并 crawlerConfig 的设置
      migratedConfig.crawler = {
        ...config.crawlerConfig,
        ...config.crawler,
        antiDetection: {
          randomDelay: true,
          rotateUserAgent: false,
          enableCookies: true,
          respectRobotsTxt: true,
          ...(config.crawler.antiDetection || {})
        }
      };
    }
    delete migratedConfig.crawlerConfig;
  }
  
  // 迁移 portConfig 到 ports
  if (config.portConfig) {
    if (!config.ports) {
      migratedConfig.ports = config.portConfig;
    } else {
      migratedConfig.ports = { ...config.portConfig, ...config.ports };
    }
    delete migratedConfig.portConfig;
  }
  
  // 迁移 databaseConfig 到 database
  if (config.databaseConfig) {
    if (!config.database) {
      migratedConfig.database = config.databaseConfig;
    } else {
      migratedConfig.database = { ...config.databaseConfig, ...config.database };
    }
    delete migratedConfig.databaseConfig;
  }
  
  // 迁移 notificationConfig 到 notifications
  if (config.notificationConfig) {
    if (!config.notifications) {
      migratedConfig.notifications = {
        emailEnabled: config.notificationConfig.emailNotifications || false,
        webhookEnabled: !!config.notificationConfig.webhookUrl,
        webhookUrl: config.notificationConfig.webhookUrl || ''
      };
    } else {
      migratedConfig.notifications = {
        emailEnabled: config.notificationConfig.emailNotifications || false,
        webhookEnabled: !!config.notificationConfig.webhookUrl,
        webhookUrl: config.notificationConfig.webhookUrl || '',
        ...config.notifications
      };
    }
    delete migratedConfig.notificationConfig;
  }
  
  return migratedConfig;
}

/**
 * 确保配置目录存在
 */
async function ensureConfigDir() {
  const configDir = path.dirname(CONFIG_FILE_PATH);
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}

/**
 * 读取配置文件
 */
async function readConfig() {
  try {
    await ensureConfigDir();
    const data = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    const config = JSON.parse(data);
    
    // 应用配置迁移逻辑
    const migratedConfig = migrateConfig(config);
    
    // 如果配置被迁移了，保存新格式
    if (JSON.stringify(config) !== JSON.stringify(migratedConfig)) {
      await writeConfig(migratedConfig);
    }
    
    return migratedConfig;
  } catch (error) {
    // 如果文件不存在或读取失败，返回默认配置
    return DEFAULT_CONFIG;
  }
}

/**
 * 写入配置文件
 */
async function writeConfig(config: any) {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 获取所有配置
 * GET /api/config
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const config = await readConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read configuration'
    });
  }
});

/**
 * 保存所有配置
 * POST /api/config
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const newConfig = req.body;
    
    // 验证配置格式
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration format'
      });
    }
    
    // 合并配置（保留现有配置，只更新提供的部分）
    const currentConfig = await readConfig();
    const mergedConfig = { ...currentConfig, ...newConfig };
    
    await writeConfig(mergedConfig);
    
    res.json({
      success: true,
      message: 'Configuration saved successfully',
      data: mergedConfig
    });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save configuration'
    });
  }
});

/**
 * 获取端口配置
 * GET /api/config/ports
 */
router.get('/ports', async (req: Request, res: Response) => {
  try {
    const config = await readConfig();
    res.json({
      success: true,
      data: config.ports || DEFAULT_CONFIG.ports
    });
  } catch (error) {
    console.error('Error reading port config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read port configuration'
    });
  }
});

/**
 * 保存端口配置
 * POST /api/config/ports
 */
router.post('/ports', async (req: Request, res: Response) => {
  try {
    const portConfig = req.body;
    
    // 验证端口配置
    if (!portConfig || typeof portConfig !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid port configuration format'
      });
    }
    
    // 验证端口范围
    if (portConfig.frontendPort && (portConfig.frontendPort < 1024 || portConfig.frontendPort > 65535)) {
      return res.status(400).json({
        success: false,
        error: 'Frontend port must be between 1024 and 65535'
      });
    }
    
    if (portConfig.backendPort && (portConfig.backendPort < 1024 || portConfig.backendPort > 65535)) {
      return res.status(400).json({
        success: false,
        error: 'Backend port must be between 1024 and 65535'
      });
    }
    
    // 读取现有配置
    const currentConfig = await readConfig();
    
    // 更新端口配置
    currentConfig.ports = { ...currentConfig.ports, ...portConfig };
    
    await writeConfig(currentConfig);
    
    res.json({
      success: true,
      message: 'Port configuration saved successfully',
      data: currentConfig.ports
    });
  } catch (error) {
    console.error('Error saving port config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save port configuration'
    });
  }
});

/**
 * 重置配置为默认值
 * POST /api/config/reset
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    await writeConfig(DEFAULT_CONFIG);
    
    res.json({
      success: true,
      message: 'Configuration reset to default values',
      data: DEFAULT_CONFIG
    });
  } catch (error) {
    console.error('Error resetting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset configuration'
    });
  }
});

export default router;