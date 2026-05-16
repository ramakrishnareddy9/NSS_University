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
  PlusIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

const MyProblemReports = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected, resolved

  const fetchMyReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/problems/my-reports');
      setProblems(response.data.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load your reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyReports();
  }, [fetchMyReports]);

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        icon: ClockIcon,
        text: 'Pending Review',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      },
      approved: {
        icon: CheckCircleIcon,
        text: 'Approved',
        color: 'bg-green-100 text-green-800 border-green-300'
      },
      rejected: {
        icon: XCircleIcon,
        text: 'Rejected',
        color: 'bg-red-100 text-red-800 border-red-300'
      },
      resolved: {
        icon: CheckCircleIcon,
        text: 'Resolved',
        color: 'bg-blue-100 text-blue-800 border-blue-300'
      }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
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
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[severity]}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const filteredProblems = problems.filter(problem => {
    if (filter === 'all') return true;
    return problem.status === filter;
  });

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <ExclamationTriangleIcon className="w-8 h-8 text-orange-600" />
                My Problem Reports
              </h1>
              <p className="text-gray-600 mt-2">
                Track your submitted problems and their approval status
              </p>
            </div>
            <button
              onClick={() => navigate('/student/report-problem')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Report New Problem
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{problems.length}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-700">Pending</p>
              <p className="text-2xl font-bold text-yellow-800">
                {problems.filter(p => p.status === 'pending').length}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-700">Approved</p>
              <p className="text-2xl font-bold text-green-800">
                {problems.filter(p => p.status === 'approved').length}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">Resolved</p>
              <p className="text-2xl font-bold text-blue-800">
                {problems.filter(p => p.status === 'resolved').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected', 'resolved'].map((status) => (
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
                {status !== 'all' && (
                  <span className="ml-2 text-sm">
                    ({problems.filter(p => p.status === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Problems List */}
        {filteredProblems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? "You haven't reported any problems yet."
                : `You don't have any ${filter} reports.`}
            </p>
            <button
              onClick={() => navigate('/student/report-problem')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Report Your First Problem
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProblems.map((problem) => (
              <div
                key={problem._id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image */}
                    {problem.images && problem.images.length > 0 && (
                      <div className="lg:w-48 flex-shrink-0">
                        <img
                          src={problem.images[0]}
                          alt={problem.title}
                          className="w-full h-32 lg:h-full object-cover rounded-lg"
                        />
                        {problem.images.length > 1 && (
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            +{problem.images.length - 1} more
                          </p>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {problem.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusBadge(problem.status)}
                            {getSeverityBadge(problem.severity)}
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                              {problem.category}
                            </span>
                          </div>
                        </div>
                        {problem.pointsAwarded > 0 && (
                          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg px-4 py-2">
                            <div className="flex items-center gap-2">
                              <TrophyIcon className="w-5 h-5 text-yellow-600" />
                              <span className="text-lg font-bold text-yellow-700">
                                +{problem.pointsAwarded} Points
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {problem.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <MapPinIcon className="w-4 h-4" />
                          {problem.location.address}
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {new Date(problem.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Admin Feedback */}
                      {problem.adminFeedback && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                          <p className="text-sm font-semibold text-blue-900 mb-1">
                            Admin Feedback:
                          </p>
                          <p className="text-sm text-blue-700">{problem.adminFeedback}</p>
                        </div>
                      )}

                      {/* Event Link */}
                      {problem.eventId && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                          <p className="text-sm font-semibold text-green-900 mb-2">
                            ✅ Event Created!
                          </p>
                          <button
                            onClick={() => navigate(`/student/events/${problem.eventId._id}`)}
                            className="text-sm text-green-700 hover:text-green-800 font-medium underline"
                          >
                            View Event: {problem.eventId.title}
                          </button>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => navigate(`/student/problems/${problem._id}`)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                        {problem.status === 'pending' && (
                          <button
                            onClick={() => navigate(`/student/report-problem?edit=${problem._id}`)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProblemReports;
