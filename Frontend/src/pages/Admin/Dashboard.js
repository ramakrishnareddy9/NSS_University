import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import {
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BellIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import VibrantPageLayout from '../../components/VibrantPageLayout';
import anime from 'animejs/lib/anime.es.js';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    targetRole: 'all'
  });
  const [sendingNotification, setSendingNotification] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  // Animate dashboard elements after data loads
  useEffect(() => {
    if (!loading && stats) {
      // Animate stat cards with stagger and bounce
      anime({
        targets: '.admin-stat-card',
        scale: [0.5, 1],
        opacity: [0, 1],
        translateY: [60, 0],
        rotate: [10, 0],
        delay: anime.stagger(120),
        duration: 800,
        easing: 'easeOutElastic(1, .7)'
      });

      // Add pulsing glow effect to cards
      anime({
        targets: '.admin-stat-card',
        boxShadow: [
          '0 4px 6px rgba(0,0,0,0.1)',
          '0 20px 40px rgba(59, 130, 246, 0.3)',
          '0 4px 6px rgba(0,0,0,0.1)'
        ],
        duration: 2000,
        delay: anime.stagger(150, {start: 800}),
        easing: 'easeInOutQuad',
        loop: true
      });
    }
  }, [loading, stats]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSendingNotification(true);
    try {
      await api.post('/notifications', {
        title: notificationForm.title,
        message: notificationForm.message,
        targetRole: notificationForm.targetRole
      });
      
      toast.success('Notification sent successfully');
      setNotificationForm({ title: '', message: '', targetRole: 'all' });
      setShowNotificationModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setSendingNotification(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.totalStudents || 0,
      icon: UsersIcon,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Events',
      value: stats?.totalEvents || 0,
      icon: CalendarIcon,
      color: 'bg-green-500'
    },
    {
      title: 'Pending Problems',
      value: stats?.pendingProblems || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500'
    },
    {
      title: 'Total Participations',
      value: stats?.totalParticipations || 0,
      icon: CheckCircleIcon,
      color: 'bg-purple-500'
    },
    {
      title: 'Total Volunteer Hours',
      value: stats?.totalVolunteerHours || 0,
      icon: ClockIcon,
      color: 'bg-orange-500'
    }
  ];

  const customCounters = {
    volunteers: { 
      value: stats?.totalStudents || 0, 
      label: 'Total Students', 
      icon: '👥' 
    },
    camps: { 
      value: stats?.totalEvents || 0, 
      label: 'Total Events', 
      icon: '📅' 
    },
    hours: { 
      value: stats?.totalParticipations || 0, 
      label: 'Total Participations', 
      icon: '✅' 
    },
    impact: { 
      value: stats?.totalVolunteerHours || 0, 
      label: 'Volunteer Hours', 
      icon: '⏰' 
    }
  };

  return (
    <VibrantPageLayout
      backgroundImage="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200"
      title="Admin Dashboard"
      subtitle="Manage and monitor NSS activities and statistics"
      counters={customCounters}
      showCounters={true}
      showBlog={true}
    >
      <div className="space-y-6">

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="admin-stat-card bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 overflow-hidden shadow-xl rounded-2xl border-2 border-blue-100 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105" style={{opacity: 0}}>
              <div className="p-6">
                <div className="flex items-center">
                  <div className={`${stat.color} rounded-xl p-4 shadow-lg transform transition-transform duration-300 hover:rotate-12 hover:scale-110`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-bold text-gray-600 dark:text-gray-300 truncate uppercase tracking-wide">
                        {stat.title}
                      </dt>
                      <dd className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-1">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/admin/events"
              className="block w-full text-left px-4 py-2 bg-primary-50 hover:bg-primary-100 rounded-md text-primary-700 font-medium"
            >
              Create New Event
            </a>
            <a
              href="/admin/participations"
              className="block w-full text-left px-4 py-2 bg-primary-50 hover:bg-primary-100 rounded-md text-primary-700 font-medium"
            >
              Review Participations
            </a>
            <a
              href="/admin/reports"
              className="block w-full text-left px-4 py-2 bg-primary-50 hover:bg-primary-100 rounded-md text-primary-700 font-medium"
            >
              Generate Reports
            </a>
            <a
              href="/admin/invite"
              className="block w-full text-left px-4 py-2 bg-primary-50 hover:bg-primary-100 rounded-md text-primary-700 font-medium"
            >
              Invite Faculty or Admin
            </a>
            <a
              href="/admin/academic-year-config"
              className="block w-full text-left px-4 py-2 bg-primary-50 hover:bg-primary-100 rounded-md text-primary-700 font-medium"
            >
              Manage Academic Years
            </a>
            <a
              href="/admin/event-capacity-analytics"
              className="block w-full text-left px-4 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-md text-emerald-700 font-medium"
            >
              View Event Capacity Analytics
            </a>
          </div>
        </div>
      </div>
      </div>

      {/* Floating Notification Button */}
      <button
        onClick={() => setShowNotificationModal(!showNotificationModal)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transform transition-all duration-300 z-40 group"
        title="Send Notifications"
      >
        {showNotificationModal ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6 animate-pulse" />
        )}
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
          !
        </span>
      </button>

      {/* Notification Modal - Built-in Form */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white dark:bg-gray-800 w-full max-w-2xl shadow-2xl rounded-lg"
            style={{ borderRadius: '8px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <BellIcon className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Send Notification
                </h3>
              </div>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendNotification} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Notification Title
                </label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                  placeholder="e.g., New Event Available"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={sendingNotification}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Message
                </label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                  placeholder="Enter your notification message here"
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={sendingNotification}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Send To
                </label>
                <select
                  value={notificationForm.targetRole}
                  onChange={(e) => setNotificationForm({...notificationForm, targetRole: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={sendingNotification}
                >
                  <option value="all">All Users</option>
                  <option value="student">Students Only</option>
                  <option value="faculty">Faculty Only</option>
                  <option value="admin">Admins Only</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  disabled={sendingNotification}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={sendingNotification}
                >
                  {sendingNotification ? 'Sending...' : 'Send Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </VibrantPageLayout>
  );
};

export default AdminDashboard;

