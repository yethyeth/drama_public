import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Database,
  BarChart3,
  TrendingUp,
  Users,
  Settings,
  Activity,
  Terminal,
  Zap,
  FolderOpen
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      icon: BarChart3,
      label: '数据概览',
      description: '总体数据统计'
    },
    {
      path: '/crawler',
      icon: Terminal,
      label: '数据采集',
      description: '爬虫任务控制台'
    },
    {
      path: '/data-management',
      icon: FolderOpen,
      label: '数据管理',
      description: '查看原始数据'
    },
    {
      path: '/rankings',
      icon: TrendingUp,
      label: '榜单分析',
      description: '多平台排行榜'
    },
    {
      path: '/celebrities',
      icon: Users,
      label: '演员热度',
      description: '明星影响力分析'
    },
    {
      path: '/settings',
      icon: Settings,
      label: '系统设置',
      description: '配置管理'
    }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* 侧边栏 */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700">
        {/* Logo区域 */}
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">短剧分析</h1>
              <p className="text-xs text-gray-400">Data Analytics</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200
                    ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <Icon
                    className={`
                      mr-3 h-5 w-5 transition-colors duration-200
                      ${
                        active
                          ? 'text-white'
                          : 'text-gray-400 group-hover:text-white'
                      }
                    `}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                  {active && (
                    <div className="w-2 h-2 bg-white rounded-full opacity-75" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 状态指示器 */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">系统状态</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-400">运行中</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              爬虫服务正常 • API响应正常
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="pl-64">
        {/* 顶部栏 */}
        <header className="bg-gray-800 border-b border-gray-700 h-16">
          <div className="flex items-center justify-between h-full px-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-medium text-gray-300">
                  短剧数据收集与分析工具
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 实时时间 */}
              <div className="text-sm text-gray-400">
                {new Date().toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
              
              {/* 连接状态 */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-sm text-gray-300">已连接</span>
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="min-h-[calc(100vh-4rem)] bg-gray-900">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;