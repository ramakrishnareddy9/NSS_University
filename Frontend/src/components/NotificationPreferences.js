import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState({
    emailNotifications: {
      newEvent: true,
      eventPublished: true,
      participationApproved: true,
      participationRejected: true,
      waitlistPromotion: true,
      eventCancelled: true,
      certificateReady: true,
      contributionVerified: true,
      eventReminder: true
    },
    pushNotifications: true,
    inAppNotifications: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications-api/preferences');
      setPreferences(response.data);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (category, key) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const handleGeneralToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      await api.put('/notifications-api/preferences', preferences);
      toast.success('Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading preferences...</div>;
  }

  const emailNotificationTypes = [
    { key: 'newEvent', label: 'New Event Created', description: 'Notify me when a new event is created' },
    { key: 'eventPublished', label: 'Event Published', description: 'Notify me when an event is published' },
    { key: 'participationApproved', label: 'Registration Approved', description: 'Notify me when my registration is approved' },
    { key: 'participationRejected', label: 'Registration Rejected', description: 'Notify me when my registration is rejected' },
    { key: 'waitlistPromotion', label: 'Waitlist Promotion', description: 'Notify me when promoted from waitlist' },
    { key: 'eventCancelled', label: 'Event Cancelled', description: 'Notify me when an event is cancelled' },
    { key: 'certificateReady', label: 'Certificate Ready', description: 'Notify me when my certificate is ready' },
    { key: 'contributionVerified', label: 'Contribution Verified', description: 'Notify me when my contribution is verified' },
    { key: 'eventReminder', label: 'Event Reminder', description: 'Remind me before upcoming events' }
  ];

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <BellIcon className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
      </div>

      {/* General Settings */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative inline-flex w-12 h-6 bg-gray-300 rounded-full">
              <input
                type="checkbox"
                checked={preferences.inAppNotifications}
                onChange={() => handleGeneralToggle('inAppNotifications')}
                className="sr-only"
              />
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-all ${
                preferences.inAppNotifications
                  ? 'translate-x-6 bg-green-500'
                  : 'translate-x-0 bg-gray-500'
              }`} />
            </div>
            <div>
              <p className="font-medium text-gray-900">In-App Notifications</p>
              <p className="text-sm text-gray-600">See notifications in the notification center</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative inline-flex w-12 h-6 bg-gray-300 rounded-full">
              <input
                type="checkbox"
                checked={preferences.pushNotifications}
                onChange={() => handleGeneralToggle('pushNotifications')}
                className="sr-only"
              />
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-all ${
                preferences.pushNotifications
                  ? 'translate-x-6 bg-green-500'
                  : 'translate-x-0 bg-gray-500'
              }`} />
            </div>
            <div>
              <p className="font-medium text-gray-900">Browser Notifications</p>
              <p className="text-sm text-gray-600">Receive browser push notifications</p>
            </div>
          </label>
        </div>
      </div>

      {/* Email Notification Settings */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notification Types</h3>
        
        <div className="space-y-4">
          {emailNotificationTypes.map((notifType) => (
            <label key={notifType.key} className="flex items-start gap-3 cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="mt-1">
                <div className="relative inline-flex w-12 h-6 bg-gray-300 rounded-full">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications[notifType.key] !== false}
                    onChange={() => handleToggle('emailNotifications', notifType.key)}
                    className="sr-only"
                  />
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-all ${
                    preferences.emailNotifications[notifType.key] !== false
                      ? 'translate-x-6 bg-green-500'
                      : 'translate-x-0 bg-gray-500'
                  }`} />
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-900">{notifType.label}</p>
                <p className="text-sm text-gray-600">{notifType.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CheckIcon className="h-5 w-5" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferences;
