import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import anime from 'animejs/lib/anime.es.js';

const Register = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const formRef = useRef(null);
  const logoRef = useRef(null);

  useEffect(() => {
    // Animate form on mount
    anime({
      targets: logoRef.current,
      scale: [0, 1],
      rotate: [180, 0],
      opacity: [0, 1],
      duration: 800,
      easing: 'easeOutElastic(1, .8)'
    });

    anime({
      targets: formRef.current,
      translateY: [50, 0],
      opacity: [0, 1],
      duration: 600,
      delay: 200,
      easing: 'easeOutQuad'
    });
  }, []);

  const role = watch('role');

  const onSubmit = async (data) => {
    const result = await registerUser(data);
    if (result.success) {
      // Wait a bit for user to be set in context
      setTimeout(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userRole = user.role || data.role || 'student';
        navigate(`/${userRole}/dashboard`);
      }, 100);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Animated overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-blue-600/20 to-orange-500/20"></div>
      
      <div ref={formRef} className="max-w-md w-full space-y-4 sm:space-y-6 bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl border border-white/50 dark:border-gray-600/50 relative z-10 transition-colors duration-300" style={{opacity: 0}}>
        {/* Logo */}
        <div className="flex justify-center">
          <div ref={logoRef} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center transform hover:scale-110 transition-transform duration-300" style={{opacity: 0}}>
            <img 
              src="/logo-ueac.png" 
              alt="NSS Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        
        <div>
          <h2 className="mt-3 sm:mt-4 text-center text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Create your account
          </h2>
          <p className="mt-2 sm:mt-3 text-center text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium">
            Join the NSS Community
          </p>
          <p className="mt-1.5 sm:mt-2 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-green-600 hover:text-blue-600 underline-offset-4 hover:underline transition-all duration-300">
              Sign in here
            </Link>
          </p>
        </div>
        <form className="mt-4 sm:mt-6 space-y-4 sm:space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Full Name
              </label>
              <input
                {...register('name', { required: 'Name is required' })}
                type="text"
                placeholder="Enter your full name"
                className="mt-1 appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white placeholder-gray-400 text-sm sm:text-base text-gray-900 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-green-400/30 focus:border-green-400 hover:border-white/70 transition-all duration-300 shadow-sm"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Email
              </label>
              <input
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })}
                type="email"
                placeholder="Enter your email"
                className="mt-1 appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white placeholder-gray-400 text-sm sm:text-base text-gray-900 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-green-400/30 focus:border-green-400 hover:border-white/70 transition-all duration-300 shadow-sm"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Password
              </label>
              <input
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                type="password"
                placeholder="Enter your password"
                className="mt-1 appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white placeholder-gray-400 text-sm sm:text-base text-gray-900 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-green-400/30 focus:border-green-400 hover:border-white/70 transition-all duration-300 shadow-sm"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Role
              </label>
              <select
                {...register('role', { required: 'Role is required' })}
                className="mt-1 block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white text-sm sm:text-base rounded-lg sm:rounded-xl shadow-sm focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-green-400/30 focus:border-green-400 hover:border-white/70 transition-all duration-300"
              >
                <option value="">Select role</option>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </select>
              {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
            </div>

            {role === 'student' && (
              <>
                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                    Student ID
                  </label>
                  <input
                    {...register('studentId', { required: 'Student ID is required' })}
                    type="text"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                  {errors.studentId && <p className="text-red-500 text-xs mt-1">{errors.studentId.message}</p>}
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <input
                    {...register('department')}
                    type="text"
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                    Year
                  </label>
                  <select
                    {...register('year')}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="1st">1st Year</option>
                    <option value="2nd">2nd Year</option>
                    <option value="3rd">3rd Year</option>
                    <option value="4th">4th Year</option>
                    <option value="PG">PG</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone (Optional)
              </label>
              <input
                {...register('phone')}
                type="tel"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-green-400/30"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create Account
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;

