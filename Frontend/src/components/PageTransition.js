import React, { useEffect, useRef } from 'react';
import anime from 'animejs/lib/anime.es.js';

const PageTransition = ({ children }) => {
  const pageRef = useRef(null);

  useEffect(() => {
    if (pageRef.current) {
      // Page entrance animation
      anime({
        targets: pageRef.current,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
        easing: 'easeOutQuad'
      });
    }
  }, []);

  return (
    <div ref={pageRef} style={{ opacity: 0 }}>
      {children}
    </div>
  );
};

export default PageTransition;
