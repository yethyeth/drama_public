import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  Shield,
  Database,
  Monitor,
  Bell,
  Server,
  Palette
} from 'lucide-react';

// 接口定义
interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkSpeed: number;
  uptime: string;
  activeConnections: number;
}

interface CrawlerConfig {
  maxConcurrentTasks: number;
  requestDelay: number;
  retryAttempts: number;
  timeout: number;
  userAgent: string;
  headless: boolean;
  antiDetection: {
    randomDelay: boolean;
    rotateUserAgent: boolean;
    enableCookies: boolean;
    respectRobotsTxt: boolean;
  };
}

interface DatabaseConfig {
  autoBackup: boolean;
  backupInterval: number;
  maxBackups: number;
  compressionEnabled: boolean;
}

interface NotificationConfig {
  emailEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl: string;
}

interface PortConfig {
  frontendPort: number;
  backendPort: number;
  autoStart: boolean;
  enableHttps: boolean;
  corsEnabled: boolean;
}

interface Config {
  crawler: CrawlerConfig;
  database: DatabaseConfig;
  notifications: NotificationConfig;
  ports: PortConfig;
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'crawler' | 'database' | 'system' | 'notifications' | 'ports' | 'appearance'>('crawler');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  // 配置状态
  const [crawlerConfig, setCrawlerConfig] = useState<CrawlerConfig>({
    maxConcurrentTasks: 5,
    requestDelay: 1000,
    retryAttempts: 3,
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    headless: true,
    antiDetection: {
      randomDelay: true,
      rotateUserAgent: false,
      enableCookies: true,
      respectRobotsTxt: true
    }
  });

  const [databaseConfig, setDatabaseConfig] = useState<DatabaseConfig>({
    autoBackup: true,
    backupInterval: 24,
    maxBackups: 7,
    compressionEnabled: true
  });

  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    emailEnabled: false,
    webhookEnabled: false,
    webhookUrl: ''
  });

  const [portConfig, setPortConfig] = useState<PortConfig>({
    frontendPort: 5173,
    backendPort: 3004,
    autoStart: true,
    enableHttps: false,
    corsEnabled: true
  });

  const [systemStats, setSystemStats] = useState<SystemStats>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkSpeed: 0,
    uptime: '',
    activeConnections: 0
  });

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const response_data = await response.json();
        
        // API返回的结构是 {success: true, data: config}
        const config = response_data.data || response_data;
        
        if (config.crawler) setCrawlerConfig(config.crawler);
        if (config.database) setDatabaseConfig(config.database);
        if (config.notifications) setNotificationConfig(config.notifications);
        if (config.ports) setPortConfig(config.ports);
        
      } catch (error) {
        console.error('加载配置失败:', error);
        setError(error instanceof Error ? error.message : '加载配置失败');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // 保存配置
  const saveConfig = async () => {
    try {
      setSaveStatus('saving');
      
      const config: Config = {
        crawler: crawlerConfig,
        database: databaseConfig,
        notifications: notificationConfig,
        ports: portConfig
      };
      
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('保存配置失败');
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
      
    } catch (error) {
      console.error('保存配置失败:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-white">加载配置中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">加载失败</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">系统设置</h1>
        </div>
        
        <button
          onClick={saveConfig}
          disabled={saveStatus === 'saving'}
          className={`px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2 ${
            saveStatus === 'saving'
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : saveStatus === 'success'
              ? 'bg-green-600 text-white'
              : saveStatus === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saveStatus === 'saving' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saveStatus === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : saveStatus === 'error' ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>
            {saveStatus === 'saving' ? '保存中...' :
             saveStatus === 'success' ? '保存成功' :
             saveStatus === 'error' ? '保存失败' : '保存配置'}
          </span>
        </button>
      </div>

      {/* 标签页导航 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex border-b border-gray-700">
          {[
            { id: 'crawler', name: '爬虫配置', icon: Shield },
            { id: 'database', name: '数据库', icon: Database },
            { id: 'system', name: '系统监控', icon: Monitor },
            { id: 'notifications', name: '通知设置', icon: Bell },
            { id: 'ports', name: '端口配置', icon: Server },
            { id: 'appearance', name: '界面设置', icon: Palette }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
        
        <div className="p-6">
          {/* 爬虫配置标签页 */}
          {activeTab === 'crawler' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">基础配置</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      最大并发任务数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={crawlerConfig.maxConcurrentTasks}
                      onChange={(e) => setCrawlerConfig({
                        ...crawlerConfig,
                        maxConcurrentTasks: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      请求延迟 (毫秒)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      value={crawlerConfig.requestDelay}
                      onChange={(e) => setCrawlerConfig({
                        ...crawlerConfig,
                        requestDelay: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={crawlerConfig.headless}
                        onChange={(e) => setCrawlerConfig({
                          ...crawlerConfig,
                          headless: e.target.checked
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-gray-300 font-medium">无头模式</span>
                        <p className="text-sm text-gray-400">启用后浏览器将在后台运行，不显示界面</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">反爬虫配置</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={crawlerConfig.antiDetection.randomDelay}
                        onChange={(e) => setCrawlerConfig({
                          ...crawlerConfig,
                          antiDetection: {
                            ...crawlerConfig.antiDetection,
                            randomDelay: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-300">随机延迟</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 其他标签页内容 */}
          {activeTab !== 'crawler' && (
            <div className="text-center py-12">
              <div className="text-gray-400">
                <div className="text-lg font-medium mb-2">{activeTab} 配置</div>
                <div>此功能正在开发中...</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;