import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

const AcademicYearConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formData, setFormData] = useState({
    yearLabel: '',
    startMonth: 6,
    endMonth: 5,
    isActive: true
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await api.get('/academic-year-config');
      setConfigs(response.data);
    } catch (error) {
      toast.error('Failed to fetch academic year configurations');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (config = null) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        yearLabel: config.yearLabel,
        startMonth: config.startMonth,
        endMonth: config.endMonth,
        isActive: config.isActive
      });
    } else {
      setEditingConfig(null);
      setFormData({
        yearLabel: '',
        startMonth: 6,
        endMonth: 5,
        isActive: true
      });
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingConfig(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingConfig) {
        await api.put(`/academic-year-config/${editingConfig._id}`, formData);
        toast.success('Academic year configuration updated');
      } else {
        await api.post('/academic-year-config', formData);
        toast.success('Academic year configuration created');
      }

      closeModal();
      fetchConfigs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save academic year configuration');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this academic year configuration?')) {
      return;
    }

    try {
      await api.delete(`/academic-year-config/${id}`);
      toast.success('Academic year configuration deleted');
      fetchConfigs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete academic year configuration');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Year Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Define the academic-year label and month boundaries used by events and reports.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Configuration
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Saved Configurations</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {configs.map((config) => (
            <div key={config._id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-md font-medium text-gray-900">
                  {config.yearLabel}
                </h3>
                <p className="text-sm text-gray-500">
                  Academic year starts in {monthOptions.find((option) => option.value === config.startMonth)?.label || config.startMonth} and ends in {monthOptions.find((option) => option.value === config.endMonth)?.label || config.endMonth}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Status: {config.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openModal(config)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(config._id)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
          {configs.length === 0 && (
            <div className="px-6 py-10 text-center text-gray-500">
              No academic year configurations found.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingConfig ? 'Edit Academic Year Configuration' : 'Create Academic Year Configuration'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year Label</label>
                <input
                  type="text"
                  value={formData.yearLabel}
                  onChange={(event) => setFormData((prev) => ({ ...prev, yearLabel: event.target.value }))}
                  placeholder="e.g. 2025-26"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Month</label>
                  <select
                    value={formData.startMonth}
                    onChange={(event) => setFormData((prev) => ({ ...prev, startMonth: Number(event.target.value) }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                  >
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Month</label>
                  <select
                    value={formData.endMonth}
                    onChange={(event) => setFormData((prev) => ({ ...prev, endMonth: Number(event.target.value) }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                  >
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Active configuration
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
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

export default AcademicYearConfig;
