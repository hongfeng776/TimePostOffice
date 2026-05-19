import { useState, useEffect } from 'react';
import axios from '../utils/axios';

function Dashboard() {
  const [capsules, setCapsules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    openDate: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    fetchCapsules();
  }, []);

  const fetchCapsules = async () => {
    try {
      setFetchLoading(true);
      const response = await axios.get('/api/capsules');
      if (response.data.success) {
        setCapsules(response.data.data || []);
      }
    } catch (error) {
      console.error('获取胶囊列表失败:', error);
    } finally {
      setFetchLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const { title, content, openDate } = formData;

    if (!title.trim()) {
      newErrors.title = '请输入标题';
    } else if (title.trim().length < 2) {
      newErrors.title = '标题至少需要2个字符';
    }

    if (!content.trim()) {
      newErrors.content = '请输入胶囊内容';
    } else if (content.trim().length < 10) {
      newErrors.content = '内容至少需要10个字符';
    }

    if (!openDate) {
      newErrors.openDate = '请选择开启日期';
    } else if (new Date(openDate) <= new Date()) {
      newErrors.openDate = '开启日期必须是未来的日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (submitSuccess) setSubmitSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setSubmitSuccess('');

    try {
      const response = await axios.post('/api/capsules', formData);
      if (response.data.success) {
        setFormData({ title: '', content: '', openDate: '' });
        setShowForm(false);
        setSubmitSuccess('胶囊创建成功！');
        fetchCapsules();
      }
    } catch (error) {
      console.error('创建胶囊失败:', error);
      alert(error.response?.data?.message || '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isLocked = (openDate) => {
    return new Date() < new Date(openDate);
  };

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>我的时间胶囊</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setShowForm(!showForm);
            setErrors({});
            setSubmitSuccess('');
          }}
        >
          {showForm ? '取消' : '+ 创建新胶囊'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>创建新的时间胶囊</h3>
          
          {submitSuccess && (
            <div style={{ 
              background: '#f0fff4', 
              border: '1px solid #9ae6b4', 
              color: '#2f855a', 
              padding: '12px', 
              borderRadius: '5px', 
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {submitSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>标题</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="给你的胶囊起个名字"
                className={errors.title ? 'input-error' : ''}
                disabled={loading}
              />
              {errors.title && <span className="error-text">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label>内容</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows="5"
                placeholder="写下你想对将来说的话..."
                className={errors.content ? 'input-error' : ''}
                disabled={loading}
              />
              {errors.content && <span className="error-text">{errors.content}</span>}
            </div>

            <div className="form-group">
              <label>开启日期</label>
              <input
                type="date"
                name="openDate"
                value={formData.openDate}
                onChange={handleChange}
                className={errors.openDate ? 'input-error' : ''}
                disabled={loading}
              />
              {errors.openDate && <span className="error-text">{errors.openDate}</span>}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '封存中...' : '封存胶囊'}
            </button>
          </form>
        </div>
      )}

      {fetchLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>加载中...</p>
        </div>
      ) : (
        <div className="grid">
          {capsules.map((capsule) => (
            <div
              key={capsule._id}
              className={`card capsule-card ${capsule.isOpened ? 'opened' : 'locked'}`}
            >
              <div className="capsule-title">{capsule.title}</div>
              <div className="capsule-date">
                📅 开启日期: {formatDate(capsule.openDate)}
              </div>
              <span className={`capsule-status ${capsule.isOpened ? 'opened' : 'locked'}`}>
                {capsule.isOpened ? '已开启' : (isLocked(capsule.openDate) ? '🔒 封存中' : '可开启')}
              </span>
              {capsule.isOpened && (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                  <p style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{capsule.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!fetchLoading && capsules.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📦</div>
          <h3 style={{ marginBottom: '10px', color: '#333' }}>还没有时间胶囊</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>点击上方按钮，创建你的第一个时间胶囊吧！</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            创建我的第一个胶囊
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
