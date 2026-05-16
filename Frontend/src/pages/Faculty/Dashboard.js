import React from 'react';
import { Link } from 'react-router-dom';

const FacultyDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Faculty Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage NSS activities and student participations</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/events"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Events</h3>
          <p className="text-gray-600">Create and manage NSS events</p>
        </Link>

        <Link
          to="/admin/participations"
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Participations</h3>
          <p className="text-gray-600">Approve or reject student participation requests</p>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">View Reports</h3>
          <p className="text-gray-600">Access event and participation reports</p>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;

