import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const VibrantPageLayout = ({ 
  children, 
  backgroundImage, 
  title, 
  subtitle,
  showCounters = true,
  showBlog = true,
  counters = null
}) => {
  const navigate = useNavigate();
  const [animatedCounters, setAnimatedCounters] = useState({
    volunteers: 0,
    camps: 0,
    hours: 0,
    impact: 0
  });

  // Default counters if not provided
  const defaultCounters = {
    volunteers: { value: 500, label: 'Active Volunteers', icon: '👥' },
    camps: { value: 200, label: 'Camps Organized', icon: '⛺' },
    hours: { value: 10000, label: 'Service Hours', icon: '⏰' },
    impact: { value: 50, label: 'Communities Impacted', icon: '🌍' }
  };

  const displayCounters = counters || defaultCounters;

  // Animate counters
  useEffect(() => {
    if (!showCounters) return;

    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedCounters({
        volunteers: Math.floor(displayCounters.volunteers.value * progress),
        camps: Math.floor(displayCounters.camps.value * progress),
        hours: Math.floor(displayCounters.hours.value * progress),
        impact: Math.floor(displayCounters.impact.value * progress)
      });

      if (currentStep >= steps) {
        setAnimatedCounters({
          volunteers: displayCounters.volunteers.value,
          camps: displayCounters.camps.value,
          hours: displayCounters.hours.value,
          impact: displayCounters.impact.value
        });
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [showCounters, displayCounters]);

  // Sample blog/news data
  const recentActivities = [
    {
      id: 1,
      title: 'Tree Plantation Drive 2024',
      date: 'Nov 5, 2024',
      image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400',
      description: 'Successfully planted 500+ trees in collaboration with local communities.',
      category: 'Environment'
    },
    {
      id: 2,
      title: 'Cleanliness Campaign',
      date: 'Nov 3, 2024',
      image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400',
      description: 'Community cleanliness drive covering 10+ neighborhoods.',
      category: 'Sanitation'
    },
    {
      id: 3,
      title: 'Health Awareness Camp',
      date: 'Oct 28, 2024',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400',
      description: 'Free health checkups and awareness sessions for 200+ beneficiaries.',
      category: 'Health'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section with Background Image */}
      <div 
        className="relative h-64 md:h-80 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${backgroundImage || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200'})`,
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-4 animate-fade-in">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg md:text-xl text-center max-w-2xl animate-fade-in">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Animated Counters Section */}
      {showCounters && (
        <div className="relative -mt-16 z-10 px-4">
          <div className="container mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {Object.keys(displayCounters).map((key) => (
                  <div 
                    key={key}
                    className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-green-50 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="text-3xl md:text-4xl mb-2">
                      {displayCounters[key].icon}
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">
                      {animatedCounters[key].toLocaleString()}+
                    </div>
                    <div className="text-xs md:text-sm text-gray-600 font-medium">
                      {displayCounters[key].label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {children}
          </div>

          {/* Blog/News Sidebar */}
          {showBlog && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="mr-2">📰</span>
                  Recent Activities
                </h2>
                
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div 
                      key={activity.id}
                      className="group cursor-pointer hover:bg-gray-50 rounded-xl p-3 transition-all duration-300"
                    >
                      <div className="flex gap-3">
                        <img 
                          src={activity.image}
                          alt={activity.title}
                          className="w-20 h-20 rounded-lg object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="flex-1">
                          <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full mb-1">
                            {activity.category}
                          </span>
                          <h3 className="font-semibold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">
                            {activity.title}
                          </h3>
                          <p className="text-xs text-gray-500 mb-1">
                            {activity.date}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {activity.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => navigate('/student/events')}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
                >
                  View All Activities →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VibrantPageLayout;
