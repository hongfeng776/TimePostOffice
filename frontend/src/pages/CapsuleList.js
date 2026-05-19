import { useState, useEffect } from 'react';
import axios from '../utils/axios';

function CapsuleList() {
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchCapsules();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchCapsules = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/capsules');
      if (response.data.success) {
        setCapsules(response.data.data || []);
      }
    } catch (error) {
      console.error('获取胶囊列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCreatedDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isLocked = (openDate) => {
    return currentTime < new Date(openDate);
  };

  const isUnlocked = (capsule) => {
    return capsule.isOpened || !isLocked(capsule.openDate);
  };

  const fuzzyMatch = (text, query) => {
    if (!query) return true;
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase().trim();
    
    if (textLower.includes(queryLower)) return true;
    
    const queryChars = queryLower.split('');
    let textIndex = 0;
    
    for (const char of queryChars) {
      textIndex = textLower.indexOf(char, textIndex);
      if (textIndex === -1) return false;
      textIndex++;
    }
    
    return true;
  };

  const highlightText = (text, query) => {
    if (!query) return text;
    
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase().trim();
    
    if (textLower.includes(queryLower)) {
      const index = textLower.indexOf(queryLower);
      const before = text.substring(0, index);
      const match = text.substring(index, index + queryLower.length);
      const after = text.substring(index + queryLower.length);
      
      return (
        <>
          {before}
          <span style={{ 
            background: 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)', 
            padding: '2px 4px', 
            borderRadius: '4px',
            fontWeight: 600
          }}>
            {match}
          </span>
          {after}
        </>
      );
    }
    
    return text;
  };

  const getFilteredCapsules = () => {
    return capsules.filter(capsule => {
      const matchesSearch = fuzzyMatch(capsule.title, searchTerm);
      
      let matchesStatus = true;
      if (statusFilter === 'locked') {
        matchesStatus = !isUnlocked(capsule);
      } else if (statusFilter === 'opened') {
        matchesStatus = isUnlocked(capsule);
      }
      
      return matchesSearch && matchesStatus;
    });
  };

  const getCountdown = (openDate) => {
    const now = currentTime;
    const unlock = new Date(openDate);
    const diff = unlock - now;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  const CountdownDisplay = ({ openDate, isUnlocked }) => {
    const countdown = getCountdown(openDate);
    if (!countdown || isUnlocked) {
      return (
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '15px 20px',
          borderRadius: '12px',
          textAlign: 'center',
          color: 'white',
          fontWeight: 600,
          animation: 'pulse 2s infinite'
        }}>
          🎉 已解锁，可以查看内容啦！
        </div>
      );
    }

    const { days, hours, minutes, seconds } = countdown;

    return (
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        padding: '15px 20px',
        borderRadius: '12px',
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.9 }}>⏰ 距离开启还有</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '8px 12px',
            borderRadius: '8px',
            minWidth: '50px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{days}</div>
            <div style={{ fontSize: '10px' }}>天</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '8px 12px',
            borderRadius: '8px',
            minWidth: '50px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{hours.toString().padStart(2, '0')}</div>
            <div style={{ fontSize: '10px' }}>时</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '8px 12px',
            borderRadius: '8px',
            minWidth: '50px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{minutes.toString().padStart(2, '0')}</div>
            <div style={{ fontSize: '10px' }}>分</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '8px 12px',
            borderRadius: '8px',
            minWidth: '50px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{seconds.toString().padStart(2, '0')}</div>
            <div style={{ fontSize: '10px' }}>秒</div>
          </div>
        </div>
      </div>
    );
  };

  const filteredCapsules = getFilteredCapsules();

  return (
    <div className="capsule-list">
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '28px' }}>📦 我的胶囊列表</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: '5px 0 0 0' }}>
          共 {capsules.length} 个胶囊 · 按创建时间倒序排列
        </p>
      </div>

      <div className="card" style={{ 
        padding: '20px', 
        marginBottom: '20px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <input
              type="text"
              placeholder="按标题搜索胶囊..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#6b7280',
                  padding: '0 5px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: statusFilter === 'all' ? 600 : 500,
              background: statusFilter === 'all' 
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                : '#f3f4f6',
              color: statusFilter === 'all' ? 'white' : '#4b5563',
              transition: 'all 0.2s'
            }}
          >
            📋 全部
          </button>
          <button
            onClick={() => setStatusFilter('locked')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: statusFilter === 'locked' ? 600 : 500,
              background: statusFilter === 'locked' 
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                : '#f3f4f6',
              color: statusFilter === 'locked' ? 'white' : '#4b5563',
              transition: 'all 0.2s'
            }}
          >
            🔒 未解锁
          </button>
          <button
            onClick={() => setStatusFilter('opened')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: statusFilter === 'opened' ? 600 : 500,
              background: statusFilter === 'opened' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                : '#f3f4f6',
              color: statusFilter === 'opened' ? 'white' : '#4b5563',
              transition: 'all 0.2s'
            }}
          >
            📨 已解锁
          </button>
        </div>
      </div>

      {(searchTerm || statusFilter !== 'all') && (
        <div style={{ 
          color: 'rgba(255,255,255,0.8)', 
          marginBottom: '15px',
          fontSize: '14px'
        }}>
          🔍 筛选结果：找到 {filteredCapsules.length} 个胶囊
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ margin: '0 auto 15px auto' }}></div>
          <p style={{ color: '#6b7280' }}>正在加载你的胶囊...</p>
        </div>
      ) : filteredCapsules.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">�</div>
          <h3>没有找到匹配的胶囊</h3>
          <p>
            {searchTerm || statusFilter !== 'all' 
              ? '尝试调整搜索关键词或筛选条件' 
              : '去仪表盘创建你的第一个时间胶囊，给未来的自己写一封信吧！'}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="btn btn-primary"
              style={{ marginTop: '10px' }}
            >
              清除筛选
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredCapsules.map((capsule, index) => (
            <div
              key={capsule._id}
              className={`card capsule-card ${isUnlocked(capsule) ? 'opened' : 'locked'}`}
              style={{ 
                padding: '24px',
                border: isUnlocked(capsule) ? '3px solid #10b981' : '1px solid #e5e7eb',
                boxShadow: isUnlocked(capsule) ? '0 4px 12px rgba(16, 185, 129, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: isUnlocked(capsule)
                        ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                        : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      color: isUnlocked(capsule) ? '#059669' : '#d97706',
                      fontWeight: 600
                    }}>
                      {isUnlocked(capsule) ? '📨 已解锁' : '🔒 封存中'}
                    </span>
                    {isUnlocked(capsule) && (
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        fontWeight: 600,
                        animation: 'pulse 2s infinite'
                      }}>
                        ✨ 可查看
                      </span>
                    )}
                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>
                      #{capsules.findIndex(c => c._id === capsule._id) + 1}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '20px', color: '#1f2937' }}>
                    {highlightText(capsule.title, searchTerm)}
                  </h3>
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px', color: '#6b7280' }}>
                  <div>📅 创建于 {formatCreatedDate(capsule.createdAt)}</div>
                </div>
              </div>

              <CountdownDisplay openDate={capsule.openDate} isUnlocked={isUnlocked(capsule)} />

              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  📅 开启时间：{formatDate(capsule.openDate)}
                </div>
              </div>

              {isUnlocked(capsule) && (
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '2px solid #10b981',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  position: 'relative'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#059669', 
                    marginBottom: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '18px' }}>💌</span>
                    胶囊内容
                  </div>
                  <p style={{
                    whiteSpace: 'pre-wrap',
                    color: '#1f2937',
                    lineHeight: '1.8',
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 500
                  }}>
                    {capsule.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CapsuleList;
