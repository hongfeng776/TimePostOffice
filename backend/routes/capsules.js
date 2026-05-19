const express = require('express');
const Capsule = require('../models/Capsule');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    console.log('获取胶囊列表 - 用户ID:', req.user._id);
    
    const capsules = await Capsule.find({ createdBy: req.user._id })
      .select('title content openDate isOpened createdAt createdBy')
      .sort({ createdAt: -1 });
    
    console.log('找到胶囊数量:', capsules.length);

    const processedCapsules = capsules.map(capsule => {
      const now = new Date();
      const openDate = new Date(capsule.openDate);
      
      if (!capsule.isOpened && now >= openDate) {
        capsule.isOpened = true;
        capsule.save();
        console.log('自动解锁胶囊:', capsule._id);
      }
      
      return capsule;
    });

    res.json({ success: true, data: processedCapsules });
  } catch (error) {
    console.error('获取胶囊列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
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

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (trimmedTitle.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: '标题至少需要2个字符' 
      });
    }

    if (trimmedTitle.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: '标题不能超过100个字符' 
      });
    }

    if (trimmedContent.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: '内容至少需要10个字符' 
      });
    }

    if (trimmedContent.length > 10000) {
      return res.status(400).json({ 
        success: false, 
        message: '内容不能超过10000个字符' 
      });
    }

    const parsedOpenDate = new Date(openDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 1);
    
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    
    if (isNaN(parsedOpenDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: '无效的日期格式' 
      });
    }

    if (parsedOpenDate < minDate) {
      return res.status(400).json({ 
        success: false, 
        message: '开启日期必须是明天或以后的日期' 
      });
    }

    if (parsedOpenDate > maxDate) {
      return res.status(400).json({ 
        success: false, 
        message: '开启日期不能超过10年' 
      });
    }

    console.log('创建胶囊 - 用户ID:', req.user._id);
    console.log('创建胶囊 - 数据:', { title: trimmedTitle, openDate: parsedOpenDate });

    const capsule = await Capsule.create({
      title: trimmedTitle,
      content: trimmedContent,
      openDate: parsedOpenDate,
      createdBy: req.user._id,
      isOpened: false
    });

    console.log('胶囊创建成功 - ID:', capsule._id);

    res.status(201).json({ 
      success: true, 
      message: '胶囊封存成功！', 
      data: {
        _id: capsule._id,
        title: capsule.title,
        openDate: capsule.openDate,
        createdAt: capsule.createdAt,
        createdBy: capsule.createdBy
      }
    });
  } catch (error) {
    console.error('创建胶囊错误:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
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
