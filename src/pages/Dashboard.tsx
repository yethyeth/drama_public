import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Play,
  Star,
  Eye,
  Calendar,
  Activity,
  Database,
  Zap,
  Award,
  Clock
} from 'lucide-react';

interface DashboardStats {
  totalDramas: number;
  totalViews: number;
  totalCelebrities: number;
  totalRankings: number;
  todayUpdates: number;
  platformDistribution: Array<{
    platform: string;
    count: number;
    color?: string;
  }>;
  trendData: Array<{
    date: string;
    dramas: number;
  }>;
  topDramas: Array<{
    title: string;
    poster: string;
    views: number;
  }>;
  recentActivity: {
    newDramas: number;
    activePlatforms: number;
  };
}

interface ApiResponse {
  success: boolean;
  data: {
    overview: {
      totalDramas: number;
      totalViews: number;
      totalCelebrities: number;
      totalRankings: number;
      todayUpdates?: number;
    };
    platformDistribution: Array<{
      platform: string;
      count: number;
    }>;
    trendData: Array<{
      date: string;
      dramas: number;
    }>;
    topDramas: Array<{
      title: string;
      poster: string;
      views: number;
    }>;
    recentActivity: {
      newDramas: number;
      activePlatforms: number;
    };
  };
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // 平台颜色映射
  const platformColors: Record<string, string> = {
    '腾讯视频': '#3B82F6',
    '优酷': '#F59E0B',
    '爱奇艺': '#10B981',
    '抖音': '#EF4444'
  };

  // 获取仪表板数据
  const fetchDashboardData = async () => {
    console.log('Dashboard: 开始获取数据...');
    setLoading(true);
    try {
      console.log('Dashboard: 发送API请求到 /api/dashboard/stats');
      const response = await fetch('/api/dashboard/stats');
      console.log('Dashboard: API响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }
      
      const result: ApiResponse = await response.json();
      console.log('Dashboard: API返回数据:', result);
      
      if (result.success) {
        // 转换API数据格式为组件所需格式
        const transformedStats: DashboardStats = {
          totalDramas: result.data.overview.totalDramas,
          totalViews: result.data.overview.totalViews,
          totalCelebrities: result.data.overview.totalCelebrities,
          totalRankings: result.data.overview.totalRankings,
          todayUpdates: result.data.overview.todayUpdates || 0,
          platformDistribution: result.data.platformDistribution.map(item => ({
            ...item,
            color: platformColors[item.platform] || '#6B7280'
          })),
          trendData: result.data.trendData,
          topDramas: result.data.topDramas,
          recentActivity: result.data.recentActivity
        };
        console.log('Dashboard: 转换后的数据:', transformedStats);
        setStats(transformedStats);
      } else {
        console.error('Dashboard: API返回失败状态');
        throw new Error('API returned error');
      }
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
      // 设置空数据状态
      setStats(null);
    } finally {
      setLoading(false);
      console.log('Dashboard: 数据获取完成，loading状态已更新');
    }
  };

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(1) + '亿';
    } else if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
  };

  // 获取活动状态图标
  const getActivityIcon = (type: string) => {
    switch (type) {
      case '数据更新':
        return <Database className="w-4 h-4" />;
      case '爬虫任务':
        return <Activity className="w-4 h-4" />;
      case '异常检测':
        return <Zap className="w-4 h-4" />;
      case '数据分析':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // 获取活动状态颜色
  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400 bg-green-400/10';
      case 'warning':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'error':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-400 py-12">
        <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>暂无数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-7 h-7 text-blue-400" />
            <span>数据概览仪表板</span>
          </h1>
          <p className="text-gray-400 mt-1">短剧数据统计与趋势分析</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">近7天</option>
            <option value="30d">近30天</option>
            <option value="90d">近90天</option>
          </select>
        </div>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">短剧总数</p>
              <p className="text-2xl font-bold text-white">{formatNumber(stats.totalDramas)}</p>
              <p className="text-xs text-green-400 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{stats.todayUpdates} 今日新增
              </p>
            </div>
            <Play className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">总播放量</p>
              <p className="text-2xl font-bold text-white">{formatNumber(stats.totalViews)}</p>
              <p className="text-xs text-green-400 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.5% 较昨日
              </p>
            </div>
            <Eye className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">演员总数</p>
              <p className="text-2xl font-bold text-white">{formatNumber(stats.totalCelebrities)}</p>
              <p className="text-xs text-blue-400 flex items-center mt-1">
                <Users className="w-3 h-3 mr-1" />
                活跃演员 {Math.floor(stats.totalCelebrities * 0.3)}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">榜单总数</p>
              <p className="text-2xl font-bold text-white">{formatNumber(stats.totalRankings)}</p>
              <p className="text-xs text-yellow-400 flex items-center mt-1">
                <Star className="w-3 h-3 mr-1" />
                活跃榜单
              </p>
            </div>
            <Award className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 播放量趋势 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span>短剧数量趋势</span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
                formatter={(value: number) => [formatNumber(value), '短剧数量']}
              />
              <Area
                type="monotone"
                dataKey="dramas"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* 平台分布 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Database className="w-5 h-5 text-green-400" />
            <span>平台分布</span>
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.platformDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="count"
              >
                {stats.platformDistribution.map((entry, index) => (
                  <Cell key={`cell-${entry.platform}-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {stats.platformDistribution.map((item, index) => (
              <div key={`platform-${item.platform}-${index}`} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-300">{item.platform}</span>
                <span className="text-sm text-gray-400">({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 热门短剧和最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 热门短剧 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span>热门短剧</span>
          </h3>
          <div className="space-y-3">
            {stats.topDramas.map((drama, index) => (
              <div key={`drama-${drama.title}-${index}`} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-white font-medium">{drama.title}</div>
                    <div className="text-sm text-gray-400">{formatNumber(drama.views)} 播放</div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-sm text-blue-400">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 最近活动 */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <span>最近活动</span>
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-white">新增短剧</div>
              <div className="text-2xl font-bold text-blue-400">
                {stats.recentActivity.newDramas}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-white">活跃平台</div>
              <div className="text-2xl font-bold text-green-400">
                {stats.recentActivity.activePlatforms}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;