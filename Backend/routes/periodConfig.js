const express = require('express');
const router = express.Router();
const PeriodConfig = require('../models/PeriodConfig');
const { auth, authorize } = require('../middleware/auth');

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

// Get all period configurations (ADMIN/FACULTY ONLY)
router.get('/', [auth, authorize('admin', 'faculty')], async (req, res) => {
  try {
    const configs = await PeriodConfig.find().sort({ academicYear: -1 });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch period configurations' });
  }
});

// Create new period configuration (ADMIN ONLY)
router.post('/', [auth, authorize('admin')], async (req, res) => {
  try {
    const { academicYear, periods } = req.body;
    
    // Validate time format (HH:MM) for all periods
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    
    for (const year in periods) {
      if (Array.isArray(periods[year])) {
        for (const period of periods[year]) {
          if (!timePattern.test(period.startTime)) {
            return res.status(400).json({ 
              message: `Invalid time format for ${year}. Start time must be HH:MM format.`,
              invalidTime: period.startTime 
            });
          }
          if (!timePattern.test(period.endTime)) {
            return res.status(400).json({ 
              message: `Invalid time format for ${year}. End time must be HH:MM format.`,
              invalidTime: period.endTime 
            });
          }
        }
      }
    }
    
    const newConfig = new PeriodConfig({
      academicYear,
      periods
    });
    
    await newConfig.save();
    res.status(201).json(newConfig);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create period configuration', error: error.message });
  }
});

// Update period configuration (ADMIN ONLY)
router.put('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const { academicYear, periods } = req.body;
    
    // Validate time format (HH:MM) for all periods
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    
    for (const year in periods) {
      if (Array.isArray(periods[year])) {
        for (const period of periods[year]) {
          if (!timePattern.test(period.startTime)) {
            return res.status(400).json({ 
              message: `Invalid time format for ${year}. Start time must be HH:MM format.`,
              invalidTime: period.startTime 
            });
          }
          if (!timePattern.test(period.endTime)) {
            return res.status(400).json({ 
              message: `Invalid time format for ${year}. End time must be HH:MM format.`,
              invalidTime: period.endTime 
            });
          }
        }
      }
    }
    
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
    res.status(500).json({ message: 'Failed to update period configuration', error: error.message });
  }
});

// Delete period configuration (ADMIN ONLY)
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const deletedConfig = await PeriodConfig.findByIdAndDelete(req.params.id);
    
    if (!deletedConfig) {
      return res.status(404).json({ message: 'Period configuration not found' });
    }
    
    res.json({ message: 'Period configuration deleted successfully', config: deletedConfig });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete period configuration', error: error.message });
  }
});

// Validate period time format
router.post('/validate/time', auth, (req, res) => {
  try {
    const { time } = req.body;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    
    const isValid = timePattern.test(time);
    res.json({ 
      time, 
      isValid,
      message: isValid ? 'Valid HH:MM format' : 'Invalid format. Expected HH:MM (e.g., 09:30)'
    });
  } catch (error) {
    res.status(500).json({ message: 'Validation failed', error: error.message });
  }
});

module.exports = router;
