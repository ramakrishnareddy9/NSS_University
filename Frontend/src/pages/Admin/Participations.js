import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  ArrowPathIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';


const ATTENDANCE_THRESHOLD = 75;

const normalizeRegNo = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

const AdminParticipations = () => {

  // ...existing code...

  const [participations, setParticipations] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchParticipations = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (selectedEvent) params.eventId = selectedEvent;

      const response = await api.get('/participations', { params });
      const sorted = (response.data || []).sort((a, b) => {
        const aDate = a.event?.startDate ? new Date(a.event.startDate).getTime() : new Date(a.registeredAt).getTime();
        const bDate = b.event?.startDate ? new Date(b.event.startDate).getTime() : new Date(b.registeredAt).getTime();
        return bDate - aDate;
      });
      setParticipations(sorted);
    } catch (error) {
      console.error('Failed to fetch participations', error);
      toast.error('Failed to fetch participations');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedEvent]);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [attendanceData, setAttendanceData] = useState({});
  const [fileUploaded, setFileUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [decisions, setDecisions] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [draftDecision, setDraftDecision] = useState('approve');
  const [processingDecisions, setProcessingDecisions] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchParticipations();
  }, [fetchParticipations]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewParticipation = (data) => {
      console.log('🔔 New participation received:', data);
      // Only refresh if it's for the selected event (if any selected)
      if (!selectedEvent || data.participation?.event === selectedEvent || data.participation?.event?._id === selectedEvent) {
        fetchParticipations();
        toast.success(`New registration: ${data.participation?.student?.name || 'A student'}`);
      }
    };

    const handleParticipationUpdated = (data) => {
      console.log('🔄 Participation update received:', data);
      fetchParticipations();
    };

    socket.on('new-participation', handleNewParticipation);
    socket.on('participation-updated', handleParticipationUpdated);

    return () => {
      socket.off('new-participation', handleNewParticipation);
      socket.off('participation-updated', handleParticipationUpdated);
    };
  }, [socket, selectedEvent, fetchParticipations]);

  useEffect(() => {
    if (fileUploaded) {

      applyAutoDecisions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceData, participations, fileUploaded]);

  const loadEvents = async () => {
    try {
      const response = await api.get('/events');
      const sorted = (response.data || []).sort((a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
        return bDate - aDate;
      });
      setEvents(sorted);
      if (sorted.length > 0 && !selectedEvent) {
        setSelectedEvent(sorted[0]._id);
      }
    } catch (error) {
      console.error('Failed to load events', error);
      toast.error('Failed to load events');
    }
  };



  const getStudentAttendance = (studentId) => {
    if (!studentId || !fileUploaded) return null;
    const normalized = normalizeRegNo(studentId);
    if (!normalized) return null;

    if (attendanceData[normalized] !== undefined) {
      return attendanceData[normalized];
    }

    // Ends-with match for IDs like ...c33
    const suffixMatch = Object.entries(attendanceData).find(([reg]) => reg.endsWith(normalized));
    if (suffixMatch) {
      return suffixMatch[1];
    }

    if (normalized.length >= 3) {
      const partialMatch = Object.entries(attendanceData).find(([reg]) => reg.includes(normalized));
      if (partialMatch) {
        return partialMatch[1];
      }
    }

    return null;
  };

  const applyAutoDecisions = () => {
    setDecisions((prev) => {
      const updated = { ...prev };

      participations.forEach((participation) => {
        const percent = getStudentAttendance(participation.student?.studentId);
        if (percent === null) {
          if (updated[participation._id]?.source !== 'manual') {
            delete updated[participation._id];
          }
          return;
        }

        if (updated[participation._id]?.source === 'manual') {
          updated[participation._id] = {
            ...updated[participation._id],
            attendance: percent,
          };
          return;
        }

        if (participation.status === 'pending') {
          updated[participation._id] = {
            decision: percent >= ATTENDANCE_THRESHOLD ? 'approve' : 'reject',
            source: 'auto',
            attendance: percent,
          };
        } else if (updated[participation._id]) {
          updated[participation._id] = {
            ...updated[participation._id],
            attendance: percent,
          };
        }
      });

      // Clean up entries for participations no longer present
      Object.keys(updated).forEach((id) => {
        if (!participations.find((p) => p._id === id)) {
          delete updated[id];
        }
      });

      return updated;
    });
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/participations/${id}/approve`);
      toast.success('Participation approved');
      await fetchParticipations();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to approve participation';
      toast.error(message);
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/participations/${id}/reject`);
      toast.success('Participation rejected');
      await fetchParticipations();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reject participation';
      toast.error(message);
    }
  };

  const handleAttendance = async (id, attended) => {
    try {
      await api.put(`/participations/${id}/attendance`, { attended });
      toast.success(`Attendance ${attended ? 'marked' : 'removed'}`);
      await fetchParticipations();
    } catch (error) {
      toast.error('Failed to update attendance');
    }
  };

  const handleSearch = () => {
    if (!searchInput.trim()) {
      setSearchQuery('');
      return;
    }

    const query = normalizeRegNo(searchInput);
    if (!query) {
      toast.error('Enter a valid registration number');
      return;
    }

    const exists = participations.some((p) => normalizeRegNo(p.student?.studentId).includes(query));
    if (!exists) {
      toast.error('No student found with that registration number');
    }
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleExcelFile = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      setUploading(true);
      setUploadProgress(0);

      setTimeout(() => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          processExcelDataInChunks(jsonData);
        } catch (error) {
          console.error('Error processing file:', error);
          toast.error('Error processing file. Please check the format.');
          setUploading(false);
        }
      }, 100);
    };

    reader.readAsArrayBuffer(file);
  };

  const processExcelDataInChunks = (data) => {
    const studentsData = {};
    const CHUNK_SIZE = 1000;

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(100, data.length); i++) {
      const row = data[i];
      if (Array.isArray(row)) {
        const rowString = row.join(' ').toUpperCase();
        if (rowString.includes('REGD') && rowString.includes('TOTAL')) {
          headerRowIndex = i;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      toast.error('Could not find header row with REGD and TOTAL %');
      setUploading(false);
      return;
    }

    const headers = data[headerRowIndex];
    const regdIndex = headers.findIndex((col) => String(col).toUpperCase().includes('REGD'));
    const totalIndex = headers.findIndex((col) => String(col).toUpperCase().includes('TOTAL'));

    if (regdIndex === -1 || totalIndex === -1) {
      toast.error('Could not find REGD or TOTAL columns');
      setUploading(false);
      return;
    }

    const processChunk = (startIndex) => {
      const endIndex = Math.min(startIndex + CHUNK_SIZE, data.length);

      for (let i = startIndex; i < endIndex; i++) {
        if (i <= headerRowIndex) continue;
        const row = data[i];
        if (!row || row.length === 0) continue;

        const regNo = row[regdIndex];
        const totalPercent = row[totalIndex];
        if (!regNo || totalPercent === undefined || totalPercent === null) continue;

        const normalized = normalizeRegNo(regNo);
        if (!normalized) continue;

        studentsData[normalized] = parseFloat(totalPercent) || 0;

        if (i % 100 === 0) {
          setUploadProgress(
            Math.round(((i - headerRowIndex) / (data.length - headerRowIndex)) * 100)
          );
        }
      }

      if (endIndex < data.length) {
        setTimeout(() => processChunk(endIndex), 50);
      } else {
        setAttendanceData(studentsData);
        setUploading(false);
        setUploadProgress(100);
        setFileUploaded(true);
        toast.success(`Loaded attendance for ${Object.keys(studentsData).length} students`);
      }
    };

    processChunk(headerRowIndex + 1);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Please use files smaller than 50MB.');
      return;
    }

    setAttendanceData({});
    setFileUploaded(false);
    setDecisions({});

    if (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    ) {
      handleExcelFile(file);
    } else {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
    }
  };

  const clearAttendanceFile = () => {
    setAttendanceData({});
    setFileUploaded(false);
    setDecisions({});
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Attendance file cleared');
  };

  const startEditing = (participation) => {
    setEditingId(participation._id);
    const existing = decisions[participation._id]?.decision;
    if (existing) {
      setDraftDecision(existing);
    } else if (participation.status === 'approved') {
      setDraftDecision('approve');
    } else if (participation.status === 'rejected') {
      setDraftDecision('reject');
    } else {
      setDraftDecision('approve');
    }
  };

  const saveManualDecision = (participationId) => {
    if (draftDecision === 'none') {
      setDecisions((prev) => {
        const next = { ...prev };
        delete next[participationId];
        return next;
      });
    } else {
      setDecisions((prev) => ({
        ...prev,
        [participationId]: {
          decision: draftDecision,
          source: 'manual',
          attendance: prev[participationId]?.attendance,
        },
      }));
    }

    setEditingId(null);
    setDraftDecision('approve');
  };

  const actionableCount = useMemo(() => {
    return participations.reduce((count, participation) => {
      const decision = decisions[participation._id]?.decision;
      if (!decision) return count;
      if (decision === 'approve' && participation.status !== 'approved') return count + 1;
      if (decision === 'reject' && participation.status !== 'rejected') return count + 1;
      return count;
    }, 0);
  }, [decisions, participations]);

  const confirmDecisions = async () => {
    if (actionableCount === 0) {
      toast('No decisions to confirm');
      return;
    }

    setProcessingDecisions(true);
    let success = 0;
    let failed = 0;

    for (const participation of participations) {
      const decision = decisions[participation._id]?.decision;
      if (!decision) continue;
      if (decision === 'approve' && participation.status === 'approved') continue;
      if (decision === 'reject' && participation.status === 'rejected') continue;

      try {
        if (decision === 'approve') {
          await api.put(`/participations/${participation._id}/approve`);
        } else {
          await api.put(`/participations/${participation._id}/reject`);
        }
        success += 1;
      } catch (error) {
        failed += 1;
        console.error('Failed to process decision', {
          participationId: participation._id,
          error,
        });
      }
    }

    if (success > 0) {
      toast.success(`Processed ${success} participation${success === 1 ? '' : 's'}`);
    }
    if (failed > 0) {
      toast.error(`${failed} participation${failed === 1 ? '' : 's'} failed`);
    }

    await fetchParticipations();
    setProcessingDecisions(false);
  };

  const visibleParticipations = useMemo(() => {
    if (!searchQuery) return participations;
    return participations.filter((participation) =>
      normalizeRegNo(participation.student?.studentId).includes(searchQuery)
    );
  }, [participations, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl 나 font-bold text-gray-900">Participation Management</h1>
          <p className="mt-2 text-gray-600">
            Upload attendance sheets, review AI suggestions, then confirm approvals or rejections in bulk.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <button
            onClick={confirmDecisions}
            disabled={processingDecisions || actionableCount === 0}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold shadow ${actionableCount === 0 || processingDecisions
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
          >
            {processingDecisions ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Confirm Decisions
                {actionableCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {actionableCount}
                  </span>
                )}
              </>
            )}
          </button>
          <p className="text-xs text-gray-500">
            Approvals and rejections are only sent after clicking Confirm.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">Event</label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            {events.map((event) => (
              <option key={event._id} value={event._id}>
                {event.title}
              </option>
            ))}
            {events.length === 0 && <option value="">No events found</option>}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="attended">Attended</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex flex-col lg:col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-2">Search by Registration ID</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. 231FA04C33"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700"
            >
              Search
            </button>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Clear
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-1 text-xs text-gray-500">
              Showing results containing "{searchInput}".
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 bg-white shadow rounded-lg p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Attendance Sheet</h2>
            <p className="text-xs text-gray-500">
              Upload an Excel sheet that contains registration numbers and total attendance %. AI will suggest approvals automatically.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={uploading}
              className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {fileUploaded && (
              <button
                onClick={clearAttendanceFile}
                className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Clear File
              </button>
            )}
          </div>
        </div>

        {uploading && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">Processing file... {uploadProgress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {fileUploaded && !uploading && (
          <div className="mt-3 flex items-center gap-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            <CheckIcon className="h-4 w-4" />
            Attendance file loaded. Auto decisions are ready for review.
          </div>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {visibleParticipations.map((participation) => {
            const attendancePercent = getStudentAttendance(participation.student?.studentId);
            const decisionMeta = decisions[participation._id];
            const decisionLabel = decisionMeta?.decision;
            const isManual = decisionMeta?.source === 'manual';

            return (
              <li key={participation._id} className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{participation.student?.name}</p>
                        <p className="text-xs text-gray-500">
                          {participation.student?.email} • {participation.student?.studentId}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${participation.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : participation.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : participation.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : participation.status === 'attended'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                          }`}
                      >
                        {participation.status}
                      </span>
                      {decisionLabel && (
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full border ${decisionLabel === 'approve'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                            }`}
                        >
                          {decisionLabel === 'approve' ? 'Queued: Approve' : 'Queued: Reject'}{' '}
                          {isManual ? '(manual)' : '(auto)'}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 text-sm text-gray-600">
                      <p>
                        <strong className="text-gray-700">Event:</strong> {participation.event?.title}
                      </p>
                      <p>
                        {participation.event?.eventType} • {participation.event?.location}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Registered: {format(new Date(participation.registeredAt), 'PPP')}
                      </p>

                      {fileUploaded && (
                        <div className="mt-3">
                          {attendancePercent !== null ? (
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-semibold ${attendancePercent >= ATTENDANCE_THRESHOLD
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                                }`}
                            >
                              Attendance: {attendancePercent}%
                              <span className="text-[10px] uppercase tracking-wide">
                                {attendancePercent >= ATTENDANCE_THRESHOLD ? 'Meets criteria' : 'Below criteria'}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-yellow-200 bg-yellow-50 text-xs font-semibold text-yellow-800">
                              ⚠ Attendance not found in upload
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    {editingId === participation._id ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          value={draftDecision}
                          onChange={(e) => setDraftDecision(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                        >
                          <option value="approve">Approve</option>
                          <option value="reject">Reject</option>
                          <option value="none">No change</option>
                        </select>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveManualDecision(participation._id)}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700"
                          >
                            <CheckIcon className="h-4 w-4" /> Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setDraftDecision('approve');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-200"
                          >
                            <XMarkIcon className="h-4 w-4" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {participation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(participation._id)}
                              className="px-3 py-2 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(participation._id)}
                              className="px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {(participation.status === 'pending' || fileUploaded) && (
                          <button
                            onClick={() => startEditing(participation)}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            Edit decision
                          </button>
                        )}

                        {participation.status === 'approved' && (
                          <button
                            onClick={() => handleAttendance(participation._id, true)}
                            className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                          >
                            Mark Attendance
                          </button>
                        )}

                        {participation.attendance && (
                          <span className="px-3 py-2 text-xs font-semibold text-green-800 bg-green-100 rounded-md">
                            Attended
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {visibleParticipations.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No participations match the current filters.
        </div>
      )}
    </div>
  );
};

export default AdminParticipations;

