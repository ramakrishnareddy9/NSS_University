import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { ChevronDownIcon, PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const YEAR_LEVELS = ['1st', '2nd', '3rd', '4th', 'PG'];

export default function PeriodConfigManagement() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedConfigs, setExpandedConfigs] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    periods: {
      '1st': [],
      '2nd': [],
      '3rd': [],
      '4th': [],
      'PG': []
    }
  });

  // Fetch all period configurations
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/period-config');
      setConfigs(response.data);
    } catch (error) {
      toast.error('Failed to fetch period configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Initialize form with empty periods
  const initializeForm = () => {
    setFormData({
      academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      periods: {
        '1st': [{ periodNumber: 1, startTime: '09:00', endTime: '10:00' }],
        '2nd': [{ periodNumber: 1, startTime: '10:00', endTime: '11:00' }],
        '3rd': [{ periodNumber: 1, startTime: '11:00', endTime: '12:00' }],
        '4th': [{ periodNumber: 1, startTime: '14:00', endTime: '15:00' }],
        'PG': [{ periodNumber: 1, startTime: '09:00', endTime: '10:00' }]
      }
    });
    setEditingId(null);
  };

  // Validate time format HH:MM
  const validateTimeFormat = (time) => {
    const pattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    return pattern.test(time);
  };

  // Handle period time change
  const handlePeriodChange = (yearLevel, index, field, value) => {
    const updatedPeriods = [...formData.periods[yearLevel]];
    updatedPeriods[index] = { ...updatedPeriods[index], [field]: value };
    
    setFormData({
      ...formData,
      periods: {
        ...formData.periods,
        [yearLevel]: updatedPeriods
      }
    });
  };

  // Add new period to a year level
  const addPeriod = (yearLevel) => {
    const currentPeriods = formData.periods[yearLevel] || [];
    const newPeriodNumber = Math.max(...currentPeriods.map(p => p.periodNumber || 0), 0) + 1;
    
    const updatedPeriods = [
      ...currentPeriods,
      { periodNumber: newPeriodNumber, startTime: '09:00', endTime: '10:00' }
    ];
    
    setFormData({
      ...formData,
      periods: {
        ...formData.periods,
        [yearLevel]: updatedPeriods
      }
    });
  };

  // Remove period from a year level
  const removePeriod = (yearLevel, index) => {
    const updatedPeriods = formData.periods[yearLevel].filter((_, i) => i !== index);
    
    setFormData({
      ...formData,
      periods: {
        ...formData.periods,
        [yearLevel]: updatedPeriods
      }
    });
  };

  // Validate all periods before save
  const validateAllPeriods = () => {
    for (const yearLevel of YEAR_LEVELS) {
      const periods = formData.periods[yearLevel] || [];
      for (const period of periods) {
        if (!validateTimeFormat(period.startTime)) {
          toast.error(`Invalid start time format for ${yearLevel}: ${period.startTime}. Use HH:MM format.`);
          return false;
        }
        if (!validateTimeFormat(period.endTime)) {
          toast.error(`Invalid end time format for ${yearLevel}: ${period.endTime}. Use HH:MM format.`);
          return false;
        }
      }
    }
    return true;
  };

  // Save new or update existing period configuration
  const handleSaveConfig = async () => {
    if (!formData.academicYear.trim()) {
      toast.error('Please enter academic year');
      return;
    }

    if (!validateAllPeriods()) {
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        // Update existing
        await api.put(`/period-config/${editingId}`, formData);
        toast.success('Period configuration updated successfully');
      } else {
        // Create new
        await api.post('/period-config', formData);
        toast.success('Period configuration created successfully');
      }
      
      setShowForm(false);
      initializeForm();
      fetchConfigs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save period configuration');
    } finally {
      setLoading(false);
    }
  };

  // Edit existing config
  const handleEdit = (config) => {
    setFormData({
      academicYear: config.academicYear,
      periods: config.periods
    });
    setEditingId(config._id);
    setShowForm(true);
  };

  // Delete config
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/period-config/${id}`);
      toast.success('Period configuration deleted successfully');
      fetchConfigs();
    } catch (error) {
      toast.error('Failed to delete period configuration');
    } finally {
      setLoading(false);
    }
  };

  // Toggle config expansion
  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedConfigs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedConfigs(newExpanded);
  };

  const handleCancel = () => {
    setShowForm(false);
    initializeForm();
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Period Configuration Management</h1>
        <p className="text-gray-600">Manage class periods for different year levels and academic years</p>
      </div>

      {/* Add New Button */}
      {!showForm && (
        <button
          onClick={() => {
            initializeForm();
            setShowForm(true);
          }}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          New Configuration
        </button>
      )}

      {/* Form Section */}
      {showForm && (
        <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            {editingId ? 'Edit Period Configuration' : 'Create New Period Configuration'}
          </h2>

          {/* Academic Year Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <input
              type="text"
              placeholder="e.g., 2024-2025"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Year Levels and Periods */}
          <div className="space-y-6">
            {YEAR_LEVELS.map((yearLevel) => (
              <div key={yearLevel} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{yearLevel} Year</h3>

                <div className="space-y-3">
                  {(formData.periods[yearLevel] || []).map((period, index) => (
                    <div key={index} className="flex gap-3 items-center bg-gray-50 p-3 rounded">
                      <label className="w-20 text-sm font-medium text-gray-700">
                        Period {period.periodNumber}
                      </label>

                      <div className="flex-1 flex gap-2">
                        <input
                          type="time"
                          value={period.startTime}
                          onChange={(e) => handlePeriodChange(yearLevel, index, 'startTime', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="HH:MM"
                        />
                        <span className="px-3 py-2 text-gray-500">to</span>
                        <input
                          type="time"
                          value={period.endTime}
                          onChange={(e) => handlePeriodChange(yearLevel, index, 'endTime', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="HH:MM"
                        />
                      </div>

                      <button
                        onClick={() => removePeriod(yearLevel, index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                        title="Remove period"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => addPeriod(yearLevel)}
                    className="w-full py-2 px-3 border border-dashed border-gray-300 rounded text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Period
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={handleSaveConfig}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition flex items-center gap-2"
            >
              <CheckIcon className="h-5 w-5" />
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
            >
              <XMarkIcon className="h-5 w-5" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Configurations List */}
      <div className="space-y-4">
        {configs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No period configurations found</p>
          </div>
        ) : (
          configs.map((config) => (
            <div key={config._id} className="bg-white rounded-lg shadow border border-gray-200">
              {/* Header */}
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(config._id)}>
                <div className="flex items-center gap-3">
                  <ChevronDownIcon
                    className={`h-5 w-5 transition ${expandedConfigs.has(config._id) ? 'rotate-180' : ''}`}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{config.academicYear}</h3>
                    <p className="text-sm text-gray-600">
                      {YEAR_LEVELS.reduce((total, level) => total + (config.periods[level]?.length || 0), 0)} total periods
                    </p>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(config)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                    title="Edit configuration"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(config._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                    title="Delete configuration"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedConfigs.has(config._id) && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {YEAR_LEVELS.map((yearLevel) => (
                      <div key={yearLevel}>
                        <h4 className="font-semibold text-gray-900 mb-3">{yearLevel} Year</h4>
                        <div className="space-y-2">
                          {(config.periods[yearLevel] || []).length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No periods configured</p>
                          ) : (
                            (config.periods[yearLevel] || []).map((period, idx) => (
                              <div key={idx} className="text-sm bg-white p-2 rounded border border-gray-200">
                                <span className="font-medium">Period {period.periodNumber}:</span>
                                <span className="ml-2 text-gray-700">
                                  {period.startTime} - {period.endTime}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 text-sm text-blue-800">
                    <strong>Created:</strong> {new Date(config.createdAt).toLocaleDateString()}
                    {config.updatedAt && <> • <strong>Updated:</strong> {new Date(config.updatedAt).toLocaleDateString()}</>}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
