import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Play,
  Star,
  Eye,
  Calendar,
  Clock,
  Users,
  Tag,
  TrendingUp,
  TrendingDown,
  Share2,
  Bookmark,
  ArrowLeft,
  ExternalLink,
  Award,
  MessageCircle,
  ThumbsUp,
  BarChart3,
  Activity,
  User
} from 'lucide-react';

interface DramaDetail {
  id: string;
  title: string;
  cover: string;
  description: string;
  rating: number;
  totalViews: number;
  episodes: number;
  duration: number;
  releaseDate: string;
  updateTime: string;
  status: 'ongoing' | 'completed' | 'upcoming';
  platforms: Array<{
    name: string;
    url: string;
    views: number;
  }>;
  tags: string[];
  cast: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
    type: 'actor' | 'director' | 'producer';
  }>;
  reviews: Array<{
    id: string;
    user: string;
    rating: number;
    content: string;
    date: string;
    likes: number;
  }>;
  viewTrends: Array<{
    date: string;
    views: number;
    platform: string;
  }>;
  relatedDramas: Array<{
    id: string;
    title: string;
    cover: string;
    rating: number;
    views: number;
  }>;
}

interface ViewStats {
  platform: string;
  views: number;
  percentage: number;
  color: string;
}

const DramaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [drama, setDrama] = useState<DramaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'cast' | 'reviews' | 'stats'>('overview');

  // 模拟短剧详情数据
  const mockDrama: DramaDetail = {
    id: id || '1',
    title: '霸道总裁的小娇妻',
    cover: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20drama%20poster%20romantic%20CEO%20theme%20elegant%20modern%20style&image_size=portrait_4_3',
    description: '一个普通女孩意外成为霸道总裁的契约妻子，从最初的互相看不顺眼到逐渐产生真情，两人在商场和情场上经历了种种考验，最终收获了真爱。剧情跌宕起伏，情感真挚动人，是一部不可多得的都市情感佳作。',
    rating: 8.9,
    totalViews: 12450000,
    episodes: 80,
    duration: 45,
    releaseDate: '2024-01-01',
    updateTime: '2024-01-15',
    status: 'ongoing',
    platforms: [
      { name: '腾讯视频', url: 'https://v.qq.com', views: 5670000 },
      { name: '优酷', url: 'https://youku.com', views: 3890000 },
      { name: '爱奇艺', url: 'https://iqiyi.com', views: 2890000 }
    ],
    tags: ['都市情感', '霸道总裁', '契约婚姻', '甜宠', '现代'],
    cast: [
      {
        id: '1',
        name: '张三',
        role: '霸道总裁 李俊轩',
        type: 'actor'
      },
      {
        id: '2',
        name: '李四',
        role: '小娇妻 苏晴',
        type: 'actor'
      },
      {
        id: '3',
        name: '王五',
        role: '导演',
        type: 'director'
      },
      {
        id: '4',
        name: '赵六',
        role: '制片人',
        type: 'producer'
      }
    ],
    reviews: [
      {
        id: '1',
        user: '观众A',
        rating: 9,
        content: '剧情很棒，演员演技在线，特别是男女主角的化学反应很强！',
        date: '2024-01-14',
        likes: 156
      },
      {
        id: '2',
        user: '观众B',
        rating: 8,
        content: '虽然是老套路，但是拍得很用心，细节处理得很好。',
        date: '2024-01-13',
        likes: 89
      },
      {
        id: '3',
        user: '观众C',
        rating: 9,
        content: '甜宠剧的天花板！每一集都让人欲罢不能。',
        date: '2024-01-12',
        likes: 234
      }
    ],
    viewTrends: [
      { date: '01-09', views: 890000, platform: 'total' },
      { date: '01-10', views: 1200000, platform: 'total' },
      { date: '01-11', views: 1450000, platform: 'total' },
      { date: '01-12', views: 1680000, platform: 'total' },
      { date: '01-13', views: 1890000, platform: 'total' },
      { date: '01-14', views: 2100000, platform: 'total' },
      { date: '01-15', views: 2340000, platform: 'total' }
    ],
    relatedDramas: [
      {
        id: '2',
        title: '职场女强人',
        cover: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20drama%20poster%20business%20woman%20professional%20modern&image_size=portrait_4_3',
        rating: 8.3,
        views: 6780000
      },
      {
        id: '3',
        title: '校园恋爱进行时',
        cover: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20drama%20poster%20campus%20romance%20youth%20school&image_size=portrait_4_3',
        rating: 8.7,
        views: 8560000
      }
    ]
  };

  // 获取短剧详情
  const fetchDramaDetail = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDrama(mockDrama);
    } catch (error) {
      console.error('获取短剧详情失败:', error);
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

  // 获取状态文本和颜色
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ongoing':
        return { text: '更新中', color: 'text-green-400 bg-green-400/20' };
      case 'completed':
        return { text: '已完结', color: 'text-blue-400 bg-blue-400/20' };
      case 'upcoming':
        return { text: '即将上线', color: 'text-yellow-400 bg-yellow-400/20' };
      default:
        return { text: '未知', color: 'text-gray-400 bg-gray-400/20' };
    }
  };

  // 获取平台播放量统计
  const getPlatformStats = (): ViewStats[] => {
    if (!drama) return [];
    
    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444'];
    return drama.platforms.map((platform, index) => ({
      platform: platform.name,
      views: platform.views,
      percentage: (platform.views / drama.totalViews) * 100,
      color: colors[index % colors.length]
    }));
  };

  useEffect(() => {
    fetchDramaDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!drama) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">短剧不存在或已被删除</p>
      </div>
    );
  }

  const statusInfo = getStatusInfo(drama.status);
  const platformStats = getPlatformStats();

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>返回</span>
      </button>

      {/* 短剧基本信息 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-8">
          {/* 封面 */}
          <div className="flex-shrink-0">
            <img
              src={drama.cover}
              alt={drama.title}
              className="w-full lg:w-64 h-80 object-cover rounded-lg"
            />
          </div>
          
          {/* 基本信息 */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{drama.title}</h1>
              <div className="flex items-center space-x-4 text-sm">
                <span className={`px-2 py-1 rounded ${statusInfo.color}`}>
                  {statusInfo.text}
                </span>
                <div className="flex items-center space-x-1 text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{drama.rating}</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-400">
                  <Eye className="w-4 h-4" />
                  <span>{formatNumber(drama.totalViews)}</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-400">
                  <Play className="w-4 h-4" />
                  <span>{drama.episodes}集</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{drama.duration}分钟/集</span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-300 leading-relaxed">{drama.description}</p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">上线时间：</span>
                <span className="text-white">{drama.releaseDate}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">更新时间：</span>
                <span className="text-white">{drama.updateTime}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">标签：</span>
                <div className="flex flex-wrap gap-2">
                  {drama.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-700 text-gray-300 text-sm rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center space-x-4 pt-4">
              <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2">
                <Play className="w-4 h-4" />
                <span>立即观看</span>
              </button>
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2">
                <Bookmark className="w-4 h-4" />
                <span>收藏</span>
              </button>
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2">
                <Share2 className="w-4 h-4" />
                <span>分享</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex border-b border-gray-700">
          {[
            { id: 'overview', name: '概览', icon: BarChart3 },
            { id: 'cast', name: '演员阵容', icon: Users },
            { id: 'reviews', name: '用户评价', icon: MessageCircle },
            { id: 'stats', name: '数据统计', icon: Activity }
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
          {/* 概览标签页 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 播放平台 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">播放平台</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {drama.platforms.map((platform, index) => (
                    <div key={`platform-${platform.name}-${index}`} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{platform.name}</h4>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <Eye className="w-4 h-4" />
                        <span>{formatNumber(platform.views)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 相关推荐 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">相关推荐</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {drama.relatedDramas.map((related) => (
                    <div key={related.id} className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors duration-200 cursor-pointer">
                      <img
                        src={related.cover}
                        alt={related.title}
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-3">
                        <h4 className="font-medium text-white text-sm mb-1 truncate">{related.title}</h4>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-current text-yellow-400" />
                            <span>{related.rating}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>{formatNumber(related.views)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* 演员阵容标签页 */}
          {activeTab === 'cast' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">演员阵容</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drama.cast.map((member) => (
                  <div key={member.id} className="bg-gray-700 rounded-lg p-4 flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{member.name}</h4>
                      <p className="text-sm text-gray-400">{member.role}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        member.type === 'actor' ? 'bg-blue-600 text-blue-100' :
                        member.type === 'director' ? 'bg-purple-600 text-purple-100' :
                        'bg-green-600 text-green-100'
                      }`}>
                        {member.type === 'actor' ? '演员' : member.type === 'director' ? '导演' : '制片人'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 用户评价标签页 */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">用户评价</h3>
              <div className="space-y-4">
                {drama.reviews.map((review) => (
                  <div key={review.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <span className="font-medium text-white">{review.user}</span>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-500'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-gray-400">{review.date}</span>
                    </div>
                    <p className="text-gray-300 mb-2">{review.content}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{review.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 数据统计标签页 */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* 播放量趋势 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">播放量趋势</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={drama.viewTrends}>
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
                      formatter={(value: number) => [formatNumber(value), '播放量']}
                    />
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="#3B82F6"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* 平台分布 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">平台播放量分布</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={platformStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="views"
                        label={({ platform, percentage }) => `${platform} ${percentage.toFixed(1)}%`}
                      >
                        {platformStats.map((entry, index) => (
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
                        formatter={(value: number) => [formatNumber(value), '播放量']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-3">
                    {platformStats.map((stat, index) => (
                      <div key={`stat-${stat.platform}-${index}`} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: stat.color }}
                          ></div>
                          <span className="text-white">{stat.platform}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">{formatNumber(stat.views)}</div>
                          <div className="text-sm text-gray-400">{stat.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DramaDetail;