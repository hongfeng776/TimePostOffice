const express = require('express');
const Capsule = require('../models/Capsule');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const capsules = await Capsule.find({ createdBy: req.user._id });
    res.json(capsules);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { title, content, openDate } = req.body;

    if (!title || !content || !openDate) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    const capsule = await Capsule.create({
      title,
      content,
      openDate,
      createdBy: req.user._id
    });

    res.status(201).json(capsule);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const capsule = await Capsule.findById(req.params.id);

    if (!capsule) {
      return res.status(404).json({ message: 'Capsule not found' });
    }

    if (capsule.createdBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const now = new Date();
    const openDate = new Date(capsule.openDate);

    if (now < openDate && !capsule.isOpened) {
      return res.status(403).json({ 
        message: 'This capsule is not ready to be opened yet',
        openDate: capsule.openDate
      });
    }

    if (!capsule.isOpened) {
      capsule.isOpened = true;
      await capsule.save();
    }

    res.json(capsule);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
