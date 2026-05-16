import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const PeriodConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    academicYear: '',
    periods: {
      '1st': [],
      '2nd': [],
      '3rd': [],
      '4th': [],
      'PG': []
    }
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const configsRes = await api.get('/period-config');
      setConfigs(configsRes.data);
    } catch (error) {
      toast.error('Failed to fetch period configurations');
    } finally {
      setLoading(false);
    }
  };

  const initializePeriods = () => {
    const defaultPeriods = {
      '1st': [
        { periodNumber: 1, startTime: '09:00', endTime: '09:50' },
        { periodNumber: 2, startTime: '09:50', endTime: '10:40' },
        { periodNumber: 3, startTime: '11:00', endTime: '11:50' },
        { periodNumber: 4, startTime: '11:50', endTime: '12:40' },
        { periodNumber: 5, startTime: '14:00', endTime: '14:50' },
        { periodNumber: 6, startTime: '14:50', endTime: '15:40' },
        { periodNumber: 7, startTime: '15:40', endTime: '16:30' },
        { periodNumber: 8, startTime: '16:30', endTime: '17:20' }
      ],
      '2nd': [
        { periodNumber: 1, startTime: '09:00', endTime: '09:50' },
        { periodNumber: 2, startTime: '09:50', endTime: '10:40' },
        { periodNumber: 3, startTime: '11:00', endTime: '11:50' },
        { periodNumber: 4, startTime: '11:50', endTime: '12:40' },
        { periodNumber: 5, startTime: '14:00', endTime: '14:50' },
        { periodNumber: 6, startTime: '14:50', endTime: '15:40' },
        { periodNumber: 7, startTime: '15:40', endTime: '16:30' },
        { periodNumber: 8, startTime: '16:30', endTime: '17:20' }
      ],
      '3rd': [
        { periodNumber: 1, startTime: '09:00', endTime: '09:50' },
        { periodNumber: 2, startTime: '09:50', endTime: '10:40' },
        { periodNumber: 3, startTime: '11:00', endTime: '11:50' },
        { periodNumber: 4, startTime: '11:50', endTime: '12:40' },
        { periodNumber: 5, startTime: '14:00', endTime: '14:50' },
        { periodNumber: 6, startTime: '14:50', endTime: '15:40' },
        { periodNumber: 7, startTime: '15:40', endTime: '16:30' },
        { periodNumber: 8, startTime: '16:30', endTime: '17:20' }
      ],
      '4th': [
        { periodNumber: 1, startTime: '09:00', endTime: '09:50' },
        { periodNumber: 2, startTime: '09:50', endTime: '10:40' },
        { periodNumber: 3, startTime: '11:00', endTime: '11:50' },
        { periodNumber: 4, startTime: '11:50', endTime: '12:40' },
        { periodNumber: 5, startTime: '14:00', endTime: '14:50' },
        { periodNumber: 6, startTime: '14:50', endTime: '15:40' },
        { periodNumber: 7, startTime: '15:40', endTime: '16:30' },
        { periodNumber: 8, startTime: '16:30', endTime: '17:20' }
      ],
      'PG': [
        { periodNumber: 1, startTime: '09:00', endTime: '09:50' },
        { periodNumber: 2, startTime: '09:50', endTime: '10:40' },
        { periodNumber: 3, startTime: '11:00', endTime: '11:50' },
        { periodNumber: 4, startTime: '11:50', endTime: '12:40' },
        { periodNumber: 5, startTime: '14:00', endTime: '14:50' },
        { periodNumber: 6, startTime: '14:50', endTime: '15:40' },
        { periodNumber: 7, startTime: '15:40', endTime: '16:30' },
        { periodNumber: 8, startTime: '16:30', endTime: '17:20' }
      ]
    };
    
    setFormData(prev => ({
      ...prev,
      periods: defaultPeriods
    }));
  };

  const openModal = (config = null) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        academicYear: config.academicYear,
        periods: config.periods
      });
    } else {
      setEditingConfig(null);
      setFormData({
        academicYear: '',
        periods: {
          '1st': [],
          '2nd': [],
          '3rd': [],
          '4th': [],
          'PG': []
        }
      });
      initializePeriods();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingConfig(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingConfig) {
        await api.put(`/period-config/${editingConfig._id}`, formData);
        toast.success('Period configuration updated successfully');
      } else {
        await api.post('/period-config', formData);
        toast.success('Period configuration created successfully');
      }
      closeModal();
      fetchConfigs();
    } catch (error) {
      toast.error('Failed to save period configuration');
    }
  };

  const updatePeriod = (year, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      periods: {
        ...prev.periods,
        [year]: prev.periods[year].map((period, i) =>
          i === index ? { ...period, [field]: value } : period
        )
      }
    }));
  };

  const addPeriod = (year) => {
    const newPeriodNumber = formData.periods[year].length + 1;
    setFormData(prev => ({
      ...prev,
      periods: {
        ...prev.periods,
        [year]: [...prev.periods[year], {
          periodNumber: newPeriodNumber,
          startTime: '09:00',
          endTime: '09:50'
        }]
      }
    }));
  };

  const removePeriod = (year, index) => {
    setFormData(prev => ({
      ...prev,
      periods: {
        ...prev.periods,
        [year]: prev.periods[year].filter((_, i) => i !== index)
      }
    }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Period Configuration</h1>
        <button
          onClick={() => openModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Configuration
        </button>
      </div>

      {/* Configurations List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Academic Year Configurations</h2>
          <p className="text-sm text-gray-500 mt-1">All configurations are available for OD calculations based on academic year</p>
        </div>
        <div className="divide-y divide-gray-200">
          {configs.map((config) => (
            <div key={config._id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium text-gray-900">
                    Academic Year: {config.academicYear}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(config.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openModal(config)}
                    className="text-indigo-600 hover:text-indigo-800 px-3 py-1 text-sm"
                  >
                    <PencilIcon className="h-4 w-4 inline" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingConfig ? 'Edit Configuration' : 'Create New Configuration'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., 2024-2025"
                  required
                />
              </div>

              {/* Periods for each year */}
              {['1st', '2nd', '3rd', '4th', 'PG'].map((year) => (
                <div key={year} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-medium text-gray-900">{year} Year Periods</h4>
                    <button
                      type="button"
                      onClick={() => addPeriod(year)}
                      className="text-primary-600 hover:text-primary-800 text-sm"
                    >
                      <PlusIcon className="h-4 w-4 inline" /> Add Period
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {formData.periods[year].map((period, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="w-20 text-sm">Period {period.periodNumber}</span>
                        <input
                          type="time"
                          value={period.startTime}
                          onChange={(e) => updatePeriod(year, index, 'startTime', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          required
                        />
                        <span className="text-sm">to</span>
                        <input
                          type="time"
                          value={period.endTime}
                          onChange={(e) => updatePeriod(year, index, 'endTime', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => removePeriod(year, index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  {editingConfig ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeriodConfig;
