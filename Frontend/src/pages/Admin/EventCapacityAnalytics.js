import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import { Users, AlertCircle, TrendingUp } from 'lucide-react';

const EventCapacityAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchCapacityAnalytics();
  }, []);

  const fetchCapacityAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/stats/event-capacity');
      if (response.data.success) {
        setAnalyticsData(response.data);
      }
    } catch (error) {
      console.error('Error fetching capacity analytics:', error);
      toast.error('Failed to load capacity analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventDetails = async (eventId) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/stats/event-capacity/${eventId}`);
      if (response.data.success) {
        setSelectedEvent(eventId);
        setEventDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error('Failed to load event details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEventClick = (event) => {
    fetchEventDetails(event.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return <div className="text-center py-12 text-red-600">Failed to load analytics data</div>;
  }

  const { summary, eventsWithWaitlist, mostFilledEvents, allEvents } = analyticsData;

  // Prepare data for capacity chart
  const capacityChartData = mostFilledEvents.slice(0, 10).map(e => ({
    name: e.title.substring(0, 20),
    filled: e.currentParticipants,
    remaining: e.spotsRemaining,
    percentage: e.fillingPercentage
  }));

  // Prepare data for status distribution pie chart
  const statusData = [
    { name: 'At Capacity', value: summary.eventsAtCapacity, color: '#ef4444' },
    { name: 'Available Spots', value: summary.totalCapacityLimitedEvents - summary.eventsAtCapacity, color: '#10b981' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Event Capacity Analytics</h1>
          <p className="text-gray-600">Monitor event registrations, waitlists, and capacity utilization</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Events</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalCapacityLimitedEvents}</p>
              </div>
              <TrendingUp className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">At Capacity</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary.eventsAtCapacity}</p>
              </div>
              <AlertCircle className="text-red-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">On Waitlist</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalWaitlistedStudents}</p>
              </div>
              <Users className="text-yellow-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
            <div>
              <p className="text-gray-600 text-sm font-medium">Avg Filling Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.averageFillingRate}%</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Status Distribution */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Event Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Events by Filling Rate */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Most Filled Events</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={capacityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="filled" stackId="a" fill="#10b981" name="Confirmed" />
                <Bar dataKey="remaining" stackId="a" fill="#e5e7eb" name="Remaining" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Events with Waitlist */}
        {eventsWithWaitlist.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Events with Waitlists ({eventsWithWaitlist.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Event Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Confirmed</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Capacity</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Waitlist</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Filling %</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsWithWaitlist.map((event) => (
                    <tr key={event.id} className="border-b hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{event.title}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          event.status === 'published' ? 'bg-blue-100 text-blue-800' :
                          event.status === 'ongoing' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{event.currentParticipants}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{event.maxCapacity}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-yellow-600">{event.waitlistedCount}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                event.fillingPercentage >= 100 ? 'bg-red-500' :
                                event.fillingPercentage >= 80 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(event.fillingPercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">{event.fillingPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleEventClick(event)}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Event Details Modal/Panel */}
        {selectedEvent && eventDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold">{eventDetails.event.title}</h2>
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    setEventDetails(null);
                  }}
                  className="text-2xl leading-none opacity-70 hover:opacity-100"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                {/* Event Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Event Information</h3>
                  <p className="text-gray-600 mb-2">{eventDetails.event.description}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(eventDetails.event.startDate).toLocaleDateString()} - {eventDetails.event.endDate ? new Date(eventDetails.event.endDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                {/* Capacity Info */}
                <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Capacity Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Max Capacity</p>
                      <p className="text-2xl font-bold text-gray-900">{eventDetails.capacity.maxCapacity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Current Participants</p>
                      <p className="text-2xl font-bold text-gray-900">{eventDetails.capacity.currentParticipants}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Spots Remaining</p>
                      <p className="text-2xl font-bold text-green-600">{eventDetails.capacity.spotsRemaining}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Filling Rate</p>
                      <p className="text-2xl font-bold text-indigo-600">{eventDetails.capacity.fillingPercentage}%</p>
                    </div>
                  </div>
                </div>

                {/* Participation Breakdown */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Participation Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Confirmed:</span>
                      <span className="font-semibold text-gray-900">{eventDetails.participations.confirmed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Waitlisted:</span>
                      <span className="font-semibold text-yellow-600">{eventDetails.participations.waitlisted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Attended:</span>
                      <span className="font-semibold text-green-600">{eventDetails.participations.attended}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Rejected:</span>
                      <span className="font-semibold text-red-600">{eventDetails.participations.rejected}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Cancelled:</span>
                      <span className="font-semibold text-gray-600">{eventDetails.participations.cancelled}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-gray-900 font-semibold">Attendance Rate:</span>
                      <span className="font-bold text-indigo-600">{eventDetails.participations.attendanceRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Waitlist Details */}
                {eventDetails.waitlist.count > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Waitlist ({eventDetails.waitlist.count})</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {eventDetails.waitlist.students.map((item) => (
                        <div key={item.student._id} className="flex items-center justify-between p-2 bg-white rounded border border-yellow-100">
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-200 text-yellow-900 font-bold text-sm mr-3">
                              {item.position}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{item.student.name}</p>
                              <p className="text-xs text-gray-600">{item.student.email}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(item.waitlistedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCapacityAnalytics;
