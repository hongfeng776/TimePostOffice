const express = require('express');
const Capsule = require('../models/Capsule');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const deleteImageFile = (filename) => {
  try {
    const uploadDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('文件删除成功:', filename);
    }
  } catch (error) {
    console.error('删除文件失败:', error);
  }
};

router.get('/', protect, async (req, res) => {
  try {
    console.log('获取胶囊列表 - 用户ID:', req.user._id);
    
    const capsules = await Capsule.find({ createdBy: req.user._id })
      .select('title content images openDate isOpened createdAt createdBy')
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
      
      if (capsule.images && capsule.images.length > 0) {
        capsule.images = capsule.images.map(image => {
          if (!image.path.startsWith('http')) {
            image.path = `${req.protocol}://${req.get('host')}${image.path}`;
          }
          return image;
        });
      }
      
      return capsule;
    });

    res.json({ success: true, data: processedCapsules });
  } catch (error) {
    console.error('获取胶囊列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

router.post('/', protect, upload.array('images', 5), async (req, res) => {
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

    const images = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
      size: file.size
    })) : [];

    console.log('创建胶囊 - 用户ID:', req.user._id);
    console.log('创建胶囊 - 数据:', { title: trimmedTitle, openDate: parsedOpenDate, imagesCount: images.length });

    const capsule = await Capsule.create({
      title: trimmedTitle,
      content: trimmedContent,
      images: images,
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
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: '图片大小不能超过2MB' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: '最多只能上传5张图片' });
    }
    res.status(500).json({ success: false, message: error.message || '服务器错误，请稍后重试' });
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

    if (capsule.images && capsule.images.length > 0) {
      capsule.images = capsule.images.map(image => {
        if (!image.path.startsWith('http')) {
          image.path = `${req.protocol}://${req.get('host')}${image.path}`;
        }
        return image;
      });
    }

    res.json({ success: true, data: capsule });
  } catch (error) {
    console.error('获取胶囊详情错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', protect, upload.array('images', 5), async (req, res) => {
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
        message: '无权限编辑' 
      });
    }

    if (capsule.isOpened) {
      return res.status(403).json({ 
        success: false, 
        message: '已开启的胶囊不能修改' 
      });
    }

    const { title, content, openDate } = req.body;

    if (title) {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 2 || trimmedTitle.length > 100) {
        return res.status(400).json({ 
          success: false, 
          message: '标题长度应在 2-100 字符之间' 
        });
      }
      capsule.title = trimmedTitle;
    }

    if (content) {
      const trimmedContent = content.trim();
      if (trimmedContent.length < 10 || trimmedContent.length > 10000) {
        return res.status(400).json({ 
          success: false, 
          message: '内容长度应在 10-10000 字符之间' 
        });
      }
      capsule.content = trimmedContent;
    }

    if (openDate) {
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
          message: '开启日期不能超过 10 年' 
        });
      }
      
      capsule.openDate = parsedOpenDate;
    }

    if (req.files && req.files.length > 0) {
      const totalImages = (capsule.images || []).length + req.files.length;
      if (totalImages > 5) {
        return res.status(400).json({ 
          success: false, 
          message: '最多只能上传 5 张图片' 
        });
      }

      const newImages = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
        size: file.size
      }));

      capsule.images = [...(capsule.images || []), ...newImages];
    }

    await capsule.save();

    res.json({ 
      success: true, 
      message: '胶囊更新成功', 
      data: capsule 
    });
  } catch (error) {
    console.error('编辑胶囊错误:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: '图片大小不能超过 2MB' });
    }
    res.status(500).json({ success: false, message: error.message || '服务器错误，请稍后重试' });
  }
});

router.delete('/:id/image/:imageIndex', protect, async (req, res) => {
  try {
    const capsule = await Capsule.findById(req.params.id);
    const imageIndex = parseInt(req.params.imageIndex);

    if (!capsule) {
      return res.status(404).json({ 
        success: false, 
        message: '胶囊不存在' 
      });
    }

    if (capsule.createdBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ 
        success: false, 
        message: '无权限操作' 
      });
    }

    if (capsule.isOpened) {
      return res.status(403).json({ 
        success: false, 
        message: '已开启的胶囊不能修改' 
      });
    }

    if (!capsule.images || imageIndex < 0 || imageIndex >= capsule.images.length) {
      return res.status(404).json({ 
        success: false, 
        message: '图片不存在' 
      });
    }

    const imageToDelete = capsule.images[imageIndex];
    deleteImageFile(imageToDelete.filename);

    capsule.images = capsule.images.filter((_, i) => i !== imageIndex);
    await capsule.save();

    res.json({ success: true, message: '图片删除成功', data: capsule });
  } catch (error) {
    console.error('删除胶囊图片错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/:id', protect, upload.array('images', 5), async (req, res) => {
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
        message: '无权限编辑' 
      });
    }

    if (capsule.isOpened) {
      return res.status(403).json({ 
        success: false, 
        message: '已开启的胶囊不能编辑' 
      });
    }

    const { title, content, openDate, removeImages } = req.body;

    if (title) {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 2 || trimmedTitle.length > 100) {
        return res.status(400).json({ 
          success: false, 
          message: '标题长度需要在 2-100 个字符之间' 
        });
      }
      capsule.title = trimmedTitle;
    }

    if (content) {
      const trimmedContent = content.trim();
      if (trimmedContent.length < 10 || trimmedContent.length > 10000) {
        return res.status(400).json({ 
          success: false, 
          message: '内容长度需要在 10-10000 个字符之间' 
        });
      }
      capsule.content = trimmedContent;
    }

    if (openDate) {
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

      capsule.openDate = parsedOpenDate;
    }

    if (removeImages) {
      const imagesToRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      imagesToRemove.forEach(filename => {
        deleteImageFile(filename);
        capsule.images = capsule.images.filter(img => img.filename !== filename);
      });
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
        size: file.size
      }));
      capsule.images = [...capsule.images, ...newImages];
    }

    await capsule.save();

    const updatedCapsule = capsule.toObject();
    if (updatedCapsule.images && updatedCapsule.images.length > 0) {
      updatedCapsule.images = updatedCapsule.images.map(image => {
        if (!image.path.startsWith('http')) {
          image.path = `${req.protocol}://${req.get('host')}${image.path}`;
        }
        return image;
      });
    }

    res.json({ 
      success: true, 
      message: '胶囊更新成功', 
      data: updatedCapsule 
    });
  } catch (error) {
    console.error('编辑胶囊错误:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: '图片大小不能超过 2MB' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: '最多只能上传 5 张图片' });
    }
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:id', protect, async (req, res) => {
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
        message: '无权限删除' 
      });
    }

    if (capsule.images && capsule.images.length > 0) {
      capsule.images.forEach(image => {
        deleteImageFile(image.filename);
      });
    }

    await Capsule.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: '胶囊删除成功' });
  } catch (error) {
    console.error('删除胶囊错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
