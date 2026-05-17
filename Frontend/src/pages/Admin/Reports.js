import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { DocumentArrowDownIcon, DocumentTextIcon, SparklesIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

const AdminReports = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [showNaacPreview, setShowNaacPreview] = useState(false);
  const [naacPreview, setNaacPreview] = useState(null);
  const [editedNaacContent, setEditedNaacContent] = useState('');
  const [naacLoading, setNaacLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await api.get('/events');
        setEvents(response.data || []);
      } catch (error) {
        console.error('Failed to load events for AI reports', error);
        toast.error('Failed to load events list');
      }
    };

    loadEvents();
  }, []);

  const downloadAnnualSummary = async (format) => {
    try {
      const response = await api.get(`/reports/annual-summary?year=${year}&format=${format}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'excel' ? 'xlsx' : 'pdf';
      link.setAttribute('download', `nss-annual-summary-${year}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Annual summary downloaded (${format.toUpperCase()})`);
    } catch (error) {
      toast.error('Failed to download annual summary');
    }
  };

  const generateNaacPreview = async () => {
    try {
      setNaacLoading(true);
      const response = await api.post('/reports/admin/generate-naac-preview', {
        academicYear: academicYear
      });
      
      setNaacPreview(response.data.preview);
      setEditedNaacContent(response.data.preview.content);
      setShowNaacPreview(true);
      toast.success('NAAC preview generated successfully');
    } catch (error) {
      console.error('Failed to generate NAAC preview:', error);
      toast.error(error.response?.data?.message || 'Failed to generate NAAC preview');
    } finally {
      setNaacLoading(false);
    }
  };

  const saveNaacDraft = async () => {
    try {
      setNaacLoading(true);
      await api.put('/reports/admin/save-naac-draft', {
        academicYear: academicYear,
        editedContent: editedNaacContent
      });
      
      toast.success('NAAC draft saved successfully');
    } catch (error) {
      console.error('Failed to save NAAC draft:', error);
      toast.error(error.response?.data?.message || 'Failed to save NAAC draft');
    } finally {
      setNaacLoading(false);
    }
  };

  const generateNaacPdf = async (useEdited = false) => {
    try {
      setNaacLoading(true);
      const response = await api.post('/reports/admin/generate-naac-pdf', {
        academicYear: academicYear,
        useEditedContent: useEdited
      });
      
      // Open PDF in new window or trigger download
      if (response.data.pdfUrl) {
        const link = document.createElement('a');
        link.href = response.data.pdfUrl;
        link.setAttribute('download', `naac-report-${academicYear}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      
      setShowNaacPreview(false);
      toast.success('NAAC PDF generated and downloaded successfully');
    } catch (error) {
      console.error('Failed to generate NAAC PDF:', error);
      toast.error(error.response?.data?.message || 'Failed to generate NAAC PDF');
    } finally {
      setNaacLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Certificates</h1>
        <p className="mt-2 text-gray-600">Generate and download reports and certificates</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Annual Summary</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => downloadAnnualSummary('pdf')}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Download PDF
            </button>
            <button
              onClick={() => downloadAnnualSummary('excel')}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Download Excel
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Info</h2>
          <p className="text-gray-600 mb-4">
            Generate comprehensive annual summaries including:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Total events and participants</li>
            <li>Volunteer hours statistics</li>
            <li>Events by type breakdown</li>
            <li>Top volunteers list</li>
            <li>Student participation details</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="h-6 w-6 text-purple-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">NAAC Criterion 5.3 Report Generator</h2>
            <p className="text-sm text-gray-600">
              Generate AI-powered NAAC compliance reports with Criterion 5.3 focus. Preview, edit, and download PDF reports.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2024-2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={generateNaacPreview}
              disabled={naacLoading}
              className="w-full inline-flex justify-center items-center px-4 py-3 bg-purple-600 text-white text-sm font-semibold rounded-md shadow hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              {naacLoading ? 'Generating...' : 'Generate Preview'}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-600">
          Generate a NAAC Criterion 5.3 compliant report. You can preview, edit the content, and download as PDF.
        </p>
      </div>

      <div className="mt-6 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="h-6 w-6 text-purple-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI-Powered Student Reports</h2>
            <p className="text-sm text-gray-600">
              Analyze student submissions, generate event summaries, and create NAAC/UGC-ready reports with AI assistance.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Optional: Jump to a specific event
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All events</option>
              {events.map((event) => (
                <option key={event._id} value={event._id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => navigate(selectedEvent ? `/admin/ai-reports?eventId=${selectedEvent}` : '/admin/ai-reports')}
              className="w-full inline-flex justify-center items-center px-4 py-3 bg-purple-600 text-white text-sm font-semibold rounded-md shadow hover:bg-purple-700"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              Open AI Reports Dashboard
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-600">
          Tip: You can still change filters, generate summaries, and download consolidated PDFs inside the AI Reports dashboard.
        </p>
      </div>

      {/* NAAC Preview/Editor Modal */}
      {showNaacPreview && naacPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">NAAC Report Preview & Editor</h3>
              <button
                onClick={() => setShowNaacPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Report Statistics:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Events:</span>
                    <span className="font-semibold ml-2">{naacPreview.totalEvents}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Reports:</span>
                    <span className="font-semibold ml-2">{naacPreview.totalReports}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Students:</span>
                    <span className="font-semibold ml-2">{naacPreview.totalStudents}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Generated:</span>
                    <span className="font-semibold ml-2">{new Date(naacPreview.generatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Edit Report Content:
                </label>
                <textarea
                  value={editedNaacContent}
                  onChange={(e) => setEditedNaacContent(e.target.value)}
                  className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Edit the NAAC report content here..."
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900">
                <p>
                  <strong>Tip:</strong> You can edit the content above. Make any necessary changes before downloading the PDF.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowNaacPreview(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium"
              >
                <XMarkIcon className="h-5 w-5 inline mr-2" />
                Cancel
              </button>
              <button
                onClick={saveNaacDraft}
                disabled={naacLoading}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Save Draft
              </button>
              <button
                onClick={() => generateNaacPdf(true)}
                disabled={naacLoading}
                className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <CheckIcon className="h-5 w-5 inline mr-2" />
                {naacLoading ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;

