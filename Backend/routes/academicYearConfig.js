const express = require('express');
const { body, validationResult } = require('express-validator');
const AcademicYearConfig = require('../models/AcademicYearConfig');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

function parseBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

router.get('/', [auth, authorize('admin')], async (req, res) => {
  try {
    const configs = await AcademicYearConfig.find().sort({ createdAt: -1 });
    res.json(configs);
  } catch (error) {
    console.error('Get academic year configs error:', error);
    res.status(500).json({ message: 'Failed to fetch academic year configurations' });
  }
});

router.get('/active', [auth, authorize('admin')], async (req, res) => {
  try {
    const configs = await AcademicYearConfig.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(configs);
  } catch (error) {
    console.error('Get active academic year configs error:', error);
    res.status(500).json({ message: 'Failed to fetch active academic year configurations' });
  }
});

router.get('/:yearLabel', [auth, authorize('admin')], async (req, res) => {
  try {
    const config = await AcademicYearConfig.findOne({ yearLabel: req.params.yearLabel.trim() });

    if (!config) {
      return res.status(404).json({ message: 'Academic year configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Get academic year config error:', error);
    res.status(500).json({ message: 'Failed to fetch academic year configuration' });
  }
});

router.post('/', [
  auth,
  authorize('admin'),
  body('yearLabel').trim().notEmpty().withMessage('Year label is required'),
  body('startMonth').isInt({ min: 1, max: 12 }).withMessage('Start month must be between 1 and 12'),
  body('endMonth').isInt({ min: 1, max: 12 }).withMessage('End month must be between 1 and 12')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { yearLabel, startMonth, endMonth, isActive = true } = req.body;
    const normalizedYearLabel = String(yearLabel).trim();

    const existingConfig = await AcademicYearConfig.findOne({ yearLabel: normalizedYearLabel });
    if (existingConfig) {
      return res.status(400).json({ message: 'Academic year configuration already exists' });
    }

    const config = new AcademicYearConfig({
      yearLabel: normalizedYearLabel,
      startMonth: Number(startMonth),
      endMonth: Number(endMonth),
      isActive: parseBoolean(isActive)
    });

    await config.save();
    res.status(201).json(config);
  } catch (error) {
    console.error('Create academic year config error:', error);
    res.status(500).json({ message: 'Failed to create academic year configuration' });
  }
});

router.put('/:id', [
  auth,
  authorize('admin'),
  body('yearLabel').trim().notEmpty().withMessage('Year label is required'),
  body('startMonth').isInt({ min: 1, max: 12 }).withMessage('Start month must be between 1 and 12'),
  body('endMonth').isInt({ min: 1, max: 12 }).withMessage('End month must be between 1 and 12')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { yearLabel, startMonth, endMonth, isActive = true } = req.body;

    const updatedConfig = await AcademicYearConfig.findByIdAndUpdate(
      req.params.id,
      {
        yearLabel: String(yearLabel).trim(),
        startMonth: Number(startMonth),
        endMonth: Number(endMonth),
        isActive: parseBoolean(isActive)
      },
      { new: true, runValidators: true }
    );

    if (!updatedConfig) {
      return res.status(404).json({ message: 'Academic year configuration not found' });
    }

    res.json(updatedConfig);
  } catch (error) {
    console.error('Update academic year config error:', error);
    res.status(500).json({ message: 'Failed to update academic year configuration' });
  }
});

router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const deletedConfig = await AcademicYearConfig.findByIdAndDelete(req.params.id);

    if (!deletedConfig) {
      return res.status(404).json({ message: 'Academic year configuration not found' });
    }

    res.json({ message: 'Academic year configuration deleted successfully' });
  } catch (error) {
    console.error('Delete academic year config error:', error);
    res.status(500).json({ message: 'Failed to delete academic year configuration' });
  }
});

module.exports = router;