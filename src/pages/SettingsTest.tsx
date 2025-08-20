import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const SettingsTest: React.FC = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        console.log('开始加载配置...');
        const response = await fetch('/api/config');
        console.log('API响应状态:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('API响应数据:', result);
        
        if (result.success) {
          setConfig(result.data);
        } else {
          throw new Error(result.error || '加载配置失败');
        }
      } catch (err) {
        console.error('加载配置错误:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };
    
    loadConfig();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>加载配置中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="bg-red-600 border border-red-500 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">配置加载失败</h2>
          <p className="text-red-100">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold">系统设置 (测试版)</h1>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">配置数据</h2>
          <pre className="bg-gray-700 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default SettingsTest;