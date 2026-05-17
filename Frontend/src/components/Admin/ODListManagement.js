import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { DocumentDownloadIcon, FileDownloadIcon, PrinterIcon } from '@heroicons/react/24/outline';

export default function ODListManagement({ eventId, eventTitle }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [odData, setOdData] = useState(null);

  // Fetch departments and participants
  const fetchODData = async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      // Fetch OD list data
      const odResponse = await api.get(`/od-list/event/${eventId}`);
      setOdData(odResponse.data);

      // Fetch departments
      const deptResponse = await api.get(`/od-list/event/${eventId}/departments`);
      setDepartments(deptResponse.data.departments || []);
    } catch (error) {
      toast.error('Failed to fetch OD list data');
      console.error('Error fetching OD data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchODData();
  }, [eventId]);

  // Download OD list as Excel
  const handleDownloadExcel = async () => {
    try {
      const response = await api.get(`/od-list/event/${eventId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `OD_List_${eventTitle}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('OD list downloaded successfully');
    } catch (error) {
      toast.error('Failed to download OD list');
    }
  };

  // Download department-wise OD letter PDF
  const handleDownloadODLetter = async (department) => {
    try {
      setLoading(true);
      const response = await api.get(
        `/od-list/event/${eventId}/letter-pdf/${encodeURIComponent(department)}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `OD_Letter_${department}_${eventTitle}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`OD letter for ${department} downloaded successfully`);
    } catch (error) {
      toast.error(`Failed to download OD letter for ${department}`);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Print OD letter
  const handlePrintODLetter = async (department) => {
    try {
      setLoading(true);
      const response = await api.get(
        `/od-list/event/${eventId}/letter-pdf/${encodeURIComponent(department)}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      toast.success(`Printing OD letter for ${department}`);
    } catch (error) {
      toast.error(`Failed to print OD letter for ${department}`);
    } finally {
      setLoading(false);
    }
  };

  if (!eventId) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
        Please select or create an event first to manage OD list.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">OD List & Letters Management</h2>

      {/* Event Info */}
      {odData && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">{odData.event.title}</h3>
          <p className="text-sm text-blue-800">
            <strong>Date:</strong> {odData.event.date} • <strong>Time:</strong> {odData.event.startTime} - {odData.event.endTime}
          </p>
          <p className="text-sm text-blue-800 mt-1">
            <strong>Total Participants:</strong> {odData.participants?.length || 0}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={handleDownloadExcel}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
        >
          <FileDownloadIcon className="h-5 w-5" />
          Download as Excel
        </button>
      </div>

      {/* Departments and Letter Downloads */}
      {departments.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Department-wise OD Letters ({departments.length} departments)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <h4 className="font-semibold text-gray-900 mb-2">{dept.name}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>{dept.participants}</strong> participant{dept.participants !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadODLetter(dept.name)}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition text-sm"
                    title="Download OD letter as PDF"
                  >
                    <DocumentDownloadIcon className="h-4 w-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => handlePrintODLetter(dept.name)}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 transition"
                    title="Print OD letter"
                  >
                    <PrinterIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            {loading ? 'Loading departments...' : 'No approved participants found for this event'}
          </p>
        </div>
      )}

      {/* OD List Data Table */}
      {odData && odData.participants && odData.participants.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Participant Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Registration #</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Department</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Year</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-900">Periods</th>
                </tr>
              </thead>
              <tbody>
                {odData.participants.map((participant, idx) => (
                  <tr key={idx} className="border border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{participant.registrationNumber}</td>
                    <td className="px-4 py-2 text-gray-900">{participant.name}</td>
                    <td className="px-4 py-2 text-gray-700">{participant.department}</td>
                    <td className="px-4 py-2 text-gray-700">{participant.year}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                        {participant.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {participant.periods && participant.periods.length > 0
                        ? participant.periods.map(p => `P${p.periodNumber}`).join(', ')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <strong>Note:</strong> OD letters are generated department-wise and ready for faculty countersignature. Each letter includes participant details, event information, and signature fields for both faculty and NSS coordinator.
      </div>
    </div>
  );
}
