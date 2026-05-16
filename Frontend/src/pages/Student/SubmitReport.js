import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import AIWritingAssistant from '../../components/AIWritingAssistant';
import ReportDesigner from '../../components/ReportDesigner';
import { jsPDF } from 'jspdf';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const SubmitReport = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [showReportDesigner, setShowReportDesigner] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    academicYear: new Date().getFullYear().toString()
  });

  useEffect(() => {
    fetchEvent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/events/${eventId}`);
      setEvent(response.data);
      setFormData(prev => ({
        ...prev,
        title: `${response.data.title} - Event Report`
      }));
    } catch (error) {
      toast.error('Failed to load event details');
      navigate('/student/events');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const canSubmitReport = ['attended', 'completed'].includes(event?.participationStatus);

  const handleReportPdfGenerated = (pdfFile) => {
    if (!pdfFile) return;

    if (files.length >= 5 && !files.some(file => file.name === pdfFile.name)) {
      toast.error('Maximum 5 files allowed. Remove a file before attaching the generated PDF.');
      return;
    }

    setFiles(prev => {
      const existingIndex = prev.findIndex(file => file.name === pdfFile.name);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = pdfFile;
        return updated;
      }
      return [...prev, pdfFile];
    });

    toast.success('Report PDF generated and attached successfully.');
  };

  const handleGeneratePdfFromForm = () => {
    if (!canSubmitReport) {
      toast.error('Attendance confirmation is required before generating the PDF.');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in the report title and description to generate the PDF.');
      return;
    }

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let cursorY = 20;

      doc.setFontSize(18);
      doc.text(formData.title, pageWidth / 2, cursorY, { align: 'center' });

      cursorY += 12;
      doc.setFontSize(12);
      const infoLines = [
        `Event: ${event?.title || 'NSS Event'}`,
        `Date: ${event ? `${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}` : 'N/A'}`,
        `Location: ${event?.location || 'N/A'}`,
        `Academic Year: ${formData.academicYear}`
      ];
      infoLines.forEach(line => {
        doc.text(line, 15, cursorY);
        cursorY += 6;
      });

      cursorY += 4;
      doc.setFontSize(14);
      doc.text('Report Description', 15, cursorY);
      cursorY += 8;

      doc.setFontSize(12);
      const textWidth = pageWidth - 30;
      const descriptionLines = doc.splitTextToSize(formData.description, textWidth);
      descriptionLines.forEach(line => {
        if (cursorY > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(line, 15, cursorY);
        cursorY += 6;
      });

      cursorY += 8;
      doc.setFontSize(12);
      doc.text('Generated via NSS Portal AI assist', 15, cursorY);

      const safeTitle = (formData.title || 'nss_report').replace(/[^a-z0-9_-]/gi, '_');
      const fileName = `${safeTitle}.pdf`;

      doc.save(fileName);

      const blob = doc.output('blob');
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
      handleReportPdfGenerated(pdfFile);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canSubmitReport) {
      toast.error('You can submit the report only after your attendance is marked as attended.');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('eventId', eventId);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('academicYear', formData.academicYear);
      
      files.forEach(file => {
        data.append('files', file);
      });

      await api.post('/reports/student/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Report submitted successfully! AI analysis in progress...');
      setTimeout(() => {
        navigate('/student/my-reports');
      }, 2000);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit report';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        {/* Header */}
        <div className="border-b pb-4 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Submit Event Report</h1>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <SparklesIcon className="h-5 w-5 text-purple-500" />
            <p className="text-sm text-gray-600">
              AI-powered analysis will be generated automatically
            </p>
          </div>
        </div>

        {/* Event Info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Date:</strong> {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}</p>
            <p><strong>Location:</strong> {event.location}</p>
            <p><strong>Type:</strong> {event.eventType}</p>
            {event.participationStatus && (
              <p><strong>Your Status:</strong> {event.participationStatus}</p>
            )}
          </div>
        </div>

        {!canSubmitReport && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
            <h3 className="font-semibold mb-1">Attendance Pending</h3>
            <p className="text-sm">You can submit the event report once the faculty marks your attendance as attended or completed.</p>
          </div>
        )}

        {canSubmitReport && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <select
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="2024">2024-2025</option>
                <option value="2023">2023-2024</option>
                <option value="2022">2022-2023</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Report Description *
                  <span className="text-xs text-gray-500 ml-2">(Include your experience, learnings, and impact)</span>
                </label>
                <AIWritingAssistant
                  onInsert={(content) => setFormData({ ...formData, description: content })}
                  eventContext={{
                    eventTitle: event?.title,
                    eventType: event?.eventType
                  }}
                  reportType="event"
                  currentText={formData.description}
                />
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="12"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your experience, what you learned, the impact of the event, and any recommendations..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 200 characters recommended for better AI analysis
              </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
              <button
                type="button"
                onClick={handleGeneratePdfFromForm}
                className="inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Download & Attach PDF
              </button>
              <p className="text-xs text-gray-500">
                Generates a PDF using the current report content and adds it to your upload list automatically.
              </p>
            </div>
            </div>

            {/* Report Designer */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Need a formatted PDF?</h3>
                  <p className="text-xs text-gray-600">Use the built-in designer to create a polished PDF and attach it automatically.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportDesigner(prev => !prev)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {showReportDesigner ? 'Hide Report Designer' : 'Open Report Designer'}
                </button>
              </div>

              {showReportDesigner && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <ReportDesigner
                    initialData={{
                      title: formData.title,
                      date: event?.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
                      venue: event?.location || '',
                      author: event?.organizer?.name || ''
                    }}
                    onPdfGenerated={handleReportPdfGenerated}
                  />
                </div>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Supporting Files (Optional)
                <span className="text-xs text-gray-500 ml-2">Max 5 files, 10MB each</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <label className="cursor-pointer">
                      <span className="mt-2 text-sm text-gray-600">
                        Click to upload or drag and drop
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Images, PDFs, Word documents
                  </p>
                </div>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg">
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SubmitReport;
