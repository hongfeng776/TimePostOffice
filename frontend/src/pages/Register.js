import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getStrengthLabel = (strength) => {
    if (strength <= 1) return { label: '弱', color: '#ef4444' };
    if (strength <= 2) return { label: '一般', color: '#f59e0b' };
    if (strength <= 3) return { label: '良好', color: '#10b981' };
    return { label: '强', color: '#10b981' };
  };

  const validateForm = () => {
    const newErrors = {};
    const { username, email, password, confirmPassword } = formData;

    if (!username.trim()) {
      newErrors.username = '请输入用户名';
    } else if (username.trim().length < 2) {
      newErrors.username = '用户名至少需要2个字符';
    }

    if (!email.trim()) {
      newErrors.email = '请输入邮箱';
    } else if (!validateEmail(email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    if (!password) {
      newErrors.password = '请输入密码';
    } else if (password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = '请确认密码';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
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
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setServerError('');

    try {
      await register(formData.username, formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthInfo = getStrengthLabel(passwordStrength);

  return (
    <div className="auth-form card">
      <h2>创建账号</h2>
      <p className="sub-title">开始你的时间胶囊之旅</p>
      
      {serverError && (
        <div className="error-message">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>用户名</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="请输入用户名"
            className={errors.username ? 'input-error' : ''}
            disabled={loading}
          />
          {errors.username && <span className="error-text">{errors.username}</span>}
        </div>

        <div className="form-group">
          <label>邮箱</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="请输入邮箱地址"
            className={errors.email ? 'input-error' : ''}
            disabled={loading}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label>密码</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="请输入密码"
            className={errors.password ? 'input-error' : ''}
            disabled={loading}
          />
          {formData.password && (
            <div className="password-strength">
              <div className="strength-label">
                <span>密码强度</span>
                <span style={{ color: strengthInfo.color, fontWeight: 'bold' }}>
                  {strengthInfo.label}
                </span>
              </div>
              <div className="strength-bar">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="strength-segment"
                    style={{
                      backgroundColor: level <= passwordStrength ? strengthInfo.color : '#e5e7eb'
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label>确认密码</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="请再次输入密码"
            className={errors.confirmPassword ? 'input-error' : ''}
            disabled={loading}
          />
          {errors.confirmPassword && (
            <span className="error-text">{errors.confirmPassword}</span>
          )}
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <div className="auth-footer">
        <p>已有账号？ <Link to="/login">立即登录</Link></p>
      </div>
    </div>
  );
}

export default Register;
