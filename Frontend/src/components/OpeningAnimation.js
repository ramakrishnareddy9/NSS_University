import React, { useEffect, useRef, useState } from 'react';
import anime from 'animejs/lib/anime.es.js';

const OpeningAnimation = ({ onComplete }) => {
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Play opening sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Autoplay might be blocked, that's okay
    });

    // Timeline for the entire animation sequence
    const timeline = anime.timeline({
      easing: 'easeOutExpo',
      duration: 1000,
      complete: () => {
        // Wait a bit before fading out
        setTimeout(() => {
          anime({
            targets: containerRef.current,
            opacity: [1, 0],
            duration: 800,
            easing: 'easeInOutQuad',
            complete: () => {
              setIsVisible(false);
              if (onComplete) onComplete();
            }
          });
        }, 500);
      }
    });

    // Particle burst animation
    const particleCount = 30;
    const particles = [];
    const particleContainer = document.querySelector('.particles-container');
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particleContainer.appendChild(particle);
      particles.push(particle);
    }

    // Logo scale and rotation entrance
    timeline.add({
      targets: logoRef.current,
      scale: [0, 1],
      rotate: [180, 0],
      opacity: [0, 1],
      duration: 1200,
      easing: 'easeOutElastic(1, .8)'
    }, 0);

    // Particle burst from center
    timeline.add({
      targets: particles,
      translateX: () => anime.random(-300, 300),
      translateY: () => anime.random(-300, 300),
      scale: [0, anime.random(0.5, 1.5)],
      opacity: [1, 0],
      duration: 1500,
      delay: anime.stagger(20),
      easing: 'easeOutExpo'
    }, 400);

    // Text reveal animation
    timeline.add({
      targets: '.app-title .letter',
      translateY: [100, 0],
      opacity: [0, 1],
      duration: 800,
      delay: anime.stagger(50),
      easing: 'easeOutExpo'
    }, 600);

    // Subtitle fade in
    timeline.add({
      targets: '.app-subtitle',
      translateY: [30, 0],
      opacity: [0, 1],
      duration: 800,
      easing: 'easeOutQuad'
    }, 1000);

    // Ripple effect
    timeline.add({
      targets: '.ripple',
      scale: [0, 3],
      opacity: [0.6, 0],
      duration: 1500,
      easing: 'easeOutExpo'
    }, 800);

    // Cleanup
    return () => {
      particles.forEach(p => p.remove());
    };
  }, [onComplete]);

  if (!isVisible) return null;

  const title = "NSS PORTAL";
  const letters = title.split('').map((letter, index) => (
    <span key={index} className="letter inline-block">
      {letter === ' ' ? '\u00A0' : letter}
    </span>
  ));

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-orange-500 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 overflow-hidden"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
      </div>

      {/* Particles container */}
      <div className="particles-container absolute inset-0 flex items-center justify-center"></div>

      {/* Ripple effects */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="ripple absolute w-32 h-32 rounded-full border-4 border-white opacity-0"></div>
        <div className="ripple absolute w-32 h-32 rounded-full border-4 border-orange-300 opacity-0" style={{ animationDelay: '0.3s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center">
        {/* Logo */}
        <div ref={logoRef} className="mb-8 opacity-0">
          <div className="w-32 h-32 mx-auto bg-white dark:bg-gray-800 rounded-full shadow-2xl flex items-center justify-center transform">
            <img 
              src="/logo-ueac.png" 
              alt="NSS Logo" 
              className="w-24 h-24 object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="app-title text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-wider">
          {letters}
        </h1>

        {/* Subtitle */}
        <p className="app-subtitle text-xl md:text-2xl text-white/90 font-medium opacity-0">
          National Service Scheme
        </p>

        {/* Loading indicator */}
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>

      <style>{`
        .particle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 3s infinite;
        }

        .letter {
          display: inline-block;
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default OpeningAnimation;
