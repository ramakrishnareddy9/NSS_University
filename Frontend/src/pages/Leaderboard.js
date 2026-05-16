import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import {
  TrophyIcon,
  SparklesIcon,
  FireIcon,
  StarIcon
} from '@heroicons/react/24/solid';
import {
  UserCircleIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all'); // all, month, year

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/problems/leaderboard', {
        params: { period, limit: 50 }
      });
      setLeaderboard(response.data.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg">
          <TrophyIcon className="w-7 h-7 text-white" />
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg">
          <TrophyIcon className="w-7 h-7 text-white" />
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shadow-lg">
          <TrophyIcon className="w-7 h-7 text-white" />
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full">
          <span className="text-lg font-bold text-gray-700">#{rank}</span>
        </div>
      );
    }
  };

  const getBadgeIcon = (badge) => {
    const icons = {
      'First Reporter': '🎯',
      'Community Hero': '🦸',
      'Problem Solver': '🔧',
      'Change Maker': '🚀',
      'Eagle Eye': '👁️',
      'Active Reporter': '🔥',
      'Environmental Champion': '🌳',
      'Health Guardian': '🏥',
      'Infrastructure Inspector': '🏗️'
    };
    return icons[badge] || '⭐';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrophyIcon className="w-12 h-12 text-yellow-500" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Community Heroes Leaderboard
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Recognizing students who actively report and help solve community problems
          </p>
        </div>

        {/* Period Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { value: 'all', label: 'All Time', icon: StarIcon },
              { value: 'year', label: 'This Year', icon: SparklesIcon },
              { value: 'month', label: 'This Month', icon: FireIcon }
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                    period === option.value
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto items-end">
              {/* 2nd Place */}
              <div className="text-center">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-4 transform hover:scale-105 transition-transform">
                  <div className="flex justify-center mb-4">
                    {getRankBadge(2)}
                  </div>
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <UserCircleIcon className="w-16 h-16 text-gray-600" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{leaderboard[1].name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{leaderboard[1].department}</p>
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg py-2 px-4">
                    <p className="text-2xl font-bold text-gray-700">{leaderboard[1].reportingScore}</p>
                    <p className="text-xs text-gray-600">Points</p>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <p>{leaderboard[1].problemsApproved} Reports Approved</p>
                  </div>
                </div>
                <div className="h-24 bg-gradient-to-t from-gray-300 to-gray-400 rounded-t-lg"></div>
              </div>

              {/* 1st Place */}
              <div className="text-center">
                <div className="bg-white rounded-lg shadow-xl p-6 mb-4 transform hover:scale-105 transition-transform border-4 border-yellow-400">
                  <div className="flex justify-center mb-4">
                    {getRankBadge(1)}
                  </div>
                  <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full mx-auto mb-3 flex items-center justify-center animate-pulse">
                    <UserCircleIcon className="w-20 h-20 text-yellow-700" />
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 mb-1">{leaderboard[0].name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{leaderboard[0].department}</p>
                  <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg py-3 px-4">
                    <p className="text-3xl font-bold text-yellow-700">{leaderboard[0].reportingScore}</p>
                    <p className="text-xs text-yellow-600">Points</p>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <p className="font-semibold">{leaderboard[0].problemsApproved} Reports Approved</p>
                  </div>
                  {leaderboard[0].badges && leaderboard[0].badges.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1">
                      {leaderboard[0].badges.slice(0, 3).map((badge, idx) => (
                        <span key={idx} className="text-lg" title={badge}>
                          {getBadgeIcon(badge)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="h-32 bg-gradient-to-t from-yellow-400 to-yellow-500 rounded-t-lg"></div>
              </div>

              {/* 3rd Place */}
              <div className="text-center">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-4 transform hover:scale-105 transition-transform">
                  <div className="flex justify-center mb-4">
                    {getRankBadge(3)}
                  </div>
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-200 to-orange-400 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <UserCircleIcon className="w-16 h-16 text-orange-600" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{leaderboard[2].name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{leaderboard[2].department}</p>
                  <div className="bg-gradient-to-r from-orange-100 to-orange-200 rounded-lg py-2 px-4">
                    <p className="text-2xl font-bold text-orange-700">{leaderboard[2].reportingScore}</p>
                    <p className="text-xs text-orange-600">Points</p>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <p>{leaderboard[2].problemsApproved} Reports Approved</p>
                  </div>
                </div>
                <div className="h-20 bg-gradient-to-t from-orange-300 to-orange-400 rounded-t-lg"></div>
              </div>
            </div>
          </div>
        )}

        {/* Rest of Leaderboard */}
        {leaderboard.length > 3 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <AcademicCapIcon className="w-6 h-6" />
                Top Contributors
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {leaderboard.slice(3).map((user, index) => (
                <div
                  key={user._id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-shrink-0">
                        {getRankBadge(index + 4)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{user.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-1">
                          <span>{user.studentId}</span>
                          <span className="text-gray-400">•</span>
                          <span>{user.department}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-green-600 font-medium">
                            {user.problemsApproved} Approved
                          </span>
                        </div>
                        {user.badges && user.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {user.badges.map((badge, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
                                title={badge}
                              >
                                <span>{getBadgeIcon(badge)}</span>
                                <span>{badge}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {user.reportingScore}
                        </p>
                        <p className="text-xs text-gray-500">Points</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {leaderboard.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <TrophyIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Yet</h3>
            <p className="text-gray-600">
              Be the first to report a problem and earn your place on the leaderboard!
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-2">How to Earn Points:</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>+10 points</strong> - Problem report approved</li>
            <li>• <strong>+5 points</strong> - High severity problem bonus</li>
            <li>• <strong>+10 points</strong> - Critical severity problem bonus</li>
            <li>• <strong>+20 points</strong> - First report bonus</li>
            <li>• <strong>+5 points</strong> - Problem resolved</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <h3 className="font-bold text-blue-900 mb-2">Badges:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
              <div>🎯 First Reporter (1 report)</div>
              <div>🦸 Community Hero (5 reports)</div>
              <div>🔧 Problem Solver (10 reports)</div>
              <div>🚀 Change Maker (20 reports)</div>
              <div>🔥 Active Reporter (3/month)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
