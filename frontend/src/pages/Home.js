import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <h1>🕰️ 时间邮局</h1>
      <p>
        给未来的自己写一封信，创建专属的数字时间胶囊，在指定的日期开启，遇见未来的自己。
      </p>
      <div className="home-buttons">
        {user ? (
          <Link to="/dashboard" className="btn btn-primary">查看我的胶囊</Link>
        ) : (
          <>
            <Link to="/login" className="btn btn-primary">开始使用</Link>
            <Link to="/register" className="btn btn-secondary">立即注册</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default Home;
