const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: '请填写所有必填字段' 
      });
    }

    if (username.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        message: '用户名至少需要2个字符' 
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false,
        message: '请输入有效的邮箱地址' 
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ 
        success: false,
        message: '密码至少需要6个字符' 
      });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ 
        success: false,
        message: '该邮箱已被注册' 
      });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ 
        success: false,
        message: '该用户名已被使用' 
      });
    }

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase(),
      password
    });

    if (user) {
      res.status(201).json({
        success: true,
        message: '注册成功',
        _id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ 
        success: false,
        message: '注册失败，请重试' 
      });
    }
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器错误，请稍后重试' 
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: '请输入邮箱和密码' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: '该邮箱未注册' 
      });
    }

    if (user && (await user.comparePassword(password))) {
      res.json({
        success: true,
        message: '登录成功',
        _id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ 
        success: false,
        message: '密码错误' 
      });
    }
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器错误，请稍后重试' 
    });
  }
});

module.exports = router;
