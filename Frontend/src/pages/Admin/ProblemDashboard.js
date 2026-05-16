import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-toastify';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const ProblemDashboard = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Approval form data
  const [approvalData, setApprovalData] = useState({
    eventDate: '',
    eventTime: '09:00',
    additionalDetails: ''
  });

  // Rejection form data
  const [rejectionData, setRejectionData] = useState({
    feedback: ''
  });

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/problems', {
        params: filter !== 'all' ? { status: filter } : {}
      });
      setProblems(response.data.data);
    } catch (error) {
      console.error('Error fetching problems:', error);
      toast.error('Failed to load problems');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const handleApprove = async () => {
    if (!approvalData.eventDate) {
      toast.error('Please select an event date');
      return;
    }

    setActionLoading(true);
    try {
      const response = await api.put(`/problems/${selectedProblem._id}/approve`, approvalData);
      
      toast.success(`Problem approved! ${response.data.data.pointsAwarded} points awarded to reporter.`);
      
      // Refresh list
      fetchProblems();
      setShowApproveModal(false);
      setSelectedProblem(null);
      setApprovalData({ eventDate: '', eventTime: '09:00', additionalDetails: '' });
    } catch (error) {
      console.error('Error approving problem:', error);
      toast.error(error.response?.data?.message || 'Failed to approve problem');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionData.feedback.trim()) {
      toast.error('Please provide feedback for rejection');
      return;
    }

    setActionLoading(true);
    try {
      await api.put(`/problems/${selectedProblem._id}/reject`, rejectionData);
      
      toast.success('Problem rejected. Feedback sent to reporter.');
      
      // Refresh list
      fetchProblems();
      setShowRejectModal(false);
      setSelectedProblem(null);
      setRejectionData({ feedback: '' });
    } catch (error) {
      console.error('Error rejecting problem:', error);
      toast.error(error.response?.data?.message || 'Failed to reject problem');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (problemId) => {
    if (!window.confirm('Mark this problem as resolved?')) return;

    try {
      await api.put(`/problems/${problemId}/resolve`);
      toast.success('Problem marked as resolved');
      fetchProblems();
    } catch (error) {
      console.error('Error resolving problem:', error);
      toast.error('Failed to resolve problem');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: ClockIcon, text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      approved: { icon: CheckCircleIcon, text: 'Approved', color: 'bg-green-100 text-green-800' },
      rejected: { icon: XCircleIcon, text: 'Rejected', color: 'bg-red-100 text-red-800' },
      resolved: { icon: CheckCircleIcon, text: 'Resolved', color: 'bg-blue-100 text-blue-800' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.text}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${colors[severity]}`}>
        {severity}
      </span>
    );
  };

  const stats = {
    total: problems.length,
    pending: problems.filter(p => p.status === 'pending').length,
    approved: problems.filter(p => p.status === 'approved').length,
    rejected: problems.filter(p => p.status === 'rejected').length,
    resolved: problems.filter(p => p.status === 'resolved').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Problem Reports Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Review and manage community problem reports submitted by students
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <ChartBarIcon className="w-5 h-5 text-gray-600" />
                <p className="text-sm text-gray-600">Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="w-5 h-5 text-yellow-700" />
                <p className="text-sm text-yellow-700">Pending</p>
              </div>
              <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircleIcon className="w-5 h-5 text-green-700" />
                <p className="text-sm text-green-700">Approved</p>
              </div>
              <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <XCircleIcon className="w-5 h-5 text-red-700" />
                <p className="text-sm text-red-700">Rejected</p>
              </div>
              <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircleIcon className="w-5 h-5 text-blue-700" />
                <p className="text-sm text-blue-700">Resolved</p>
              </div>
              <p className="text-2xl font-bold text-blue-800">{stats.resolved}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {['pending', 'approved', 'rejected', 'resolved', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="ml-2 text-sm">
                  ({status === 'all' ? stats.total : stats[status]})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Problems List */}
        {problems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Problems Found</h3>
            <p className="text-gray-600">
              {filter === 'pending'
                ? 'No pending problems to review.'
                : `No ${filter} problems found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {problems.map((problem) => (
              <div
                key={problem._id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Images */}
                    {problem.images && problem.images.length > 0 && (
                      <div className="lg:w-64 flex-shrink-0">
                        <div className="grid grid-cols-2 gap-2">
                          {problem.images.slice(0, 4).map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Problem ${idx + 1}`}
                              className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(img, '_blank')}
                            />
                          ))}
                        </div>
                        {problem.images.length > 4 && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            +{problem.images.length - 4} more images
                          </p>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {problem.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusBadge(problem.status)}
                            {getSeverityBadge(problem.severity)}
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              {problem.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-700 mb-4 whitespace-pre-line">
                        {problem.description}
                      </p>

                      {/* Meta Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <UserIcon className="w-4 h-4" />
                          <span>
                            <strong>Reported by:</strong> {problem.reportedBy?.name} ({problem.reportedBy?.studentId})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <CalendarIcon className="w-4 h-4" />
                          <span>
                            <strong>Date:</strong> {new Date(problem.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPinIcon className="w-4 h-4" />
                          <span>
                            <strong>Location:</strong> {problem.location.address}
                          </span>
                        </div>
                        {problem.reviewedBy && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <UserIcon className="w-4 h-4" />
                            <span>
                              <strong>Reviewed by:</strong> {problem.reviewedBy.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Admin Feedback (if rejected) */}
                      {problem.adminFeedback && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                          <p className="text-sm font-semibold text-red-900 mb-1">
                            Rejection Feedback:
                          </p>
                          <p className="text-sm text-red-700">{problem.adminFeedback}</p>
                        </div>
                      )}

                      {/* Event Link (if approved) */}
                      {problem.eventId && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                          <p className="text-sm font-semibold text-green-900 mb-2">
                            ✅ Event Created
                          </p>
                          <button
                            onClick={() => navigate(`/admin/events/${problem.eventId._id}`)}
                            className="text-sm text-green-700 hover:text-green-800 font-medium underline"
                          >
                            View Event: {problem.eventId.title}
                          </button>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        {problem.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedProblem(problem);
                                setShowApproveModal(true);
                              }}
                              className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProblem(problem);
                                setShowRejectModal(true);
                              }}
                              className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                              <XCircleIcon className="w-5 h-5" />
                              Reject
                            </button>
                          </>
                        )}
                        {problem.status === 'approved' && (
                          <button
                            onClick={() => handleResolve(problem._id)}
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Mark as Resolved
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/admin/problems/${problem._id}`)}
                          className="px-6 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          View Full Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedProblem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">Approve Problem Report</h2>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">{selectedProblem.title}</h3>
                <p className="text-sm text-gray-600">{selectedProblem.description}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={approvalData.eventDate}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, eventDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Time
                  </label>
                  <input
                    type="time"
                    value={approvalData.eventTime}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, eventTime: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Event Details (Optional)
                  </label>
                  <textarea
                    value={approvalData.additionalDetails}
                    onChange={(e) => setApprovalData(prev => ({ ...prev, additionalDetails: e.target.value }))}
                    placeholder="Add any additional instructions or requirements for volunteers..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <p className="text-sm text-blue-700">
                    <strong>What happens next:</strong>
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>Reporter will receive +10 points (+ severity bonus)</li>
                      <li>An event will be created automatically</li>
                      <li>All students will be notified via email</li>
                      <li>Problem will become publicly visible</li>
                    </ul>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedProblem(null);
                    setApprovalData({ eventDate: '', eventTime: '09:00', additionalDetails: '' });
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Approving...' : 'Approve & Create Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedProblem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <XCircleIcon className="w-8 h-8 text-red-600" />
                <h2 className="text-2xl font-bold text-gray-900">Reject Problem Report</h2>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">{selectedProblem.title}</h3>
                <p className="text-sm text-gray-600">{selectedProblem.description}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback for Reporter <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionData.feedback}
                    onChange={(e) => setRejectionData({ feedback: e.target.value })}
                    placeholder="Explain why this problem cannot be approved. Be constructive and helpful..."
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <p className="text-sm text-yellow-700">
                    <strong>Note:</strong> The reporter will receive an email with your feedback. Please be respectful and provide constructive guidance.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedProblem(null);
                    setRejectionData({ feedback: '' });
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Problem'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemDashboard;
