const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: '未授权，请重新登录' 
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          message: '用户不存在，请重新登录' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Token 验证错误:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: '登录已过期，请重新登录' 
        });
      }
      res.status(401).json({ 
        success: false,
        message: '无效的令牌，请重新登录' 
      });
    }
  }

  if (!token) {
    res.status(401).json({ 
      success: false,
      message: '未授权，请先登录' 
    });
  }
};

module.exports = { protect };
