import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import anime from 'animejs/lib/anime.es.js';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, getValues, setValue } = useForm();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: OTP & New Password
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [otpSent, setOtpSent] = useState(false);
  const formRef = useRef(null);
  const logoRef = useRef(null);
  const otpInputRef1 = useRef(null);
  const otpInputRef2 = useRef(null);
  const otpInputRef3 = useRef(null);
  const otpInputRef4 = useRef(null);
  const otpInputRef5 = useRef(null);
  const otpInputRef6 = useRef(null);
  const timerRef = useRef(null);

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

  // Auto-focus first OTP box when step changes to 2
  useEffect(() => {
    if (step === 2 && otpInputRef1.current) {
      // Small delay to ensure the field is rendered
      setTimeout(() => {
        otpInputRef1.current.focus();
      }, 100);
    }
  }, [step]);

  // Countdown timer effect
  useEffect(() => {
    if (otpSent && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      toast.error('OTP has expired! Please request a new one.');
      setStep(1);
      setOtpSent(false);
      setTimeLeft(600);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [otpSent, timeLeft]);

  // Handle OTP digit input
  const otpInputRefs = [otpInputRef1, otpInputRef2, otpInputRef3, otpInputRef4, otpInputRef5, otpInputRef6];

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value;
    setOtpDigits(newOtpDigits);

    // Auto-focus next box
    if (value && index < 5) {
      otpInputRefs[index + 1].current?.focus();
    }

    // Set the complete OTP value for form validation
    const completeOtp = newOtpDigits.join('');
    setValue('otp', completeOtp);
  };

  // Handle backspace key
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onSubmitEmail = async (data) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', data);
      
      if (response.data.success) {
        setEmail(data.email);
        setStep(2);
        setOtpSent(true);
        setTimeLeft(600); // Reset timer to 10 minutes
        setOtpDigits(['', '', '', '', '', '']); // Clear OTP digits
        toast.success('OTP has been sent to your email!');
      } else {
        toast.error(response.data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitOTP = async (data) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        email: email,
        otp: data.otp,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      });
      
      if (response.data.success) {
        toast.success('Password has been reset successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(response.data.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
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
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h2>
          <p className="mt-2 sm:mt-3 text-center text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium">
            {step === 1 ? 'Enter your email to receive an OTP' : 'Enter OTP and your new password'}
          </p>
          <p className="mt-1.5 sm:mt-2 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-orange-500 underline-offset-4 hover:underline transition-all duration-300">
              Back to login
            </Link>
          </p>
        </div>

        {step === 1 ? (
          <form className="mt-4 sm:mt-6 space-y-4 sm:space-y-5" onSubmit={handleSubmit(onSubmitEmail)}>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Email address
                </label>
                <input
                  {...register('email', { 
                    required: 'Email is required', 
                    pattern: { 
                      value: /^\S+@\S+$/i, 
                      message: 'Invalid email format' 
                    } 
                  })}
                  type="email"
                  className="appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white rounded-lg sm:rounded-xl placeholder-gray-400 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-blue-400/30 focus:border-blue-400 hover:border-white/70 transition-all duration-300 shadow-sm"
                  placeholder="Enter your registered email"
                  disabled={loading}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="flex items-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send OTP
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-4 sm:mt-6 space-y-4 sm:space-y-5" onSubmit={handleSubmit(onSubmitOTP)}>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-gray-100 rounded-lg sm:rounded-xl text-sm sm:text-base text-gray-600 focus:outline-none transition-all duration-300 shadow-sm"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1 ml-1">Email is pre-filled from previous step</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    OTP Code
                  </label>
                  <div className="text-sm font-semibold text-red-600">
                    {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : 'OTP Expired!'}
                  </div>
                </div>
                
                <div className="flex gap-2 justify-center mb-4">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      ref={otpInputRefs[index]}
                      className="w-12 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
                      placeholder="-"
                      disabled={loading || timeLeft === 0}
                    />
                  ))}
                </div>
                
                {/* Hidden input for form validation */}
                <input
                  type="hidden"
                  {...register('otp', { 
                    required: 'OTP is required', 
                    pattern: { 
                      value: /^\d{6}$/, 
                      message: 'OTP must be 6 digits' 
                    } 
                  })}
                />
                {errors.otp && <p className="text-red-500 text-xs mt-1 ml-1">{errors.otp.message}</p>}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  New Password
                </label>
                <input
                  {...register('newPassword', { 
                    required: 'New password is required', 
                    minLength: { 
                      value: 6, 
                      message: 'Password must be at least 6 characters' 
                    } 
                  })}
                  type="password"
                  className="appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white rounded-lg sm:rounded-xl placeholder-gray-400 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-blue-400/30 focus:border-blue-400 hover:border-white/70 transition-all duration-300 shadow-sm"
                  placeholder="Enter new password"
                  disabled={loading}
                />
                {errors.newPassword && <p className="text-red-500 text-xs mt-1 ml-1">{errors.newPassword.message}</p>}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Confirm New Password
                </label>
                <input
                  {...register('confirmPassword', { 
                    required: 'Please confirm your password',
                    validate: (value) => value === getValues('newPassword') || 'Passwords do not match'
                  })}
                  type="password"
                  className="appearance-none relative block w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-white/50 bg-white rounded-lg sm:rounded-xl placeholder-gray-400 text-sm sm:text-base text-gray-900 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-blue-400/30 focus:border-blue-400 hover:border-white/70 transition-all duration-300 shadow-sm"
                  placeholder="Confirm new password"
                  disabled={loading}
                />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 ml-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="flex items-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset Password
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        )}
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
            <strong>Note:</strong> {step === 1 ? 'OTP will be sent to your registered email address and expires in 10 minutes.' : 'Enter OTP before it expires. OTP will be automatically deleted from database after 10 minutes.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
