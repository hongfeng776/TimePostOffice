import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">📮 时间邮局</Link>
      </div>
      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            <span className="user-welcome">
              👋 你好, <strong>{user?.username}</strong>
            </span>
            <Link to="/dashboard">创建胶囊</Link>
            <Link to="/capsules">胶囊列表</Link>
            <button className="btn btn-secondary" onClick={logout}>退出</button>
          </>
        ) : (
          <>
            <Link to="/login">登录</Link>
            <Link to="/register" className="btn btn-primary">注册</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
