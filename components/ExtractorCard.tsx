'use client';

import { useState, useCallback, memo } from 'react';
import { Download, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ArticleInfo } from '@/lib/extractor';

interface ExtractorCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  placeholder: string;
  apiEndpoint: string;
  type: 'single' | 'album';
  showMaxCount?: boolean;
}

export default function ExtractorCard({
  title,
  description,
  icon,
  placeholder,
  apiEndpoint,
  type,
  showMaxCount = false
}: ExtractorCardProps) {
  const [url, setUrl] = useState('');
  const [maxCount, setMaxCount] = useState(0); // 0 表示不限制
  const [useBrowser, setUseBrowser] = useState(true); // 默认使用浏览器模式
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [articles, setArticles] = useState<ArticleInfo[]>([]);
  const [logs, setLogs] = useState<Array<{ type: 'info' | 'success' | 'warning' | 'error'; message: string; time: string }>>([]);

  const addLog = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { type, message, time }]);
  };

  const handleExtract = async () => {
    if (!url.trim()) {
      setMessage('请输入链接');
      return;
    }

    if (!url.includes('mp.weixin.qq.com')) {
      setMessage('请输入有效的微信公众号链接');
      return;
    }

    setLoading(true);
    setStatus('processing');
    setProgress(0);
    setMessage('');
    setArticles([]);
    setLogs([]);

    try {
      addLog('info', '开始提取文章...');
      setProgress(20);

      const requestBody = type === 'album' 
        ? { 
            url: url.trim(), 
            maxCount: maxCount > 0 ? maxCount : undefined, // 0 或空表示不限制
            useBrowser 
          }
        : { url: url.trim() };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '提取失败');
      }

      setProgress(80);
      addLog('success', '提取成功！');

      if (type === 'single') {
        setArticles([data.data]);
        addLog('info', `成功提取文章: ${data.data.title}`);
      } else {
        setArticles(data.data.articles);
        addLog('info', `成功提取 ${data.data.articles.length} 篇文章`);
      }

      setProgress(100);
      setStatus('success');
      setMessage('提取完成！');

    } catch (error) {
      console.error('提取失败:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '提取失败');
      addLog('error', error instanceof Error ? error.message : '提取失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (articles.length === 0) return;

    try {
      addLog('info', '正在生成ZIP下载文件...');

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articles,
          format: 'zip'
        }),
      });

      if (!response.ok) {
        throw new Error('生成下载文件失败');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `wechat_articles_${new Date().getTime()}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      addLog('success', '下载完成！');

    } catch (error) {
      console.error('下载失败:', error);
      addLog('error', error instanceof Error ? error.message : '下载失败');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary-100 rounded-lg">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {type === 'album' ? '专辑链接' : '文章链接'}
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder}
            className="input"
            disabled={loading}
          />
        </div>

        {showMaxCount && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大文章数量 (可选，留空表示不限制)
              </label>
              <input
                type="number"
                value={maxCount || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setMaxCount(0); // 0 表示不限制
                  } else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                      setMaxCount(num);
                    }
                  }
                }}
                min="1"
                placeholder="留空表示不限制数量"
                className="input"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                留空或输入0表示提取所有文章。大量文章可能需要较长时间，建议先尝试较小数量。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                提取模式
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="extractMode"
                    checked={useBrowser}
                    onChange={() => setUseBrowser(true)}
                    disabled={loading}
                    className="mr-2"
                  />
                  <span className="text-sm">浏览器模式 (推荐)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="extractMode"
                    checked={!useBrowser}
                    onChange={() => setUseBrowser(false)}
                    disabled={loading}
                    className="mr-2"
                  />
                  <span className="text-sm">传统模式</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                浏览器模式支持懒加载，可获取更多文章；传统模式速度更快但可能遗漏部分文章。
              </p>
            </div>
          </>
        )}

        <button
          onClick={handleExtract}
          disabled={loading || !url.trim()}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              提取中...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              {type === 'album' ? '提取专辑' : '提取文章'}
            </>
          )}
        </button>

        {/* 进度条 */}
        {loading && (
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* 状态显示 */}
        {(status !== 'idle' || message) && (
          <div className={`flex items-center gap-2 p-3 rounded-lg bg-gray-50 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm font-medium">{message || '处理中...'}</span>
          </div>
        )}

        {/* 日志显示 */}
        {logs.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-700 mb-2">处理日志</h4>
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className={`log-entry log-${log.type}`}>
                  <span className="text-xs opacity-75">[{log.time}]</span> {log.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 结果显示 */}
        {articles.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-slide-up">
            <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              提取完成
            </h4>
            
            <div className="space-y-2 mb-4">
              {articles.map((article, index) => (
                <div key={index} className="text-sm text-green-700 bg-white rounded p-2">
                  <div className="font-medium truncate">{article.title}</div>
                  {article.author && (
                    <div className="text-xs opacity-75">作者: {article.author}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="btn btn-success flex-1 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                下载 ZIP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}