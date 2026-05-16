import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import anime from 'animejs/lib/anime.es.js';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const InviteUser = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const titleRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    anime({
      targets: titleRef.current,
      translateY: [-20, 0],
      opacity: [0, 1],
      duration: 700,
      easing: 'easeOutQuad'
    });

    anime({
      targets: formRef.current,
      translateY: [30, 0],
      opacity: [0, 1],
      duration: 600,
      delay: 100,
      easing: 'easeOutQuad'
    });
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await api.post('/admin/invite', data);
      toast.success(response.data?.message || 'Invite sent successfully');
      navigate('/admin/dashboard');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send invite';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 dark:border-gray-700/50 p-6 sm:p-8">
        <div ref={titleRef} style={{ opacity: 0 }}>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Invite Faculty or Admin</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Create an account and send credentials to an institutional email address.</p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5" style={{ opacity: 0 }}>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
            <input
              {...register('name', { required: 'Name is required' })}
              type="text"
              className="mt-1 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
            <input
              {...register('email', { required: 'Email is required' })}
              type="email"
              className="mt-1 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Role</label>
            <select
              {...register('role', { required: 'Role is required' })}
              className="mt-1 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select role</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Phone</label>
            <input
              {...register('phone')}
              type="tel"
              className="mt-1 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Department</label>
            <input
              {...register('department')}
              type="text"
              className="mt-1 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-60"
            >
              {loading ? 'Sending invite...' : 'Send Invite'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="inline-flex items-center justify-center rounded-xl border-2 border-gray-300 dark:border-gray-700 px-5 py-3 font-semibold text-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteUser;
