import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import anime from 'animejs/lib/anime.es.js';

const VerifyEmail = () => {
  const { verifyEmail } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const formRef = useRef(null);
  const logoRef = useRef(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const initialEmail = location.state?.email || localStorage.getItem('pendingVerificationEmail') || '';
    setEmail(initialEmail);
  }, [location.state]);

  useEffect(() => {
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
    const result = await verifyEmail(email, data.otp);
    if (result.success) {
      const user = result.data?.user || JSON.parse(localStorage.getItem('user') || '{}');
      const role = user.role || 'student';
      navigate(`/${role}/dashboard`);
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
      <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 via-blue-600/20 to-orange-500/20"></div>

      <div ref={formRef} className="max-w-md w-full space-y-4 sm:space-y-6 bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl p-6 sm:p-8 md:p-10 rounded-2xl shadow-2xl border border-white/50 dark:border-gray-600/50 relative z-10 transition-colors duration-300" style={{ opacity: 0 }}>
        <div className="flex justify-center">
          <div ref={logoRef} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center transform hover:scale-110 transition-transform duration-300" style={{ opacity: 0 }}>
            <img src="/logo-ueac.png" alt="NSS Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        <div>
          <h2 className="mt-3 sm:mt-4 text-center text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Verify your email
          </h2>
          <p className="mt-2 sm:mt-3 text-center text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium">
            Enter the OTP sent to your institutional email address
          </p>
          <p className="mt-1.5 sm:mt-2 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Not registered yet?{' '}
            <Link to="/register" className="font-semibold text-green-600 hover:text-blue-600 underline-offset-4 hover:underline transition-all duration-300">
              Create an account
            </Link>
          </p>
        </div>

        <form className="mt-4 sm:mt-6 space-y-4 sm:space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white rounded-lg sm:rounded-xl placeholder-gray-400 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-green-400/30 focus:border-green-400 hover:border-white/70 transition-all duration-300 shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">OTP</label>
              <input
                {...register('otp', { required: 'OTP is required', pattern: { value: /^\d{6}$/, message: 'OTP must be 6 digits' } })}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                className="appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white rounded-lg sm:rounded-xl placeholder-gray-400 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-green-400/30 focus:border-green-400 hover:border-white/70 transition-all duration-300 shadow-sm tracking-[0.35em] text-center"
              />
              {errors.otp && <p className="text-red-500 text-xs mt-1 ml-1">{errors.otp.message}</p>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-green-400/30"
            >
              Verify and Continue
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-green-50/80 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
          <p className="text-xs text-green-700 dark:text-green-300 text-center">
            Your account remains inactive until the OTP is verified.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
