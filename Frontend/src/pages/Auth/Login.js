import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import anime from 'animejs/lib/anime.es.js';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const formRef = useRef(null);
  const logoRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

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

  const onSubmit = async (data) => {
    // Immediate ref-based guard to block rapid multi-click submissions.
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        // Wait a bit for user to be set in context
        setTimeout(() => {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const role = user.role || 'student';
          navigate(`/${role}/dashboard`);
        }, 100);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Animated overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-orange-500/20"></div>
      
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
          <h2 className="mt-3 sm:mt-4 text-center text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="mt-2 sm:mt-3 text-center text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium">
            Sign in to access your NSS Portal
          </p>
          <p className="mt-1.5 sm:mt-2 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            New here?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-orange-500 underline-offset-4 hover:underline transition-all duration-300">
              Create an account
            </Link>
          </p>
        </div>
        <form className="mt-4 sm:mt-6 space-y-4 sm:space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Email address
              </label>
              <input
                {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })}
                type="email"
                disabled={isSubmitting}
                className="appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white rounded-lg sm:rounded-xl placeholder-gray-400 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-blue-400/30 focus:border-blue-400 hover:border-white/70 transition-all duration-300 shadow-sm"
                placeholder="Enter your email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Password
              </label>
              <input
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                type="password"
                disabled={isSubmitting}
                className="appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white rounded-lg sm:rounded-xl placeholder-gray-400 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-blue-400/30 focus:border-blue-400 hover:border-white/70 transition-all duration-300 shadow-sm"
                placeholder="Enter your password"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password.message}</p>}
            </div>
          </div>

          <div className="flex justify-end">
            <Link 
              to="/forgot-password" 
              className="text-sm text-blue-600 hover:text-orange-500 font-medium transition-colors duration-300"
            >
              Forgot your password?
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-blue-400/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-orange-500 disabled:hover:shadow-lg disabled:hover:translate-y-0"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {isSubmitting ? 'Signing in...' : 'Sign in to your account'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

