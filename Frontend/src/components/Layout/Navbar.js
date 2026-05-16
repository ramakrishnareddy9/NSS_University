import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import anime from 'animejs/lib/anime.es.js';
import {
  HomeIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);
  const logoRef = useRef(null);

  // Animate navbar on mount
  useEffect(() => {
 
    if (navRef.current) {
      navRef.current.style.opacity = '0';
      
      anime({
        targets: navRef.current,
        translateY: [-50, 0],
        opacity: [0, 1],
        duration: 600,
        easing: 'easeOutExpo'
      });
    }

    if (logoRef.current) {
      logoRef.current.style.opacity = '0';
      
      anime({
        targets: logoRef.current,
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 600,
        delay: 100,
        easing: 'easeOutQuad'
      });
    }

    // Animate nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.style.opacity = '0';
    });
    
    anime({
      targets: '.nav-link',
      translateX: [-20, 0],
      opacity: [0, 1],
      delay: anime.stagger(60, {start: 200}),
      duration: 400,
      easing: 'easeOutQuad'
    });
  }, []);

  // Add hover animation to nav links
  const handleNavLinkHover = (e) => {
    anime({
      targets: e.currentTarget,
      scale: 1.05,
      duration: 200,
      easing: 'easeOutQuad'
    });
  };

  const handleNavLinkLeave = (e) => {
    anime({
      targets: e.currentTarget,
      scale: 1,
      duration: 200,
      easing: 'easeOutQuad'
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  const getNavLinks = () => {
    if (user?.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: HomeIcon },
        { path: '/admin/events', label: 'Events', icon: CalendarIcon },
        { path: '/admin/problems', label: 'Problems', icon: ExclamationTriangleIcon },
        { path: '/admin/participations', label: 'Participations', icon: UserIcon },
        { path: '/admin/reports', label: 'Reports', icon: ChartBarIcon },
        { path: '/admin/period-config', label: 'Period Config', icon: ClockIcon },
        { path: '/leaderboard', label: 'Leaderboard', icon: TrophyIcon },
      ];
    } else if (user?.role === 'faculty') {
      return [
        { path: '/faculty/dashboard', label: 'Dashboard', icon: HomeIcon },
        { path: '/admin/events', label: 'Events', icon: CalendarIcon },
        { path: '/admin/problems', label: 'Problems', icon: ExclamationTriangleIcon },
        { path: '/admin/participations', label: 'Participations', icon: UserIcon },
        { path: '/leaderboard', label: 'Leaderboard', icon: TrophyIcon },
      ];
    } else {
      return [
        { path: '/student/dashboard', label: 'Dashboard', icon: HomeIcon },
        { path: '/student/events', label: 'Events', icon: CalendarIcon },
        { path: '/student/report-problem', label: 'Report Problem', icon: ExclamationTriangleIcon },
        { path: '/student/my-problem-reports', label: 'My Reports', icon: DocumentTextIcon },
        { path: '/student/profile', label: 'Profile', icon: UserIcon },
        { path: '/leaderboard', label: 'Leaderboard', icon: TrophyIcon },
      ];
    }
  };

  return (
    <nav ref={navRef} className="bg-white shadow-lg border-b-2 border-gradient-to-r from-primary-500 to-secondary-500 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 ref={logoRef} className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-400 bg-clip-text text-transparent hover:scale-110 transition-transform duration-300 cursor-pointer">
                NSS Portal
              </h1>
            </div>
            
            {/* Desktop Navigation - Scrollable if needed */}
            <div className="hidden md:ml-6 md:flex md:items-center md:gap-1 overflow-x-auto scrollbar-hide max-w-3xl">
              {getNavLinks().map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="nav-link inline-flex items-center px-3 py-2 rounded-xl text-xs lg:text-sm font-semibold text-gray-700 hover:text-primary-600 hover:bg-gradient-to-r hover:from-primary-50 hover:to-secondary-50 transition-all duration-300 relative group shadow-sm hover:shadow-md whitespace-nowrap flex-shrink-0"
                    onMouseEnter={handleNavLinkHover}
                    onMouseLeave={handleNavLinkLeave}
                  >
                    <Icon className="h-4 w-4 lg:h-5 lg:w-5 mr-1.5 group-hover:scale-110 transition-transform duration-300" />
                    <span className="hidden lg:inline">{link.label}</span>
                    <span className="lg:hidden">{link.label.split(' ')[0]}</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side - Desktop */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            {user?.role === 'student' && (
              <div className="relative">
                <NotificationBell />
              </div>
            )}
            <span className="text-sm text-gray-600 font-medium px-3 py-1.5 bg-gray-50 rounded-lg whitespace-nowrap">
              {user?.name} <span className="text-xs text-gray-400">({user?.role})</span>
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden space-x-2">
            {user?.role === 'student' && (
              <div className="relative">
                <NotificationBell />
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 animate-slideDown">
            <div className="space-y-1">
              {getNavLinks().map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3 text-base font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50/50 rounded-lg transition-all"
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {link.label}
                  </Link>
                );
              })}
              
              {/* Mobile user info and logout */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="px-4 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
                  <div className="font-medium">{user?.name}</div>
                  <div className="text-xs text-gray-400">{user?.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-3 text-base font-medium rounded-lg text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

