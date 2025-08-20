import React, { useState, useEffect } from 'react';
import { Trash2, Eye, Search, RefreshCw, Database, Users, Film, Trophy } from 'lucide-react';

interface Drama {
  id: string;
  title: string;
  description: string;
  views: number;
  rating: number;
  platforms: string;
  created_at: string;
}

interface Celebrity {
  id: string;
  name: string;
  avatar_url?: string;
  created_at: string;
}

interface Platform {
  id: string;
  name: string;
  created_at: string;
}

interface Ranking {
  id: string;
  title: string;
  description: string;
  item_count: number;
  drama_titles: string;
  created_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type TabType = 'dramas' | 'celebrities' | 'platforms' | 'rankings';

const DataManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dramas');
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // 获取短剧数据
  const fetchDramas = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/data/dramas?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setDramas(result.data.dramas);
        setPagination(result.data.pagination);
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (error) {
      console.error('获取短剧数据失败:', error);
      setError(error instanceof Error ? error.message : '获取短剧数据失败');
      setDramas([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取演员数据
  const fetchCelebrities = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/data/celebrities?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setCelebrities(result.data.celebrities);
        setPagination(result.data.pagination);
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (error) {
      console.error('获取演员数据失败:', error);
      setError(error instanceof Error ? error.message : '获取演员数据失败');
      setCelebrities([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取平台数据
  const fetchPlatforms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data/platforms');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setPlatforms(result.data);
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (error) {
      console.error('获取平台数据失败:', error);
      setError(error instanceof Error ? error.message : '获取平台数据失败');
      setPlatforms([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取榜单数据
  const fetchRankings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data/rankings');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setRankings(result.data);
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (error) {
      console.error('获取榜单数据失败:', error);
      setError(error instanceof Error ? error.message : '获取榜单数据失败');
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  // 删除短剧
  const deleteDrama = async (id: string) => {
    if (!confirm('确定要删除这部短剧吗？此操作不可恢复。')) return;
    
    try {
      const response = await fetch(`/api/data/dramas/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        fetchDramas(pagination.page);
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (error) {
      console.error('删除短剧失败:', error);
      alert('删除失败');
    }
  };

  // 删除演员
  const deleteCelebrity = async (id: string) => {
    if (!confirm('确定要删除这位演员吗？此操作不可恢复。')) return;
    
    try {
      const response = await fetch(`/api/data/celebrities/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        fetchCelebrities(pagination.page);
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (error) {
      console.error('删除演员失败:', error);
      alert('删除失败');
    }
  };

  // 格式化数字
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) {
      return 'N/A';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 切换标签页时加载数据
  useEffect(() => {
    switch (activeTab) {
      case 'dramas':
        fetchDramas();
        break;
      case 'celebrities':
        fetchCelebrities();
        break;
      case 'platforms':
        fetchPlatforms();
        break;
      case 'rankings':
        fetchRankings();
        break;
    }
  }, [activeTab]);

  // 过滤数据
  const filteredDramas = dramas.filter(drama => 
    drama.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredCelebrities = celebrities.filter(celebrity => 
    celebrity.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredPlatforms = platforms.filter(platform => 
    platform.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredRankings = rankings.filter(ranking => 
    ranking.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'dramas', label: '短剧数据', icon: Film, count: dramas.length },
    { id: 'celebrities', label: '演员数据', icon: Users, count: celebrities.length },
    { id: 'platforms', label: '平台数据', icon: Database, count: platforms.length },
    { id: 'rankings', label: '榜单数据', icon: Trophy, count: rankings.length }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">数据管理</h1>
        <p className="text-gray-600">查看和管理爬虫采集到的原始数据</p>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 搜索和刷新 */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            switch (activeTab) {
              case 'dramas':
                fetchDramas();
                break;
              case 'celebrities':
                fetchCelebrities();
                break;
              case 'platforms':
                fetchPlatforms();
                break;
              case 'rankings':
                fetchRankings();
                break;
            }
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>刷新</span>
        </button>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">加载数据时出现错误</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    switch (activeTab) {
                      case 'dramas':
                        fetchDramas();
                        break;
                      case 'celebrities':
                        fetchCelebrities();
                        break;
                      case 'platforms':
                        fetchPlatforms();
                        break;
                      case 'rankings':
                        fetchRankings();
                        break;
                    }
                  }}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 短剧数据表格 */}
      {activeTab === 'dramas' && !loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">播放量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">评分</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">平台</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDramas.map((drama) => (
                <tr key={drama.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 break-words">{drama.title || 'N/A'}</div>
                    <div className="text-sm text-gray-500 break-words">{drama.description || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-24">
                    {formatNumber(drama.views)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-16">
                    {drama.rating ? drama.rating.toFixed(1) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-20">
                    {drama.platforms || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-32">
                    {formatDate(drama.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium w-16">
                    <button
                      onClick={() => deleteDrama(drama.id)}
                      className="text-red-600 hover:text-red-900 mr-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 演员数据表格 */}
      {activeTab === 'celebrities' && !loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">头像</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCelebrities.map((celebrity) => (
                <tr key={celebrity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {celebrity.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {celebrity.avatar_url && !celebrity.avatar_url.includes('example.com') ? (
                      <img src={celebrity.avatar_url} alt={celebrity.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(celebrity.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => deleteCelebrity(celebrity.id)}
                      className="text-red-600 hover:text-red-900 mr-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 平台数据表格 */}
      {activeTab === 'platforms' && !loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">平台名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPlatforms.map((platform) => (
                <tr key={platform.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {platform.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(platform.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 榜单数据表格 */}
      {activeTab === 'rankings' && !loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">榜单标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目数量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">包含短剧</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRankings.map((ranking) => (
                <tr key={ranking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{ranking.title || 'N/A'}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{ranking.description || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ranking.item_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                    {ranking.drama_titles || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(ranking.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {(activeTab === 'dramas' || activeTab === 'celebrities') && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            显示第 {((pagination.page - 1) * pagination.limit) + 1} 到 {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条记录
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const newPage = pagination.page - 1;
                if (activeTab === 'dramas') fetchDramas(newPage);
                else if (activeTab === 'celebrities') fetchCelebrities(newPage);
              }}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              第 {pagination.page} 页，共 {pagination.totalPages} 页
            </span>
            <button
              onClick={() => {
                const newPage = pagination.page + 1;
                if (activeTab === 'dramas') fetchDramas(newPage);
                else if (activeTab === 'celebrities') fetchCelebrities(newPage);
              }}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && (
        (activeTab === 'dramas' && filteredDramas.length === 0) ||
        (activeTab === 'celebrities' && filteredCelebrities.length === 0) ||
        (activeTab === 'platforms' && filteredPlatforms.length === 0) ||
        (activeTab === 'rankings' && filteredRankings.length === 0)
      ) && (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无数据</h3>
          <p className="mt-1 text-sm text-gray-500">当前没有找到相关数据</p>
        </div>
      )}
    </div>
  );
};

export default DataManagement;