import { useEffect, useRef } from 'react';
import animations from '../utils/animations';

// Hook for fade in animation on mount
export const useFadeIn = (delay = 0) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      animations.fadeIn(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

// Hook for fade in from left
export const useFadeInLeft = (delay = 0) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      animations.fadeInLeft(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

// Hook for fade in from right
export const useFadeInRight = (delay = 0) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      animations.fadeInRight(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

// Hook for scale in animation
export const useScaleIn = (delay = 0) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      animations.scaleIn(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

// Hook for slide in from bottom
export const useSlideInBottom = (delay = 0) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      animations.slideInBottom(ref.current, delay);
    }
  }, [delay]);

  return ref;
};

// Hook for stagger animation on children
export const useStaggerFadeIn = (staggerDelay = 100) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      const children = ref.current.children;
      animations.staggerFadeIn(children, staggerDelay);
    }
  }, [staggerDelay]);

  return ref;
};

// Hook for scroll reveal animation
export const useScrollReveal = () => {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current; // Copy ref to variable for cleanup
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animations.scrollReveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  return ref;
};

// Hook for page transition
export const usePageTransition = () => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      animations.pageTransition(ref.current);
    }
  }, []);

  return ref;
};

// Hook for counter animation
export const useCounterAnimation = (start, end, duration = 2000) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      animations.animateCounter(ref.current, start, end, duration);
    }
  }, [start, end, duration]);

  return ref;
};

const animationHooks = {
  useFadeIn,
  useFadeInLeft,
  useFadeInRight,
  useScaleIn,
  useSlideInBottom,
  useStaggerFadeIn,
  useScrollReveal,
  usePageTransition,
  useCounterAnimation
};

export default animationHooks;
