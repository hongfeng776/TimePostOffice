import { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [capsules, setCapsules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [openDate, setOpenDate] = useState('');

  useEffect(() => {
    fetchCapsules();
  }, []);

  const fetchCapsules = async () => {
    try {
      const response = await axios.get('/api/capsules');
      setCapsules(response.data);
    } catch (error) {
      console.error('Failed to fetch capsules:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/capsules', { title, content, openDate });
      setTitle('');
      setContent('');
      setOpenDate('');
      setShowForm(false);
      fetchCapsules();
    } catch (error) {
      console.error('Failed to create capsule:', error);
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
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '取消' : '+ 创建新胶囊'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>创建新的时间胶囊</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows="5"
                required
              />
            </div>
            <div className="form-group">
              <label>开启日期</label>
              <input
                type="date"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">封存胶囊</button>
          </form>
        </div>
      )}

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
            <span className={`capsule-status ${capsule.isOpened ? 'opened' : 'locked'}">
              {capsule.isOpened ? '已开启' : (isLocked(capsule.openDate) ? '🔒 封存中' : '可开启'}
            </span>
            {capsule.isOpened && (
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                <p>{capsule.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {capsules.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p>你还没有创建任何时间胶囊，点击上方按钮创建你的第一个胶囊吧！</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
