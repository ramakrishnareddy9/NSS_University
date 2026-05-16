import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon as SearchIcon,
  GlobeAltIcon as GlobeIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import ImageSlider from '../components/ImageSlider';
import api from '../utils/api';
import '../styles/landing-optimized.css';

const Landing = () => {
  const navigate = useNavigate();
  
  // Animation refs - Disabled for desktop to improve performance
  const heroRef = null; // useFadeIn(200);
  const statsRef = null; // useStaggerFadeIn(150);
  const featuresRef = null; // useScrollReveal();
  const ctaRef = null; // useSlideInBottom(300);
  
  // Counter animation state
  const [counters, setCounters] = useState({
    volunteers: 0,
    events: 0,
    institutions: 0,
    hours: 0
  });

  const [stats, setStats] = useState({
    volunteers: 0,
    events: 0,
    institutions: 0,
    hours: 0
  });

  // Fetch real statistics from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/stats/landing');
        const data = response.data;
        setStats({
          volunteers: data.totalStudents || 0,
          events: data.totalEvents || 0,
          institutions: data.totalInstitutions || 1,
          hours: data.totalHours || 0
        });
      } catch (error) {
        console.error('Error fetching statistics:', error);
        // Fallback to default values
        setStats({
          volunteers: 10000,
          events: 500,
          institutions: 100,
          hours: 50000
        });
      }
    };

    fetchStats();
  }, []);

  // Smooth counter animation
  useEffect(() => {
    if (stats.volunteers === 0) {
      setCounters(stats);
      return;
    }

    let animationFrame;
    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuad = progress * (2 - progress);

      setCounters({
        volunteers: Math.floor(stats.volunteers * easeOutQuad),
        events: Math.floor(stats.events * easeOutQuad),
        institutions: Math.floor(stats.institutions * easeOutQuad),
        hours: Math.floor(stats.hours * easeOutQuad)
      });

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCounters(stats);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [stats]);

  // Memoized slider images to prevent unnecessary re-renders
  const sliderImages = useMemo(() => [
    {
      url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800',
      alt: 'NSS Volunteers helping community',
      caption: 'Community Service',
      description: 'NSS volunteers making a difference in society'
    },
    {
      url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800',
      alt: 'Tree Plantation Drive',
      caption: 'Environmental Conservation',
      description: 'Green initiatives and tree plantation programs'
    },
    {
      url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
      alt: 'Educational Workshop',
      caption: 'Educational Programs',
      description: 'Literacy and awareness campaigns'
    },
    {
      url: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800',
      alt: 'Health Camp',
      caption: 'Health & Wellness',
      description: 'Medical camps and health awareness drives'
    },
    {
      url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800',
      alt: 'Cultural Event',
      caption: 'Cultural Activities',
      description: 'Celebrating diversity through cultural programs'
    }
  ], []);

  // Memoized navigation handlers
  const handleRegister = useCallback(() => navigate('/register'), [navigate]);
  const handleLogin = useCallback(() => navigate('/login'), [navigate]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header Section */}
      <header className="bg-white shadow-md border-b-4 border-orange-500">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left Section - Government Logos */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-16 w-16 flex items-center justify-center">
                  <img 
                    src="/logo-ueac.png" 
                    alt="UEAC Logo" 
                    className="h-16 w-16 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full items-center justify-center shadow-lg hidden">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 3.6v8.55c0 4.44-3.07 8.61-7 9.67-3.93-1.06-7-5.23-7-9.67V7.78l6-2.7v13.92h2V4.18z"/>
                    </svg>
                  </div>
                </div>
                <div className="border-l-2 border-gray-300 pl-3">
                  <h2 className="text-xs font-semibold text-orange-600">Vignan's University Extension Activites Council</h2>
                  <p className="text-xs text-gray-700">National Service Scheme</p>
                  <p className="text-xs text-gray-600">युवा मामलों और खेल मंत्रालय</p>
                </div>
              </div>
            </div>

            {/* Right Section - Social Media & Search (Hidden on Mobile) */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-600 cursor-pointer hover:text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <svg className="w-5 h-5 text-blue-400 cursor-pointer hover:text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <svg className="w-5 h-5 text-pink-600 cursor-pointer hover:text-pink-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                </svg>
                <svg className="w-5 h-5 text-red-600 cursor-pointer hover:text-red-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <GlobeIcon className="w-5 h-5" />
                <SearchIcon className="w-5 h-5" />
              </div>
              <div className="text-sm text-gray-700 font-semibold">हिंदी</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:container lg:mx-auto py-8 sm:py-12">
        {/* Hero Section */}
        <div ref={heroRef} className="flex flex-col lg:flex-row items-center justify-between gap-12 mb-16">
          {/* Left Content */}
          <div className="flex-1 space-y-6">
            <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
              National Service Scheme Portal
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Welcome to
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-600">
                NSS Portal
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed">
              Join the National Service Scheme and contribute to nation-building through community service. 
              Register now to participate in events, submit reports, and earn certificates.
            </p>

            {/* CTA Buttons */}
            <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={handleRegister}
                className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm sm:text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span>Sign Up</span>
                <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
              
              <button
                onClick={handleLogin}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 text-sm sm:text-base font-semibold rounded-lg border-2 border-blue-600 shadow-md hover:bg-blue-50 transition-colors duration-200 w-full sm:w-auto"
              >
                Login
              </button>
            </div>
          </div>

          {/* Right Content - Image Slider */}
          <div className="flex-1">
            <ImageSlider images={sliderImages} autoPlayInterval={4000} />
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-blue-500">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Event Management</h3>
            <p className="text-sm sm:text-base text-gray-600">
              Browse and register for NSS events, camps, and community service activities.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-orange-500">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Report Submission</h3>
            <p className="text-sm sm:text-base text-gray-600">
              Submit and track your activity reports with AI-powered insights and feedback.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-green-500">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Digital Certificates</h3>
            <p className="text-sm sm:text-base text-gray-600">
              Receive and download verified certificates for your participation and achievements.
            </p>
          </div>
        </div>

        {/* UEAC Logo Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-4 lg:p-6 border-2 border-blue-100">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-orange-400 rounded-2xl blur-xl opacity-20"></div>
                <div className="relative bg-gradient-to-br from-blue-50 to-orange-50 rounded-2xl p-8 border-4 border-blue-600 shadow-2xl w-56 h-56 flex items-center justify-center">
                  <img 
                    src="/logo-ueac.png" 
                    alt="UEAC Logo" 
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl items-center justify-center shadow-xl hidden">
                    <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 3.6v8.55c0 4.44-3.07 8.61-7 9.67-3.93-1.06-7-5.23-7-9.67V7.78l6-2.7v13.92h2V4.18z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center lg:text-left space-y-3">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-600">
                UNIVERSITY EXTENSION ACTIVITY COUNCIL
              </h2>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 font-semibold">
                విశ్వవిద్యాలయ విస్తరణ కార్యకలాపాల మండలి
              </p>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium">
                विश्वविद्यालय विस्तार गतिविधि परिषद
              </p>
              <p className="text-sm sm:text-base text-gray-500 mt-4 max-w-2xl">
                Coordinating and promoting extension activities across universities to foster community engagement and social responsibility.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Section - Dynamic Animated */}
        <div ref={featuresRef} className="mt-8 sm:mt-12 lg:mt-16 bg-white rounded-2xl p-4 sm:p-6 lg:p-12 shadow-2xl relative overflow-hidden border-2 border-blue-100">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50 opacity-50"></div>
          
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-4 sm:mb-6 lg:mb-8 bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              Our Impact in Numbers
            </h2>
            
            <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 text-center">
              {/* Active Volunteers */}
              <div className="stat-card stat-card-blue">
                <div className="flex items-center justify-center mb-1 sm:mb-2">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-1 sm:mb-2 text-blue-600">
                  {counters.volunteers.toLocaleString()}+
                </div>
                <div className="text-blue-700 text-xs sm:text-sm lg:text-base font-medium">Active Volunteers</div>
                <div className="mt-1 sm:mt-2 h-0.5 sm:h-1 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full animate-progress" style={{width: '100%'}}></div>
                </div>
              </div>

              {/* Events Conducted */}
              <div className="stat-card stat-card-green">
                <div className="flex items-center justify-center mb-1 sm:mb-2">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                  </svg>
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-1 sm:mb-2 text-green-600">
                  {counters.events.toLocaleString()}+
                </div>
                <div className="text-green-700 text-xs sm:text-sm lg:text-base font-medium">Events Conducted</div>
                <div className="mt-1 sm:mt-2 h-0.5 sm:h-1 bg-green-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full animate-progress" style={{width: '100%'}}></div>
                </div>
              </div>

              {/* Institutions */}
              <div className="stat-card stat-card-orange">
                <div className="flex items-center justify-center mb-1 sm:mb-2">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
                  </svg>
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-1 sm:mb-2 text-orange-600">
                  {counters.institutions.toLocaleString()}+
                </div>
                <div className="text-orange-700 text-xs sm:text-sm lg:text-base font-medium">Institutions</div>
                <div className="mt-1 sm:mt-2 h-0.5 sm:h-1 bg-orange-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-600 rounded-full animate-progress" style={{width: '100%'}}></div>
                </div>
              </div>

              {/* Hours of Service */}
              <div className="stat-card stat-card-purple">
                <div className="flex items-center justify-center mb-1 sm:mb-2">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-1 sm:mb-2 text-purple-600">
                  {counters.hours.toLocaleString()}+
                </div>
                <div className="text-purple-700 text-xs sm:text-sm lg:text-base font-medium">Hours of Service</div>
                <div className="mt-1 sm:mt-2 h-0.5 sm:h-1 bg-purple-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full animate-progress" style={{width: '100%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black shadow-md border-t-4 border-orange-500 mt-8 sm:mt-12 lg:mt-16 py-6 sm:py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-start">
            {/* Left - Logo */}
            <div className="flex justify-center md:justify-start">
              <img 
                src="/logo-ueac1.png" 
                alt="UEAC Logo" 
                className="h-320 w-320 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            
            {/* Center - Contact Information */}
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">Contact Us</h3>
              
              <div className="text-white space-y-2">
                <p className="text-sm leading-relaxed">
                  Vignan's Foundation for Science, Technology and Research<br />
                  (Deemed to be University), Vadlamudi, Guntur-522213
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-3">
                  <a href="mailto:info@vignan.ac.in" className="text-sm hover:text-orange-400 transition-colors">
                    info@vignan.ac.in
                  </a>
                  <a href="tel:08632344700" className="text-sm hover:text-orange-400 transition-colors">
                    0863-2344700 / 701
                  </a>
                </div>
              </div>
              
              {/* Social Media Icons */}
              <div className="flex justify-center gap-6 mt-4">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-400 transition-colors" aria-label="LinkedIn">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-400 transition-colors" aria-label="Facebook">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-400 transition-colors" aria-label="Instagram">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-400 transition-colors" aria-label="YouTube">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Right - Copyright */}
            <div className="text-center md:text-right space-y-2">
              <p className="text-sm text-white">
                © 2025 VUEAC. All rights reserved.
              </p>
              <p className="text-xs text-gray-400">
                University Extension Activites Council
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
