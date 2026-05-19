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
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    fetchCapsules();
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      newErrors.title = '请输入胶囊标题';
    } else if (trimmedTitle.length < 2) {
      newErrors.title = '标题至少需要2个字符';
    } else if (trimmedTitle.length > 100) {
      newErrors.title = '标题不能超过100个字符';
    }

    if (!trimmedContent) {
      newErrors.content = '请输入胶囊内容';
    } else if (trimmedContent.length < 10) {
      newErrors.content = '内容至少需要10个字符，给将来说点什么吧';
    } else if (trimmedContent.length > 10000) {
      newErrors.content = '内容不能超过10000个字符';
    }

    if (!openDate) {
      newErrors.openDate = '请选择开启日期';
    } else {
      const selectedDate = new Date(openDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + 1);
      
      const maxDate = new Date(today);
      maxDate.setFullYear(maxDate.getFullYear() + 10);
      
      if (isNaN(selectedDate.getTime())) {
        newErrors.openDate = '无效的日期格式';
      } else if (selectedDate < minDate) {
        newErrors.openDate = '开启日期必须是明天或以后的日期';
      } else if (selectedDate > maxDate) {
        newErrors.openDate = '开启日期不能超过10年';
      }
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

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 5 - selectedImages.length;
    const filesToAdd = files.slice(0, remainingSlots);

    const validFiles = [];
    const newErrors = [];

    filesToAdd.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        newErrors.push(`图片 "${file.name}" 大小为 ${formatFileSize(file.size)}，超过 2MB 限制`);
      } else if (!file.type.startsWith('image/')) {
        newErrors.push(`"${file.name}" 不是有效的图片文件`);
      } else {
        validFiles.push(file);
      }
    });

    if (files.length > remainingSlots) {
      newErrors.push(`最多只能上传 5 张图片，已自动忽略 ${files.length - remainingSlots} 张`);
    }

    if (newErrors.length > 0) {
      setErrors(prev => ({ ...prev, images: newErrors.join('；') }));
    } else {
      setErrors(prev => ({ ...prev, images: '' }));
    }

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles]);
      
      const previews = await Promise.all(
        validFiles.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                dataUrl: reader.result,
                name: file.name,
                size: file.size
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );
      
      setImagePreviews(prev => [...prev, ...previews]);
    }

    e.target.value = '';
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setSubmitSuccess('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('content', formData.content);
      data.append('openDate', formData.openDate);
      
      selectedImages.forEach(image => {
        data.append('images', image);
      });

      const response = await axios.post('/api/capsules', data);
      
      if (response.data.success) {
        setFormData({ title: '', content: '', openDate: '' });
        setSelectedImages([]);
        setImagePreviews([]);
        setShowForm(false);
        setSubmitSuccess(response.data.message);
        fetchCapsules();
      }
    } catch (error) {
      console.error('创建胶囊失败:', error);
      const errorMsg = error.response?.data?.message || '创建失败，请重试';
      setErrors(prev => ({ ...prev, submit: errorMsg }));
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

  const deleteCapsule = async (id) => {
    if (!window.confirm('确定要删除这个胶囊吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      const response = await axios.delete(`/api/capsules/${id}`);
      if (response.data.success) {
        setCapsules(prev => prev.filter(c => c._id !== id));
      }
    } catch (error) {
      console.error('删除胶囊失败:', error);
      alert('删除失败，请重试');
    }
  };

  const isLocked = (openDate) => {
    return new Date() < new Date(openDate);
  };

  const getTimeUntilUnlock = (openDate) => {
    const now = new Date();
    const unlock = new Date(openDate);
    const diff = unlock - now;
    
    if (diff <= 0) return '已可开启';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `还有 ${days} 天 ${hours} 小时开启`;
    }
    return `还有 ${hours} 小时开启`;
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="dashboard">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '28px' }}>我的时间胶囊</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '5px 0 0 0' }}>
            共 {capsules.length} 个胶囊
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setShowForm(!showForm);
            setErrors({});
            setSubmitSuccess('');
          }}
          style={{ borderRadius: '50px', padding: '12px 28px' }}
        >
          {showForm ? '✕ 取消' : '+ 封存新胶囊'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '25px',
            paddingBottom: '20px',
            borderBottom: '1px solid #eee'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📦</div>
            <h3 style={{ margin: 0, color: '#1f2937', fontSize: '22px' }}>封存你的时间胶囊</h3>
            <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              给未来的自己写一封信，在指定日期开启
            </p>
          </div>
          
          {submitSuccess && (
            <div className="success-message">
              ✅ {submitSuccess}
            </div>
          )}

          {errors.submit && (
            <div className="error-message">
              ❌ {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📝</span>
                胶囊标题
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="给这个胶囊起个名字，例如：给一年后的自己（2-100字符）"
                className={errors.title ? 'input-error' : ''}
                disabled={loading}
                maxLength={100}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '12px',
                marginTop: '4px'
              }}>
                <span style={{ 
                  color: errors.title ? '#ef4444' : (formData.title.length > 0 && formData.title.length < 2 ? '#f59e0b' : '#9ca3af') 
                }}>
                  {errors.title ? errors.title : (formData.title.length > 0 && formData.title.length < 2 ? '标题至少需要2个字符' : '')}
                </span>
                <span style={{ 
                  color: formData.title.length > 90 ? '#ef4444' : (formData.title.length > 80 ? '#f59e0b' : '#9ca3af'),
                  fontWeight: formData.title.length > 90 ? 'bold' : 'normal'
                }}>
                  {formData.title.length}/100
                </span>
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💌</span>
                胶囊内容
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={8}
                placeholder="写下你想对将来说的话...可以是给未来自己的一封信，也可以是对某人的祝福，或者是一个秘密。（至少10个字符）"
                className={errors.content ? 'input-error' : ''}
                disabled={loading}
                maxLength={10000}
                style={{ resize: 'vertical' }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '12px',
                marginTop: '4px'
              }}>
                <span style={{ color: errors.content ? '#ef4444' : (formData.content.length < 10 ? '#f59e0b' : '#9ca3af') }}>
                  {errors.content ? errors.content : (formData.content.length < 10 && formData.content.length > 0 ? `还需要 ${10 - formData.content.length} 个字符` : '')}
                </span>
                <span style={{ 
                  color: formData.content.length > 9000 ? '#ef4444' : (formData.content.length > 8000 ? '#f59e0b' : '#9ca3af'),
                  fontWeight: formData.content.length > 9000 ? 'bold' : 'normal'
                }}>
                  {formData.content.length}/10000
                </span>
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔓</span>
                开启日期
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                name="openDate"
                value={formData.openDate}
                onChange={handleChange}
                min={getMinDate()}
                max={getMaxDate()}
                className={errors.openDate ? 'input-error' : ''}
                disabled={loading}
              />
              {errors.openDate && <span className="error-text">{errors.openDate}</span>}
              <p style={{ 
                fontSize: '12px', 
                color: '#9ca3af', 
                marginTop: '6px',
                marginBottom: 0 
              }}>
                💡 提示：选择明天到10年内的某个日期，到那天你才能打开这个胶囊
              </p>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🖼️</span>
                上传图片
                <span style={{ color: '#9ca3af', fontSize: '13px' }}>（可选，最多5张，每张不超过2MB）</span>
              </label>
              
              {imagePreviews.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  {imagePreviews.map((preview, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img 
                        src={preview.dataUrl} 
                        alt={preview.name}
                        onClick={() => setSelectedPreviewImage(preview.dataUrl)}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        fontSize: '10px',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatFileSize(preview.size)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          zIndex: 10
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedImages.length < 5 && (
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '30px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: '#f9fafb'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.background = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.background = '#f9fafb';
                }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: '32px', marginBottom: '8px' }}>📷</span>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>
                    点击选择图片（{selectedImages.length}/5）
                  </span>
                </label>
              )}

              {errors.images && (
                <span className="error-text" style={{ display: 'block', marginTop: '8px' }}>
                  {errors.images}
                </span>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '14px',
                fontSize: '16px',
                marginTop: '10px'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span className="spinner"></span>
                  封存中...
                </span>
              ) : '🔒 封存时间胶囊'}
            </button>
          </form>
        </div>
      )}

      {fetchLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div className="spinner" style={{ margin: '0 auto 15px auto' }}></div>
          <p style={{ color: '#6b7280' }}>正在加载你的胶囊...</p>
        </div>
      ) : capsules.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>还没有时间胶囊</h3>
          <p>点击上方按钮，创建你的第一个时间胶囊，给未来的自己写一封信吧！</p>
          {!showForm && (
            <button 
              className="btn btn-primary" 
              onClick={() => setShowForm(true)}
              style={{ marginTop: '10px' }}
            >
              创建我的第一个胶囊
            </button>
          )}
        </div>
      ) : (
        <div className="grid">
          {capsules.map((capsule) => (
            <div
              key={capsule._id}
              className={`card capsule-card ${capsule.isOpened ? 'opened' : 'locked'}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div className="capsule-title" style={{ margin: 0 }}>{capsule.title}</div>
                <button
                  onClick={() => deleteCapsule(capsule._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#fef2f2'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  title="删除胶囊"
                >
                  🗑️
                </button>
              </div>
              <div className="capsule-date">
                📅 开启时间：{formatDate(capsule.openDate)}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: isLocked(capsule.openDate) ? '#f59e0b' : '#10b981',
                marginBottom: '12px',
                fontWeight: 500
              }}>
                ⏰ {getTimeUntilUnlock(capsule.openDate)}
              </div>
              <span className={`capsule-status ${capsule.isOpened ? 'opened' : 'locked'}`}>
                {capsule.isOpened ? '📨 已开启' : '🔒 封存中'}
              </span>
              {capsule.isOpened && (
                <div style={{ 
                  marginTop: '15px', 
                  paddingTop: '15px', 
                  borderTop: '1px solid #eee'
                }}>
                  {capsule.images && capsule.images.length > 0 && (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      {capsule.images.map((image, index) => (
                        <img 
                          key={index}
                          src={image.path}
                          alt={image.originalName}
                          onClick={() => setSelectedPreviewImage(image.path)}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        />
                      ))}
                    </div>
                  )}
                  <p style={{ 
                    whiteSpace: 'pre-wrap', 
                    color: '#4b5563',
                    lineHeight: '1.7',
                    margin: 0,
                    fontSize: '14px'
                  }}>
                    {capsule.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedPreviewImage && (
        <div 
          onClick={() => setSelectedPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: '-webkit-flex',
            display: 'flex',
            WebkitAlignItems: 'center',
            alignItems: 'center',
            WebkitJustifyContent: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            cursor: 'pointer',
            WebkitOverflowScrolling: 'touch',
            overflow: 'hidden'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPreviewImage(null);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'white',
              border: 'none',
              fontSize: '28px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: '-webkit-flex',
              display: 'flex',
              WebkitAlignItems: 'center',
              alignItems: 'center',
              WebkitJustifyContent: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
              WebkitAppearance: 'none',
              appearance: 'none',
              zIndex: 10001
            }}
          >
            ×
          </button>
          <img 
            src={selectedPreviewImage} 
            alt="预览大图"
            style={{
              maxWidth: '90%',
              maxHeight: '85vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              WebkitObjectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              display: 'block'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
