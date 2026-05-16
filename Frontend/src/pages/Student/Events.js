import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CalendarIcon, MapPinIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import anime from 'animejs/lib/anime.es.js';
import { useSocket } from '../../context/SocketContext';

const StudentEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  // const [refreshing, setRefreshing] = useState(false); // eslint-disable-line no-unused-vars
  const [hasAnimated, setHasAnimated] = useState(false);
  const { socket } = useSocket();

  // Ref to access latest filter value  
  const filterRef = useRef(filter);

  // Keep ref in sync with state
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  // Define fetchEvents first so socket handlers can use it
  const fetchEvents = useCallback(async () => {
    try {
      // setRefreshing(true); // eslint-disable-line no-unused-vars
      const currentFilter = filterRef.current;
      const params = currentFilter !== 'all' ? { status: currentFilter } : {};
      const response = await api.get('/events', { params });
      setEvents(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to fetch events');
      setLoading(false);
    } finally {
      // setRefreshing(false); // Removed unused
    }
  }, []);

  // Animate events only on initial load (not on updates)
  useEffect(() => {
    if (!loading && events.length > 0 && !hasAnimated) {
      anime({
        targets: '.event-card',
        scale: [0.9, 1],
        opacity: [0, 1],
        translateY: [40, 0],
        delay: anime.stagger(100),
        duration: 600,
        easing: 'easeOutCubic'
      });
      setHasAnimated(true);
    }
  }, [loading, events, hasAnimated]);

  // Initial fetch and when filter changes
  useEffect(() => {
    fetchEvents();
  }, [filter, fetchEvents]);

  // Real-time event updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewEvent = (data) => {
      toast.success(`New event: ${data.event?.title || data.message}`, {
        duration: 5000,
        icon: '🎉'
      });
      fetchEvents();
    };

    const handleEventUpdate = (data) => {
      toast.info(`Event updated: ${data.event?.title || data.message}`);
      fetchEvents();
    };

    const handleEventDelete = (data) => {
      toast.error(`Event removed: ${data.event?.title || data.message}`);
      fetchEvents();
    };

    // Register socket event listeners
    socket.on('new-event', handleNewEvent);
    socket.on('new-event-broadcast', handleNewEvent);
    socket.on('event-updated', handleEventUpdate);
    socket.on('event-deleted', handleEventDelete);

    // Cleanup
    return () => {
      socket.off('new-event', handleNewEvent);
      socket.off('new-event-broadcast', handleNewEvent);
      socket.off('event-updated', handleEventUpdate);
      socket.off('event-deleted', handleEventDelete);
    };
  }, [socket, fetchEvents]);

  const handleRegister = async (eventId) => {
    try {
      await api.post('/participations', { eventId });
      toast.success('Registration successful! Waiting for approval.');
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Available Events</h1>
        <p className="mt-2 text-gray-600">Browse and register for NSS events</p>
      </div>

      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">All Events</option>
          <option value="published">Published</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <div key={event._id} className="event-card bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-2 hover:scale-105" style={{ opacity: 0 }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                  {event.eventType}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  {event.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(new Date(event.startDate), 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  {event.currentParticipants}/{event.maxParticipants || '∞'} participants
                </div>
              </div>

              <div className="flex space-x-2">
                {event.participationStatus === null && (
                  <button
                    onClick={() => handleRegister(event._id)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Register
                  </button>
                )}
                {event.participationStatus === 'pending' && (
                  <span className="flex-1 px-4 py-2 text-sm font-medium text-center text-yellow-800 bg-yellow-100 rounded-md">
                    Pending Approval
                  </span>
                )}
                {event.participationStatus === 'approved' && (
                  <span className="flex-1 px-4 py-2 text-sm font-medium text-center text-green-800 bg-green-100 rounded-md">
                    Approved
                  </span>
                )}
                {event.participationStatus === 'rejected' && (
                  <span className="flex-1 px-4 py-2 text-sm font-medium text-center text-red-800 bg-red-100 rounded-md">
                    Rejected
                  </span>
                )}
                {event.participationStatus === 'completed' && (
                  <span className="flex-1 px-4 py-2 text-sm font-medium text-center text-purple-800 bg-purple-100 rounded-md">
                    Completed
                  </span>
                )}
              </div>

              {['attended', 'completed'].includes(event.participationStatus) && (
                <Link
                  to={`/student/submit-report/${event._id}`}
                  className="mt-3 inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Submit Event Report
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No events available</p>
        </div>
      )}
    </div>
  );
};

export default StudentEvents;

