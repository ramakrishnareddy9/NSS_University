import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  DocumentTextIcon,
  FunnelIcon,
  DocumentChartBarIcon,
  CloudArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

const AIReports = () => {
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [cloudinaryLink, setCloudinaryLink] = useState(null);
  const [eventSummaryText, setEventSummaryText] = useState(null);
  const [eventSummaryLoading, setEventSummaryLoading] = useState(false);
  const [eventSummaryPdfLoading, setEventSummaryPdfLoading] = useState(false);
  const [eventSummaryCloudLink, setEventSummaryCloudLink] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [consolidatedReport, setConsolidatedReport] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  
  const extractErrorMessage = async (error, fallbackMessage) => {
    if (!error?.response) {
      return fallbackMessage;
    }

    const { data } = error.response;

    if (!data) {
      return error.response?.data?.message || fallbackMessage;
    }

    try {
      if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        return parsed.message || fallbackMessage;
      }

      if (data instanceof Blob) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        return parsed.message || fallbackMessage;
      }

      if (typeof data === 'object' && data.message) {
        return data.message;
      }
    } catch (parseError) {
      console.error('Failed to parse error response', parseError);
    }

    return fallbackMessage;
  };

  const [filters, setFilters] = useState({
    eventId: '',
    academicYear: new Date().getFullYear().toString(),
    status: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

useEffect(() => {
  if (!filters.eventId) {
    setEventSummaryCloudLink(null);
    setEventSummaryText(null);
    return;
  }
  const selectedEvent = events.find(event => event._id === filters.eventId);
  setEventSummaryCloudLink(selectedEvent?.summaryReport?.url || null);
  setEventSummaryText(selectedEvent?.summaryReport?.summaryText || null);
}, [filters.eventId, events]);

useEffect(() => {
  const params = new URLSearchParams(location.search);
  const queryEventId = params.get('eventId');
  if (queryEventId) {
    setFilters(prev => ({ ...prev, eventId: queryEventId }));
  }
}, [location.search]);

  const fetchInitialData = async () => {
    try {
      const [reportsRes, eventsRes] = await Promise.all([
        api.get('/reports/admin/all'),
        api.get('/events')
      ]);
      setReports(reportsRes.data);
      setEvents(eventsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.eventId) params.append('eventId', filters.eventId);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/reports/admin/all?${params}`);
      setReports(response.data);
    } catch (error) {
      console.error('Fetch reports error:', error);
    }
  };

  const handleGenerateNAAC = async () => {
    if (!filters.academicYear) {
      toast.error('Please select an academic year');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post('/reports/admin/generate-naac', {
        academicYear: filters.academicYear
      });
      setConsolidatedReport(response.data.report);
      setCloudinaryLink(null);
      toast.success('NAAC report generated successfully!');
    } catch (error) {
      const message = await extractErrorMessage(error, 'Failed to generate NAAC report');
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateUGC = async () => {
    if (!filters.academicYear) {
      toast.error('Please select an academic year');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post('/reports/admin/generate-ugc', {
        academicYear: filters.academicYear
      });
      setConsolidatedReport(response.data.report);
      setCloudinaryLink(null);
      toast.success('UGC report generated successfully!');
    } catch (error) {
      const message = await extractErrorMessage(error, 'Failed to generate UGC report');
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const fetchEventSummaryText = async ({ silent = false } = {}) => {
    try {
      const response = await api.post(`/reports/admin/event-summary/${filters.eventId}`);
      setEventSummaryText(response.data.summary);
      setEvents(prevEvents => prevEvents.map(event => (
        event._id === filters.eventId
          ? {
              ...event,
              summaryReport: {
                ...(event.summaryReport || {}),
                summaryText: response.data.summary
              }
            }
          : event
      )));
      if (!silent) {
        toast.success('Event summary generated');
      }
      return response.data.summary;
    } catch (error) {
      const message = await extractErrorMessage(error, 'Failed to generate event summary');
      if (!silent) {
        toast.error(message);
      }
      throw error;
    }
  };

  const handleGenerateEventSummaryText = async () => {
    if (!filters.eventId) {
      toast.error('Please select an event using the filter above');
      return;
    }

    setEventSummaryLoading(true);
    try {
      await fetchEventSummaryText({ silent: true });
      toast.success('Event summary ready');
    } catch (error) {
      // error toast handled inside
    } finally {
      setEventSummaryLoading(false);
    }
  };

  const handleGenerateEventSummaryPdf = async () => {
    if (!filters.eventId) {
      toast.error('Please select an event using the filter above');
      return;
    }

    try {
      if (!eventSummaryText) {
        await fetchEventSummaryText({ silent: true });
      }
    } catch (error) {
      return;
    }

    setEventSummaryPdfLoading(true);
    try {
      const response = await api.post(
        `/reports/admin/event-summary/${filters.eventId}/pdf`,
        {},
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const selectedEvent = events.find(event => event._id === filters.eventId);
      const safeTitle = selectedEvent?.title
        ? selectedEvent.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
        : 'event-summary';
      anchor.href = url;
      anchor.download = `${safeTitle}-summary.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);

      const cloudUrl = response.headers['x-cloudinary-url'];
      if (cloudUrl) {
        setEventSummaryCloudLink(cloudUrl);
        setEvents(prevEvents => prevEvents.map(event => (
          event._id === filters.eventId
            ? {
                ...event,
                summaryReport: {
                  ...(event.summaryReport || {}),
                  url: cloudUrl,
                  generatedAt: new Date().toISOString(),
                  reportType: 'event',
                  summaryText: eventSummaryText || event.summaryReport?.summaryText
                }
              }
            : event
        )));
      }

      toast.success('Event summary PDF generated successfully');
    } catch (error) {
      const message = await extractErrorMessage(error, 'Failed to generate event summary PDF');
      toast.error(message);
    } finally {
      setEventSummaryPdfLoading(false);
    }
  };

  const handleReviewReport = async (reportId, status, notes) => {
    try {
      await api.put(`/reports/admin/review/${reportId}`, {
        status,
        reviewNotes: notes
      });
      toast.success(`Report ${status} successfully`);
      fetchReports();
      setSelectedReport(null);
    } catch (error) {
      toast.error('Failed to update report');
    }
  };

  const downloadReport = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadFileAttachment = async (file) => {
    try {
      toast.loading('Downloading file...', { id: 'file-download' });
      
      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from URL or use provided filename
      let filename = file.fileName;
      if (!filename) {
        const urlParts = file.url.split('/');
        filename = urlParts[urlParts.length - 1].split('?')[0] || `download-${Date.now()}`;
      }
      
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      toast.success('File downloaded successfully', { id: 'file-download' });
    } catch (error) {
      console.error('File download error:', error);
      toast.error('Failed to download file. Opening in new tab...', { id: 'file-download' });
      // Fallback: open in new tab if download flow fails
      window.open(file.url, '_blank', 'noopener,noreferrer');
    }
  };

  const viewFileAttachment = (file) => {
    // Direct viewing approach based on file type
    let viewableFile = { ...file };

    if (file.url) {
      const lowerUrl = file.url.toLowerCase();
      const fileType = file.fileType?.toLowerCase() || '';
      
      // Fix Cloudinary URLs that have /image/upload/ for PDFs (wrong resource type)
      let fixedUrl = file.url;
      if ((lowerUrl.includes('.pdf') || fileType.includes('pdf')) && lowerUrl.includes('/image/upload/')) {
        // Convert /image/upload/ to /raw/upload/ for PDFs
        fixedUrl = file.url.replace('/image/upload/', '/raw/upload/');
        console.log('Fixed PDF URL:', fixedUrl);
      }
      
      // For PDFs, use direct Cloudinary URL - browsers can render PDFs natively
      if (lowerUrl.includes('.pdf') || fileType.includes('pdf')) {
        viewableFile.viewUrl = fixedUrl;
        viewableFile.url = fixedUrl; // Update the url for download too
        viewableFile.canPreview = true;
      }
      // For images, use direct URL
      else if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || fileType.includes('image')) {
        viewableFile.viewUrl = fixedUrl;
        viewableFile.canPreview = true;
      }
      // For Office docs (DOCX, XLSX, PPTX), use Google Docs Viewer as fallback
      else if (lowerUrl.match(/\.(docx?|xlsx?|pptx?)$/i) || fileType.includes('wordprocessingml') || fileType.includes('spreadsheetml') || fileType.includes('presentationml')) {
        viewableFile.viewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fixedUrl)}&embedded=true`;
        viewableFile.canPreview = true;
      }
      // For other file types, don't preview - just download
      else {
        viewableFile.viewUrl = null;
        viewableFile.canPreview = false;
      }
    } else {
      viewableFile.viewUrl = null;
      viewableFile.canPreview = false;
    }

    // If can't preview, just download
    if (!viewableFile.canPreview) {
      downloadFileAttachment(file);
      return;
    }

    setPreviewFile(viewableFile);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const downloadConsolidatedPdf = async () => {
    if (!consolidatedReport) {
      toast.error('Generate a report first');
      return;
    }

    setDownloadingPdf(true);
    try {
      const response = await api.post(
        '/reports/admin/consolidated-pdf',
        {
          academicYear: consolidatedReport.academicYear,
          reportType: consolidatedReport.reportType,
          content: consolidatedReport.content,
          statistics: consolidatedReport.statistics,
          totals: {
            events: consolidatedReport.totalEvents,
            reports: consolidatedReport.totalReports,
            students: consolidatedReport.totalStudents,
            generatedAt: consolidatedReport.generatedAt
          }
        },
        {
          responseType: 'blob'
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${consolidatedReport.reportType.toLowerCase()}-report-${consolidatedReport.academicYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const cloudUrl = response.headers['x-cloudinary-url'];
      if (cloudUrl) {
        setCloudinaryLink(cloudUrl);
      }

      toast.success('Consolidated PDF downloaded successfully');
    } catch (error) {
      const message = await extractErrorMessage(error, 'Failed to download consolidated PDF');
      toast.error(message);
    } finally {
      setDownloadingPdf(false);
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SparklesIcon className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">AI-Powered Reports</h1>
        </div>
        <p className="text-gray-600">Manage student reports and generate NAAC/UGC reports with AI</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.academicYear}
            onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Years</option>
            <option value="2024">2024-2025</option>
            <option value="2023">2023-2024</option>
            <option value="2022">2022-2023</option>
          </select>

          <select
            value={filters.eventId}
            onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Events</option>
            {events.map(event => (
              <option key={event._id} value={event._id}>{event.title}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={() => setFilters({ eventId: '', academicYear: new Date().getFullYear().toString(), status: '' })}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* AI Report Generation */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <DocumentChartBarIcon className="h-6 w-6 text-purple-600" />
          <h2 className="text-lg font-bold text-gray-900">Generate Consolidated Reports</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Use Gemini AI to analyze all student reports and generate comprehensive NAAC/UGC reports for the selected academic year
        </p>
        <div className="flex gap-4">
          <button
            onClick={handleGenerateNAAC}
            disabled={generating || !filters.academicYear}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <AcademicCapIcon className="h-5 w-5" />
                Generate NAAC Report
              </>
            )}
          </button>
          <button
            onClick={handleGenerateUGC}
            disabled={generating || !filters.academicYear}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <DocumentChartBarIcon className="h-5 w-5" />
                Generate UGC Report
              </>
            )}
          </button>
        </div>
        {filters.academicYear && (
          <p className="text-xs text-gray-600 mt-2">
            Selected Academic Year: {filters.academicYear}-{parseInt(filters.academicYear) + 1}
          </p>
        )}

        <div className="mt-6 border-t border-purple-100 pt-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Generate Event Summary</h3>
              <p className="text-xs text-gray-600">Select an event above to analyze all submitted student reports and produce an AI-written summary.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGenerateEventSummaryText}
              disabled={eventSummaryLoading || !filters.eventId}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {eventSummaryLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" />
                  Generate Summary
                </>
              )}
            </button>
            <div>
              <button
                onClick={handleGenerateEventSummaryPdf}
                disabled={eventSummaryPdfLoading || !filters.eventId}
                className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {eventSummaryPdfLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Preparing PDF...
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="h-5 w-5" />
                    Download Summary PDF
                  </>
                )}
              </button>
            </div>
          </div>
          {eventSummaryText && (
            <div className="mt-4 bg-white border border-purple-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">AI Summary</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{eventSummaryText}</p>
            </div>
          )}
          {eventSummaryCloudLink && (
            <div className="mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              Latest summary stored in cloud:{' '}
              <a
                href={eventSummaryCloudLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View PDF
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Consolidated Report View */}
      {consolidatedReport && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {consolidatedReport.reportType} Report - {consolidatedReport.academicYear}
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => downloadReport(
                  consolidatedReport.content,
                  `${consolidatedReport.reportType}_Report_${consolidatedReport.academicYear}.txt`
                )}
                className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
              >
                <CloudArrowDownIcon className="h-5 w-5" />
                Download Text
              </button>
              <button
                onClick={downloadConsolidatedPdf}
                disabled={downloadingPdf}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {downloadingPdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Preparing PDF...
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="h-5 w-5" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{consolidatedReport.totalEvents}</p>
                <p className="text-sm text-gray-600">Events</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{consolidatedReport.totalReports}</p>
                <p className="text-sm text-gray-600">Reports</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{consolidatedReport.totalStudents}</p>
                <p className="text-sm text-gray-600">Students</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {new Date(consolidatedReport.generatedAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">Generated</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {consolidatedReport.content}
            </pre>
          </div>

          {cloudinaryLink && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              PDF stored in cloud: <a href={cloudinaryLink} target="_blank" rel="noopener noreferrer" className="underline">View in Cloudinary</a>
            </div>
          )}
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Student Reports ({reports.length})</h2>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No reports found for the selected filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report._id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{report.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {report.student?.name || 'Unknown Student'} • {report.event?.title || 'Event Deleted'}
                    </p>
                    {report.aiSummary && (
                      <div className="bg-purple-50 rounded p-2 mb-2">
                        <p className="text-xs text-gray-700 line-clamp-2">
                          <SparklesIcon className="h-3 w-3 inline mr-1 text-purple-600" />
                          {report.aiSummary}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      <span>Academic Year: {report.academicYear}</span>
                      {report.files && report.files.length > 0 && (
                        <span>{report.files.length} file(s)</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    report.status === 'approved' ? 'bg-green-100 text-green-800' :
                    report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">File Preview</h2>
                <p className="text-sm text-gray-600">{previewFile.fileName}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadFileAttachment(previewFile)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <CloudArrowDownIcon className="h-5 w-5" />
                  Download
                </button>
                <button
                  onClick={closePreview}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <iframe
                src={previewFile.viewUrl || previewFile.url}
                className="w-full h-full border-0 rounded"
                title="File Preview"
                onError={() => {
                  console.error('Preview failed for:', previewFile.url);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{selectedReport.title}</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Student & Event Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Student</h3>
                  <p className="text-sm">{selectedReport.student?.name || 'Unknown Student'}</p>
                  <p className="text-xs text-gray-600">{selectedReport.student?.email || 'N/A'}</p>
                  {selectedReport.student?.studentId && (
                    <p className="text-xs text-gray-600">ID: {selectedReport.student.studentId}</p>
                  )}
                </div>
                {selectedReport.event ? (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Event</h3>
                    <p className="text-sm">{selectedReport.event.title}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(selectedReport.event.startDate).toLocaleDateString()} - {new Date(selectedReport.event.endDate).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h3 className="font-semibold mb-2">Event</h3>
                    <p className="text-sm text-yellow-800">⚠️ Event Deleted</p>
                    <p className="text-xs text-gray-600">The associated event has been removed</p>
                  </div>
                )}
              </div>

              {/* AI Analysis */}
              {selectedReport.aiAnalysis && (
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <SparklesIcon className="h-6 w-6 text-purple-600" />
                    <h3 className="text-lg font-bold">AI Analysis</h3>
                  </div>
                  {selectedReport.aiSummary && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Summary</h4>
                      <p className="text-gray-700">{selectedReport.aiSummary}</p>
                    </div>
                  )}
                  {selectedReport.aiAnalysis.keyPoints?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Key Points</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedReport.aiAnalysis.keyPoints.map((point, idx) => (
                          <li key={idx} className="text-gray-700">{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2">Full Report</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedReport.description}</p>
                </div>
              </div>

              {/* Files */}
              {selectedReport.files?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Attached Files</h3>
                  <div className="space-y-2">
                    {selectedReport.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg hover:bg-gray-100"
                      >
                        <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                        <span className="flex-1 text-sm">
                          {file.fileName || `Attachment ${idx + 1}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => viewFileAttachment(file)}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadFileAttachment(file)}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
                        >
                          <CloudArrowDownIcon className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Actions */}
              {selectedReport.status !== 'approved' && selectedReport.status !== 'rejected' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReviewReport(selectedReport._id, 'approved', 'Report approved by admin')}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReviewReport(selectedReport._id, 'rejected', 'Report needs revision')}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <XCircleIcon className="h-5 w-5" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIReports;
