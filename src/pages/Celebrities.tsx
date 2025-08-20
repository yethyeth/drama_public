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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Users,
  Star,
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw,
  Eye,
  Award,
  Calendar,
  ArrowUpDown,
  Play,
  Crown,
  User,
  UserCheck,
  Activity,
  BarChart3
} from 'lucide-react';

interface Celebrity {
  id: string;
  name: string;
  type: 'actor' | 'director';
  avatar?: string;
  hotScore: number;
  totalViews: number;
  dramaCount: number;
  avgRating: number;
  recentWorks: string[];
  platforms: string[];
  tags: string[];
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  rank: number;
  lastActive: string;
}

interface HotTrend {
  date: string;
  actors: number;
  directors: number;
}

interface PlatformStats {
  platform: string;
  color: string;
  actorCount: number;
  directorCount: number;
  avgHotScore: number;
}

const Celebrities: React.FC = () => {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | 'actor' | 'director'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'hotScore' | 'views' | 'rating' | 'dramaCount'>('hotScore');
  const [loading, setLoading] = useState(true);
  const [hotTrends, setHotTrends] = useState<HotTrend[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);

  const platforms = [
    { id: 'all', name: '全平台', color: 'bg-purple-600' },
    { id: 'tencent', name: '腾讯视频', color: 'bg-blue-600' },
    { id: 'youku', name: '优酷', color: 'bg-orange-600' },
    { id: 'iqiyi', name: '爱奇艺', color: 'bg-green-600' },
    { id: 'douyin', name: '抖音', color: 'bg-red-600' }
  ];

  const celebrityTypes = [
    { id: 'all', name: '全部', icon: Users, description: '演员和导演' },
    { id: 'actor', name: '演员', icon: User, description: '短剧演员' },
    { id: 'director', name: '导演', icon: UserCheck, description: '短剧导演' }
  ];



  // 获取明星数据
  const fetchCelebrities = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/celebrities');
      if (response.ok) {
        const data = await response.json();
        setCelebrities(data.celebrities || []);
        setHotTrends(data.hotTrends || []);
        setPlatformStats(data.platformStats || []);
      } else {
        console.error('获取明星数据失败:', response.statusText);
        setCelebrities([]);
        setHotTrends([]);
        setPlatformStats([]);
      }
    } catch (error) {
      console.error('获取明星数据失败:', error);
      setCelebrities([]);
      setHotTrends([]);
      setPlatformStats([]);
    } finally {
      setLoading(false);
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

  // 获取趋势图标
  const getTrendIcon = (trend: string, value: number) => {
    if (trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    } else if (trend === 'down') {
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    }
    return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    return type === 'actor' ? (
      <User className="w-4 h-4 text-blue-400" />
    ) : (
      <UserCheck className="w-4 h-4 text-purple-400" />
    );
  };

  // 排序明星数据
  const sortCelebrities = (items: Celebrity[]) => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'views':
          return b.totalViews - a.totalViews;
        case 'rating':
          return b.avgRating - a.avgRating;
        case 'dramaCount':
          return b.dramaCount - a.dramaCount;
        default:
          return b.hotScore - a.hotScore;
      }
    });
  };

  // 过滤明星数据
  const getFilteredCelebrities = () => {
    let items = celebrities;
    
    if (selectedType !== 'all') {
      items = items.filter(item => item.type === selectedType);
    }
    
    if (selectedPlatform !== 'all') {
      items = items.filter(item => item.platforms.includes(selectedPlatform));
    }
    
    return sortCelebrities(items);
  };

  // 获取热度分数颜色
  const getHotScoreColor = (score: number) => {
    if (score >= 9) return 'text-red-400';
    if (score >= 8) return 'text-orange-400';
    if (score >= 7) return 'text-yellow-400';
    return 'text-gray-400';
  };

  useEffect(() => {
    fetchCelebrities();
  }, [selectedType, selectedPlatform]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredCelebrities = getFilteredCelebrities();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Crown className="w-7 h-7 text-yellow-400" />
            <span>演员导演热度榜</span>
          </h1>
          <p className="text-gray-400 mt-1">短剧演员和导演热度排行分析</p>
        </div>
        
        <button
          onClick={fetchCelebrities}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>刷新数据</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">总演员数</p>
              <p className="text-2xl font-bold text-white">
                {celebrities.filter(c => c.type === 'actor').length}
              </p>
            </div>
            <User className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">总导演数</p>
              <p className="text-2xl font-bold text-white">
                {celebrities.filter(c => c.type === 'director').length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">平均热度</p>
              <p className="text-2xl font-bold text-white">
                {(celebrities.reduce((sum, c) => sum + c.hotScore, 0) / celebrities.length).toFixed(1)}
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">总播放量</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(celebrities.reduce((sum, c) => sum + c.totalViews, 0))}
              </p>
            </div>
            <Eye className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      {/* 热度趋势图 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <span>热度趋势</span>
        </h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={hotTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
            />
            <Line
              type="monotone"
              dataKey="actors"
              stroke="#3B82F6"
              strokeWidth={2}
              name="演员热度"
            />
            <Line
              type="monotone"
              dataKey="directors"
              stroke="#8B5CF6"
              strokeWidth={2}
              name="导演热度"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 筛选控制 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-white font-medium">筛选条件</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">类型</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | 'actor' | 'director')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {celebrityTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 平台选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">平台</label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 排序方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">排序方式</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'hotScore' | 'views' | 'rating' | 'dramaCount')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="hotScore">热度分数</option>
              <option value="views">总播放量</option>
              <option value="rating">平均评分</option>
              <option value="dramaCount">作品数量</option>
            </select>
          </div>
        </div>
      </div>

      {/* 明星列表 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Award className="w-5 h-5 text-yellow-400" />
            <span>
              {celebrityTypes.find(t => t.id === selectedType)?.name || '全部'}热度榜
              {selectedPlatform !== 'all' && ` - ${platforms.find(p => p.id === selectedPlatform)?.name}`}
            </span>
            <span className="text-sm text-gray-400">({filteredCelebrities.length})</span>
          </h3>
        </div>
        
        <div className="divide-y divide-gray-700">
          {filteredCelebrities.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Crown className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>暂无明星数据</p>
            </div>
          ) : (
            filteredCelebrities.map((celebrity, index) => (
              <div key={celebrity.id} className="p-6 hover:bg-gray-700/50 transition-colors duration-200">
                <div className="flex items-center space-x-4">
                  {/* 排名 */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${
                      index < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* 明星信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-white">{celebrity.name}</h4>
                      {getTypeIcon(celebrity.type)}
                      <span className="text-sm text-gray-400">
                        {celebrity.type === 'actor' ? '演员' : '导演'}
                      </span>
                      {getTrendIcon(celebrity.trend, celebrity.trendValue)}
                      {celebrity.trendValue !== 0 && (
                        <span className={`text-sm ${
                          celebrity.trend === 'up' ? 'text-green-400' : celebrity.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {celebrity.trend === 'up' ? '+' : ''}{celebrity.trendValue}%
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-400 mb-2">
                      <div className="flex items-center space-x-1">
                        <Activity className="w-4 h-4" />
                        <span className={getHotScoreColor(celebrity.hotScore)}>
                          {celebrity.hotScore}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{formatNumber(celebrity.totalViews)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Play className="w-4 h-4" />
                        <span>{celebrity.dramaCount}部作品</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4" />
                        <span>{celebrity.avgRating}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="text-sm text-gray-400">
                        <span className="text-gray-300">近期作品：</span>
                        {celebrity.recentWorks.slice(0, 3).join('、')}
                        {celebrity.recentWorks.length > 3 && '...'}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {celebrity.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span
                          key={`${celebrity.id}-tag-${tagIndex}`}
                          className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {celebrity.platforms.map((platform, platformIndex) => {
                        const platformData = platforms.find(p => p.id === platform);
                        return (
                          <span
                            key={`${celebrity.id}-platform-${platformIndex}`}
                            className={`px-2 py-1 text-xs text-white rounded ${platformData?.color || 'bg-gray-600'}`}
                          >
                            {platformData?.name || platform}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* 最后活跃时间 */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm text-gray-400">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {celebrity.lastActive}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Celebrities;