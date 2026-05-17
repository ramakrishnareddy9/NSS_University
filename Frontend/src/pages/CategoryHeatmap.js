import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  FireIcon
} from '@heroicons/react/24/solid';

const CategoryHeatmap = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ totalProblems: 0, totalApproved: 0, totalResolved: 0 });

  // Category colors for visualization
  const CATEGORY_COLORS = {
    cleanliness: '#3B82F6',
    infrastructure: '#8B5CF6',
    health: '#EC4899',
    education: '#F59E0B',
    environment: '#10B981',
    safety: '#EF4444',
    water: '#06B6D4',
    electricity: '#FBBF24',
    roads: '#6366F1',
    other: '#6B7280'
  };

  const getCategoryLabel = (category) => {
    const labels = {
      cleanliness: 'Cleanliness',
      infrastructure: 'Infrastructure',
      health: 'Health',
      education: 'Education',
      environment: 'Environment',
      safety: 'Safety',
      water: 'Water',
      electricity: 'Electricity',
      roads: 'Roads',
      other: 'Other'
    };
    return labels[category] || category;
  };

  useEffect(() => {
    fetchHeatmap();
  }, [period]);

  const fetchHeatmap = async () => {
    try {
      setLoading(true);
      const response = await api.get('/problems/heatmap/categories', {
        params: { period }
      });
      setHeatmapData(response.data.data);
      setTotals(response.data.totals);
    } catch (error) {
      console.error('Error fetching category heatmap:', error);
      toast.error('Failed to load category heatmap');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Prepare data for visualizations
  const chartData = heatmapData.map(item => ({
    category: getCategoryLabel(item.category),
    reported: item.problemsReported,
    approved: item.problemsApproved,
    resolved: item.problemsResolved
  }));

  const pieData = heatmapData.map(item => ({
    name: getCategoryLabel(item.category),
    value: item.problemsReported
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <SparklesIcon className="w-12 h-12 text-purple-600" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              Community Problems Dashboard
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Anonymized insights into community problems by category
          </p>
        </div>

        {/* Period Filter */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { value: 'month', label: 'Last 30 Days', icon: FireIcon },
              { value: 'year', label: 'This Year', icon: SparklesIcon }
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                    period === option.value
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg scale-105'
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

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Problems Reported</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totals.totalProblems}</p>
              </div>
              <FireIcon className="w-12 h-12 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Problems Approved</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totals.totalApproved}</p>
                <p className="text-sm text-green-600 mt-1">
                  {totals.totalProblems > 0 
                    ? `${((totals.totalApproved / totals.totalProblems) * 100).toFixed(1)}% approval rate`
                    : 'N/A'
                  }
                </p>
              </div>
              <CheckCircleIcon className="w-12 h-12 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Problems Resolved</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totals.totalResolved}</p>
                <p className="text-sm text-purple-600 mt-1">
                  {totals.totalProblems > 0
                    ? `${((totals.totalResolved / totals.totalProblems) * 100).toFixed(1)}% resolution rate`
                    : 'N/A'
                  }
                </p>
              </div>
              <XCircleIcon className="w-12 h-12 text-purple-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Problems by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="reported" fill="#3B82F6" name="Reported" />
                <Bar dataKey="approved" fill="#10B981" name="Approved" />
                <Bar dataKey="resolved" fill="#8B5CF6" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Distribution by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name.toLowerCase()] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Details Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Category-wise Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Reported</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Approved</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Resolved</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Approval Rate</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Resolution Rate</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {getCategoryLabel(item.category)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.problemsReported}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.problemsApproved}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.problemsResolved}</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">{item.approvalRate}%</td>
                    <td className="px-6 py-4 text-sm font-medium text-purple-600">{item.resolutionRate}%</td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{item.percentageOfTotal}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
          <h3 className="font-bold text-purple-900 mb-2">About This Dashboard:</h3>
          <ul className="space-y-2 text-sm text-purple-800">
            <li>• All data is completely anonymized - no student information is displayed</li>
            <li>• Charts show aggregated problem statistics by category</li>
            <li>• Approval rate = (Problems Approved / Problems Reported) × 100</li>
            <li>• Resolution rate = (Problems Resolved / Problems Reported) × 100</li>
            <li>• This dashboard helps identify priority areas for improvement</li>
            <li>• Use category insights to direct resources and action plans</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CategoryHeatmap;
