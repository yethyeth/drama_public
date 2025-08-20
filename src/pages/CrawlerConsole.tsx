import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Terminal,
  Database,
  Zap,
  TrendingUp
} from 'lucide-react';

interface CrawlerTask {
  id: string;
  platform: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  result?: any;
  error?: string;
}

interface CrawlerStats {
  totalPlatforms: number;
  supportedPlatforms: string[];
  features: string[];
  activeTasks: number;
  runningTasks: number;
  taskHistory: {
    total: number;
    completed: number;
    failed: number;
  };
}

const CrawlerConsole: React.FC = () => {
  const [tasks, setTasks] = useState<CrawlerTask[]>([]);
  const [stats, setStats] = useState<CrawlerStats | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedTaskType, setSelectedTaskType] = useState<string>('drama_list');
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const platforms = [
    { id: 'all', name: '全平台', color: 'bg-purple-600' },
    { id: 'tencent', name: '腾讯视频', color: 'bg-blue-600' },
    { id: 'youku', name: '优酷', color: 'bg-orange-600' },
    { id: 'iqiyi', name: '爱奇艺', color: 'bg-green-600' },
    { id: 'douyin', name: '抖音', color: 'bg-red-600' }
  ];

  const taskTypes = [
    { id: 'drama_list', name: '短剧列表', icon: Database, description: '获取平台短剧列表数据' },
    { id: 'ranking', name: '排行榜', icon: TrendingUp, description: '获取各类排行榜数据' },
    { id: 'health_check', name: '健康检查', icon: Activity, description: '检查爬虫服务状态' }
  ];

  // 获取爬虫统计信息
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/crawler/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  // 获取任务列表
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/crawler/tasks');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
    }
  };

  // 启动爬虫任务
  const startTask = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/crawler/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          type: selectedTaskType
        })
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchTasks();
        await fetchStats();
      } else {
        alert(`启动任务失败: ${data.error}`);
      }
    } catch (error) {
      console.error('启动任务失败:', error);
      alert('启动任务失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  // 停止任务
  const stopTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/crawler/stop/${taskId}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchTasks();
        await fetchStats();
      } else {
        alert(`停止任务失败: ${data.error}`);
      }
    } catch (error) {
      console.error('停止任务失败:', error);
      alert('停止任务失败');
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'running':
        return 'text-blue-400 bg-blue-400/10';
      case 'completed':
        return 'text-green-400 bg-green-400/10';
      case 'failed':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  // 格式化时间
  const formatTime = (timeString?: string) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleString('zh-CN');
  };

  // 自动刷新
  useEffect(() => {
    fetchStats();
    fetchTasks();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchTasks();
        fetchStats();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Terminal className="w-7 h-7 text-blue-400" />
            <span>数据采集控制台</span>
          </h1>
          <p className="text-gray-400 mt-1">管理和监控多平台爬虫任务</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span>自动刷新</span>
          </label>
          
          <button
            onClick={() => {
              fetchTasks();
              fetchStats();
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">支持平台</p>
                <p className="text-2xl font-bold text-white">{stats.totalPlatforms}</p>
              </div>
              <Database className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">活跃任务</p>
                <p className="text-2xl font-bold text-white">{stats.activeTasks}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">运行中</p>
                <p className="text-2xl font-bold text-white">{stats.runningTasks}</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">成功率</p>
                <p className="text-2xl font-bold text-white">
                  {stats.taskHistory.total > 0 
                    ? Math.round((stats.taskHistory.completed / stats.taskHistory.total) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* 任务控制面板 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Play className="w-5 h-5 text-green-400" />
          <span>启动新任务</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 平台选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">选择平台</label>
            <div className="space-y-2">
              {platforms.map((platform) => (
                <label key={platform.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="platform"
                    value={platform.id}
                    checked={selectedPlatform === platform.id}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                  />
                  <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                  <span className="text-gray-300">{platform.name}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* 任务类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">任务类型</label>
            <div className="space-y-2">
              {taskTypes.map((taskType) => {
                const Icon = taskType.icon;
                return (
                  <label key={taskType.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="taskType"
                      value={taskType.id}
                      checked={selectedTaskType === taskType.id}
                      onChange={(e) => setSelectedTaskType(e.target.value)}
                      className="text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                    />
                    <Icon className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-gray-300">{taskType.name}</div>
                      <div className="text-xs text-gray-500">{taskType.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          
          {/* 启动按钮 */}
          <div className="flex items-end">
            <button
              onClick={startTask}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <span>{isLoading ? '启动中...' : '启动任务'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span>任务列表</span>
            <span className="text-sm text-gray-400">({tasks.length})</span>
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">平台</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">进度</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">开始时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">结束时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    暂无任务记录
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const platform = platforms.find(p => p.id === task.platform);
                  const taskType = taskTypes.find(t => t.id === task.type);
                  
                  return (
                    <tr key={task.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(task.status)}
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${platform?.color || 'bg-gray-400'}`} />
                          <span className="text-gray-300">{platform?.name || task.platform}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        {taskType?.name || task.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatTime(task.startTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatTime(task.endTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.status === 'running' && (
                          <button
                            onClick={() => stopTask(task.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors duration-200 flex items-center space-x-1"
                          >
                            <Square className="w-3 h-3" />
                            <span>停止</span>
                          </button>
                        )}
                        {task.error && (
                          <div className="text-xs text-red-400 mt-1" title={task.error}>
                            错误: {task.error.substring(0, 30)}...
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CrawlerConsole;