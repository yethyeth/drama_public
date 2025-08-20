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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw,
  Eye,
  Star,
  Calendar,
  ArrowUpDown,
  Play,
  Users,
  Award,
  BarChart3
} from 'lucide-react';

interface RankingItem {
  id: string;
  rank: number;
  title: string;
  platform: string;
  views: number;
  rating: number;
  episodes: number;
  updateTime: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  cover?: string;
  tags: string[];
  actors: string[];
}

interface RankingData {
  type: string;
  platform: string;
  updateTime: string;
  items: RankingItem[];
}

interface PlatformComparison {
  platform: string;
  color: string;
  totalViews: number;
  avgRating: number;
  topDramas: number;
  growth: number;
}

const Rankings: React.FC = () => {
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('hot');
  const [sortBy, setSortBy] = useState<'rank' | 'views' | 'rating'>('rank');
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<PlatformComparison[]>([]);

  const platforms = [
    { id: 'all', name: '全平台', color: 'bg-purple-600' },
    { id: 'tencent', name: '腾讯视频', color: 'bg-blue-600' },
    { id: 'youku', name: '优酷', color: 'bg-orange-600' },
    { id: 'iqiyi', name: '爱奇艺', color: 'bg-green-600' },
    { id: 'douyin', name: '抖音', color: 'bg-red-600' }
  ];

  const rankingTypes = [
    { id: 'hot', name: '热门榜', icon: Trophy, description: '基于播放量和热度' },
    { id: 'new', name: '新剧榜', icon: Calendar, description: '最新上线短剧' },
    { id: 'rating', name: '评分榜', icon: Star, description: '用户评分排序' }
  ];



  // 获取榜单数据
  const fetchRankings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/rankings');
      if (response.ok) {
        const data = await response.json();
        setRankings(data.rankings || []);
        setComparison(data.comparison || []);
      } else {
        console.error('获取榜单数据失败:', response.statusText);
        setRankings([]);
        setComparison([]);
      }
    } catch (error) {
      console.error('获取榜单数据失败:', error);
      setRankings([]);
      setComparison([]);
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

  // 获取平台颜色
  const getPlatformColor = (platform: string) => {
    const platformData = platforms.find(p => p.id === platform);
    return platformData?.color || 'bg-gray-600';
  };

  // 排序榜单数据
  const sortRankings = (items: RankingItem[]) => {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'views':
          return b.views - a.views;
        case 'rating':
          return b.rating - a.rating;
        default:
          return a.rank - b.rank;
      }
    });
  };

  // 过滤榜单数据
  const getFilteredRankings = () => {
    const currentRanking = rankings.find(r => r.type === selectedType);
    if (!currentRanking) return [];
    
    let items = currentRanking.items;
    if (selectedPlatform !== 'all') {
      items = items.filter(item => item.platform === selectedPlatform);
    }
    
    return sortRankings(items);
  };

  useEffect(() => {
    fetchRankings();
  }, [selectedPlatform, selectedType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredRankings = getFilteredRankings();

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Trophy className="w-7 h-7 text-yellow-400" />
            <span>榜单分析</span>
          </h1>
          <p className="text-gray-400 mt-1">多平台短剧排行榜数据分析</p>
        </div>
        
        <button
          onClick={fetchRankings}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>刷新数据</span>
        </button>
      </div>

      {/* 筛选控制 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-white font-medium">筛选条件</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          
          {/* 榜单类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">榜单类型</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {rankingTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 排序方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">排序方式</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rank' | 'views' | 'rating')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="rank">排名</option>
              <option value="views">播放量</option>
              <option value="rating">评分</option>
            </select>
          </div>
        </div>
      </div>

      {/* 平台对比图表 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <span>平台对比分析</span>
        </h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="platform" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" tickFormatter={formatNumber} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
              formatter={(value: number) => [formatNumber(value), '总播放量']}
            />
            <Bar dataKey="totalViews" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 榜单列表 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Award className="w-5 h-5 text-yellow-400" />
            <span>
              {rankingTypes.find(t => t.id === selectedType)?.name || '排行榜'}
              {selectedPlatform !== 'all' && ` - ${platforms.find(p => p.id === selectedPlatform)?.name}`}
            </span>
            <span className="text-sm text-gray-400">({filteredRankings.length})</span>
          </h3>
        </div>
        
        <div className="divide-y divide-gray-700">
          {filteredRankings.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>暂无榜单数据</p>
            </div>
          ) : (
            filteredRankings.map((item, index) => (
              <div key={item.id} className="p-6 hover:bg-gray-700/50 transition-colors duration-200">
                <div className="flex items-center space-x-4">
                  {/* 排名 */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${
                      index < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {sortBy === 'rank' ? item.rank : index + 1}
                    </div>
                  </div>
                  
                  {/* 短剧信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-white truncate">{item.title}</h4>
                      <div className={`px-2 py-1 rounded text-xs text-white ${getPlatformColor(item.platform)}`}>
                        {platforms.find(p => p.id === item.platform)?.name || item.platform}
                      </div>
                      {getTrendIcon(item.trend, item.trendValue)}
                      {item.trendValue !== 0 && (
                        <span className={`text-sm ${
                          item.trend === 'up' ? 'text-green-400' : item.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {item.trend === 'up' ? '+' : ''}{item.trendValue}%
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{formatNumber(item.views)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4" />
                        <span>{item.rating}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Play className="w-4 h-4" />
                        <span>{item.episodes}集</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{item.actors.slice(0, 2).join('、')}</span>
                        {item.actors.length > 2 && <span>等</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-2">
                      {item.tags.map((tag, tagIndex) => (
                        <span
                          key={`${item.id}-tag-${tagIndex}`}
                          className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* 更新时间 */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm text-gray-400">
                      {item.updateTime}
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

export default Rankings;