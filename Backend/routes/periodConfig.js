const express = require('express');
const router = express.Router();
const PeriodConfig = require('../models/PeriodConfig');
const { auth } = require('../middleware/auth');

// Get current active period configuration (for backward compatibility)
router.get('/active', auth, async (req, res) => {
  try {
    // Return all configurations as "active" - all should be available
    const allConfigs = await PeriodConfig.find().sort({ academicYear: -1 });
    res.json(allConfigs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch period configuration' });
  }
});

// Get period configuration by academic year
router.get('/academic-year/:year', auth, async (req, res) => {
  try {
    const config = await PeriodConfig.findOne({ academicYear: req.params.year });
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch period configuration' });
  }
});

// Get all period configurations
router.get('/', auth, async (req, res) => {
  try {
    const configs = await PeriodConfig.find().sort({ academicYear: -1 });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch period configurations' });
  }
});

// Create new period configuration
router.post('/', auth, async (req, res) => {
  try {
    const { academicYear, periods } = req.body;
    
    const newConfig = new PeriodConfig({
      academicYear,
      periods
    });
    
    await newConfig.save();
    res.status(201).json(newConfig);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create period configuration' });
  }
});

// Update period configuration
router.put('/:id', auth, async (req, res) => {
  try {
    const { academicYear, periods } = req.body;
    
    const updatedConfig = await PeriodConfig.findByIdAndUpdate(
      req.params.id,
      { academicYear, periods },
      { new: true }
    );
    
    if (!updatedConfig) {
      return res.status(404).json({ message: 'Period configuration not found' });
    }
    
    res.json(updatedConfig);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update period configuration' });
  }
});

module.exports = router;
