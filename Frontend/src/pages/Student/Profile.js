import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { DocumentArrowDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import ContributionForm from '../../components/Student/ContributionForm';
import anime from 'animejs/lib/anime.es.js';

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [selectedParticipation, setSelectedParticipation] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  // Animate profile sections when loaded
  useEffect(() => {
    if (!loading && profile) {
      anime({
        targets: '.profile-section',
        translateX: [-60, 0],
        opacity: [0, 1],
        delay: anime.stagger(150),
        duration: 700,
        easing: 'easeOutCubic'
      });

      anime({
        targets: '.contribution-item',
        scale: [0.8, 1],
        opacity: [0, 1],
        delay: anime.stagger(80, {start: 400}),
        duration: 500,
        easing: 'easeOutQuad'
      });
    }
  }, [loading, profile]);

  const fetchProfile = async () => {
    try {
      const userRes = await api.get('/auth/me');
      const [profileRes, participationsRes] = await Promise.all([
        api.get(`/users/student/${userRes.data._id}`),
        api.get('/participations')
      ]);
      setProfile(profileRes.data);
      setContributions(profileRes.data.contributions || []);
      setParticipations(participationsRes.data.filter(p => 
        (p.status === 'attended' || p.status === 'approved') && 
        !profileRes.data.contributions?.some(c => c.participation?._id === p._id)
      ));
    } catch (error) {
      toast.error('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async (participationId) => {
    try {
      // Extract ID if it's an object
      const id = typeof participationId === 'object' ? participationId._id : participationId;
      
      const response = await api.get(`/reports/certificate/${id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Certificate downloaded');
    } catch (error) {
      toast.error('Failed to download certificate');
    }
  };

  const handleSubmitContribution = (participation) => {
    setSelectedParticipation(participation);
    setShowContributionForm(true);
  };

  const handleContributionSuccess = () => {
    fetchProfile();
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
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-gray-600">View your NSS participation and contributions</p>
      </div>

      {profile && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-base font-medium text-gray-900">{profile.student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-base font-medium text-gray-900">{profile.student.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Student ID</p>
                  <p className="text-base font-medium text-gray-900">{profile.student.studentId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="text-base font-medium text-gray-900">{profile.student.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Year</p>
                  <p className="text-base font-medium text-gray-900">{profile.student.year || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistics</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Total Volunteer Hours</p>
                  <p className="text-2xl font-bold text-primary-600">{profile.totalHours}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Events Participated</p>
                  <p className="text-2xl font-bold text-gray-900">{profile.totalEvents}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Certificate Eligible</p>
                  <p className={`text-lg font-semibold ${profile.certificateEligible ? 'text-green-600' : 'text-gray-600'}`}>
                    {profile.certificateEligible ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {participations.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Contributions</h2>
                <div className="space-y-3">
                  {participations.map((participation) => (
                    <div key={participation._id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{participation.event?.title}</h3>
                        <p className="text-xs text-gray-500">Status: {participation.status}</p>
                      </div>
                      <button
                        onClick={() => handleSubmitContribution(participation)}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Submit Report
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contributions</h2>
              <div className="space-y-4">
                {contributions.map((contribution) => (
                  <div key={contribution._id} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {contribution.event?.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {contribution.event?.eventType} | {format(new Date(contribution.submittedAt), 'PPP')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 text-sm font-medium text-white bg-primary-600 rounded-full">
                          {contribution.volunteerHours} hrs
                        </span>
                        {contribution.isVerified && (
                          <span className="px-3 py-1 text-sm font-medium text-green-800 bg-green-100 rounded-full">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{contribution.report}</p>
                    {contribution.participation && (
                      <button
                        onClick={() => downloadCertificate(typeof contribution.participation === 'object' ? contribution.participation._id : contribution.participation)}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                        Download Certificate
                      </button>
                    )}
                  </div>
                ))}
                {contributions.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No contributions yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showContributionForm && selectedParticipation && (
        <ContributionForm
          participation={selectedParticipation}
          onClose={() => {
            setShowContributionForm(false);
            setSelectedParticipation(null);
          }}
          onSuccess={handleContributionSuccess}
        />
      )}
    </div>
  );
};

export default StudentProfile;

