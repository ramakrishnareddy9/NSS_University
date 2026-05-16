import React, { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import AIWritingAssistant from '../AIWritingAssistant';
import { DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ContributionForm = ({ participation, onClose, onSuccess }) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();
  const [evidence, setEvidence] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const reportValue = watch('report', '');

  const handleFileUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Don't set Content-Type header - let browser set it with boundary
      const response = await api.post('/upload', formData);

      // Handle both Cloudinary URLs and local file URLs
      let fileUrl = response.data.url;
      if (fileUrl.startsWith('/uploads/')) {
        // Local file - prepend API base URL
        fileUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${fileUrl}`;
      }

      const newEvidence = {
        type: file.type.startsWith('image/') ? 'photo' : 'document',
        url: fileUrl,
        publicId: response.data.publicId,
        description: ''
      };

      setEvidence([...evidence, newEvidence]);
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const removeEvidence = (index) => {
    const item = evidence[index];
    if (item.publicId) {
      api.delete(`/upload/${item.publicId}`).catch(console.error);
    }
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    if (evidence.length === 0) {
      toast.error('Please upload at least one piece of evidence');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/contributions', {
        participationId: participation._id,
        report: data.report,
        volunteerHours: parseFloat(data.volunteerHours),
        evidence: evidence
      });
      toast.success('Contribution submitted successfully');
      onSuccess();
      onClose();
    } catch (error) {
      // Better error handling to show validation errors
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => err.msg).join(', ');
        toast.error(`Validation Error: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit contribution');
      }
      console.error('Submit contribution error:', error.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Submit Contribution Report</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event: {participation.event?.title}
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Report *
              </label>
              <AIWritingAssistant
                onInsert={(content) => setValue('report', content)}
                eventContext={{
                  eventTitle: participation.event?.title,
                  eventType: participation.event?.eventType || 'Contribution'
                }}
                reportType="contribution"
                currentText={reportValue}
              />
            </div>
            <textarea
              {...register('report', { required: 'Report is required' })}
              rows={6}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Describe your participation, what you learned, and your contribution..."
            />
            {errors.report && <p className="text-red-500 text-xs mt-1">{errors.report.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Volunteer Hours *
            </label>
            <input
              {...register('volunteerHours', { 
                required: 'Volunteer hours are required',
                min: { value: 0.5, message: 'Must be at least 0.5 hours' },
                max: { value: 24, message: 'Cannot exceed 24 hours per day' }
              })}
              type="number"
              step="0.5"
              min="0.5"
              max="24"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            {errors.volunteerHours && <p className="text-red-500 text-xs mt-1">{errors.volunteerHours.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence (Photos, Documents, etc.) *
            </label>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}

            <div className="mt-4 grid grid-cols-2 gap-4">
              {evidence.map((item, index) => (
                <div key={index} className="relative border rounded-md p-2">
                  {item.type === 'photo' ? (
                    <img src={item.url} alt="Evidence" className="w-full h-32 object-cover rounded" />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                      <DocumentArrowUpIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeEvidence(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {evidence.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">Upload at least one file as evidence</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading || evidence.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContributionForm;

