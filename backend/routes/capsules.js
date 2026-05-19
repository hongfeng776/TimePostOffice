const express = require('express');
const Capsule = require('../models/Capsule');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const capsules = await Capsule.find({ createdBy: req.user._id });
    res.json({ success: true, data: capsules });
  } catch (error) {
    console.error('获取胶囊列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { title, content, openDate } = req.body;

    if (!title || !content || !openDate) {
      return res.status(400).json({ 
        success: false, 
        message: '请填写所有必填字段' 
      });
    }

    if (title.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: '标题至少需要2个字符' 
      });
    }

    const capsule = await Capsule.create({
      title: title.trim(),
      content: content.trim(),
      openDate,
      createdBy: req.user._id
    });

    res.status(201).json({ 
      success: true, 
      message: '胶囊创建成功', 
      data: capsule 
    });
  } catch (error) {
    console.error('创建胶囊错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const capsule = await Capsule.findById(req.params.id);

    if (!capsule) {
      return res.status(404).json({ 
        success: false, 
        message: '胶囊不存在' 
      });
    }

    if (capsule.createdBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ 
        success: false, 
        message: '无权限访问' 
      });
    }

    const now = new Date();
    const openDate = new Date(capsule.openDate);

    if (now < openDate && !capsule.isOpened) {
      return res.status(403).json({ 
        success: false,
        message: '这个胶囊还没到开启时间',
        openDate: capsule.openDate
      });
    }

    if (!capsule.isOpened) {
      capsule.isOpened = true;
      await capsule.save();
    }

    res.json({ success: true, data: capsule });
  } catch (error) {
    console.error('获取胶囊详情错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
