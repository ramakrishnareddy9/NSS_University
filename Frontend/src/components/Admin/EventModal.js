import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

const EventModal = ({ event, onClose }) => {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setValue('title', event.title);
      setValue('description', event.description);
      setValue('eventType', event.eventType);
      setValue('location', event.location);
      setValue('startDate', new Date(event.startDate).toISOString().slice(0, 16));
      setValue('endDate', new Date(event.endDate).toISOString().slice(0, 16));
      setValue('registrationDeadline', new Date(event.registrationDeadline).toISOString().slice(0, 16));
      setValue('maxParticipants', event.maxParticipants || '');
      setValue('requirements', event.requirements?.join(', ') || '');
    }
  }, [event, setValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const eventData = {
        ...data,
        requirements: data.requirements ? data.requirements.split(',').map(r => r.trim()) : [],
        maxParticipants: data.maxParticipants ? parseInt(data.maxParticipants) : null
      };

      if (event) {
        await api.put(`/events/${event._id}`, eventData);
        toast.success('Event updated successfully');
      } else {
        await api.post('/events', eventData);
        toast.success('Event created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const downloadODList = async () => {
    if (!event) {
      toast.error('Event must be saved first before generating OD list');
      return;
    }

    try {
      const response = await api.get(`/od-list/event/${event._id}/download`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `OD_List_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('OD list downloaded successfully');
    } catch (error) {
      toast.error('Failed to download OD list');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {event ? 'Edit Event' : 'Create New Event'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              {...register('title', { required: 'Title is required' })}
              type="text"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Type</label>
              <select
                {...register('eventType', { required: 'Event type is required' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select type</option>
                <option value="tree plantation">Tree Plantation</option>
                <option value="blood donation">Blood Donation</option>
                <option value="cleanliness drive">Cleanliness Drive</option>
                <option value="awareness campaign">Awareness Campaign</option>
                <option value="health camp">Health Camp</option>
                <option value="other">Other</option>
              </select>
              {errors.eventType && <p className="text-red-500 text-xs mt-1">{errors.eventType.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input
                {...register('location', { required: 'Location is required' })}
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date & Time</label>
              <input
                {...register('startDate', { required: 'Start date is required' })}
                type="datetime-local"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End Date & Time</label>
              <input
                {...register('endDate', { required: 'End date is required' })}
                type="datetime-local"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Deadline</label>
            <input
              {...register('registrationDeadline', { required: 'Registration deadline is required' })}
              type="datetime-local"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            {errors.registrationDeadline && <p className="text-red-500 text-xs mt-1">{errors.registrationDeadline.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Participants (leave empty for unlimited)</label>
            <input
              {...register('maxParticipants')}
              type="number"
              min="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Requirements (comma-separated)</label>
            <input
              {...register('requirements')}
              type="text"
              placeholder="e.g., Comfortable shoes, Water bottle"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            {event && (
              <button
                type="button"
                onClick={downloadODList}
                className="px-4 py-2 border border-green-600 rounded-md shadow-sm text-sm font-medium text-green-600 bg-white hover:bg-green-50 flex items-center"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Download OD List
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : event ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;

