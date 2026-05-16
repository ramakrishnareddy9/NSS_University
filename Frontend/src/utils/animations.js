import anime from 'animejs/lib/anime.es.js';

// Fade in animation for elements
export const fadeIn = (targets, delay = 0) => {
  return anime({
    targets,
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
    delay,
    easing: 'easeOutQuad'
  });
};

// Fade in from left
export const fadeInLeft = (targets, delay = 0) => {
  return anime({
    targets,
    opacity: [0, 1],
    translateX: [-50, 0],
    duration: 800,
    delay,
    easing: 'easeOutQuad'
  });
};

// Fade in from right
export const fadeInRight = (targets, delay = 0) => {
  return anime({
    targets,
    opacity: [0, 1],
    translateX: [50, 0],
    duration: 800,
    delay,
    easing: 'easeOutQuad'
  });
};

// Scale up animation
export const scaleIn = (targets, delay = 0) => {
  return anime({
    targets,
    scale: [0.8, 1],
    opacity: [0, 1],
    duration: 600,
    delay,
    easing: 'easeOutElastic(1, .8)'
  });
};

// Stagger animation for lists
export const staggerFadeIn = (targets, staggerDelay = 100) => {
  return anime({
    targets,
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
    delay: anime.stagger(staggerDelay),
    easing: 'easeOutQuad'
  });
};

// Card hover animation
export const cardHover = (target) => {
  return anime({
    targets: target,
    scale: 1.05,
    translateY: -10,
    duration: 300,
    easing: 'easeOutQuad'
  });
};

// Card hover reset
export const cardHoverReset = (target) => {
  return anime({
    targets: target,
    scale: 1,
    translateY: 0,
    duration: 300,
    easing: 'easeOutQuad'
  });
};

// Button click animation
export const buttonClick = (target) => {
  return anime({
    targets: target,
    scale: [1, 0.95, 1],
    duration: 300,
    easing: 'easeInOutQuad'
  });
};

// Rotate animation
export const rotate = (targets, delay = 0) => {
  return anime({
    targets,
    rotate: [0, 360],
    duration: 1000,
    delay,
    easing: 'easeInOutQuad'
  });
};

// Pulse animation
export const pulse = (targets) => {
  return anime({
    targets,
    scale: [1, 1.1, 1],
    duration: 1000,
    loop: true,
    easing: 'easeInOutQuad'
  });
};

// Bounce animation
export const bounce = (targets, delay = 0) => {
  return anime({
    targets,
    translateY: [
      { value: -20, duration: 400 },
      { value: 0, duration: 400 }
    ],
    delay,
    loop: true,
    easing: 'easeOutBounce'
  });
};

// Slide in from bottom
export const slideInBottom = (targets, delay = 0) => {
  return anime({
    targets,
    translateY: [100, 0],
    opacity: [0, 1],
    duration: 800,
    delay,
    easing: 'easeOutExpo'
  });
};

// Slide in from top
export const slideInTop = (targets, delay = 0) => {
  return anime({
    targets,
    translateY: [-100, 0],
    opacity: [0, 1],
    duration: 800,
    delay,
    easing: 'easeOutExpo'
  });
};

// Zoom in animation
export const zoomIn = (targets, delay = 0) => {
  return anime({
    targets,
    scale: [0, 1],
    opacity: [0, 1],
    duration: 600,
    delay,
    easing: 'easeOutBack'
  });
};

// Flip animation
export const flip = (targets, delay = 0) => {
  return anime({
    targets,
    rotateY: [0, 360],
    duration: 1000,
    delay,
    easing: 'easeInOutQuad'
  });
};

// Wave animation for text
export const waveText = (targets) => {
  return anime({
    targets,
    translateY: [
      { value: -10, duration: 300 },
      { value: 0, duration: 300 }
    ],
    delay: anime.stagger(50),
    loop: true,
    easing: 'easeInOutSine'
  });
};

// Shake animation
export const shake = (targets) => {
  return anime({
    targets,
    translateX: [
      { value: -10, duration: 100 },
      { value: 10, duration: 100 },
      { value: -10, duration: 100 },
      { value: 10, duration: 100 },
      { value: 0, duration: 100 }
    ],
    easing: 'easeInOutQuad'
  });
};

// Glow animation
export const glow = (targets) => {
  return anime({
    targets,
    boxShadow: [
      { value: '0 0 20px rgba(59, 130, 246, 0.5)', duration: 1000 },
      { value: '0 0 40px rgba(59, 130, 246, 0.8)', duration: 1000 }
    ],
    loop: true,
    direction: 'alternate',
    easing: 'easeInOutQuad'
  });
};

// Counter animation
export const animateCounter = (element, start, end, duration = 2000) => {
  const obj = { value: start };
  return anime({
    targets: obj,
    value: end,
    duration,
    easing: 'easeOutExpo',
    round: 1,
    update: () => {
      if (element) {
        element.textContent = obj.value;
      }
    }
  });
};

// Progress bar animation
export const animateProgress = (targets, percentage, duration = 1000) => {
  return anime({
    targets,
    width: `${percentage}%`,
    duration,
    easing: 'easeOutQuad'
  });
};

// Morph animation
export const morph = (targets, delay = 0) => {
  return anime({
    targets,
    points: [
      { value: '70 24 119.574 60.369 100.145 117.631 50.855 101.631 3.426 54.369' },
      { value: '70 41 118.574 59.369 111.145 132.631 60.855 84.631 20.426 60.369' }
    ],
    duration: 3000,
    delay,
    loop: true,
    direction: 'alternate',
    easing: 'easeInOutQuad'
  });
};

// Scroll reveal animation
export const scrollReveal = (targets) => {
  return anime({
    targets,
    opacity: [0, 1],
    translateY: [50, 0],
    duration: 800,
    easing: 'easeOutQuad'
  });
};

// Page transition animation
export const pageTransition = (targets) => {
  return anime({
    targets,
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
    easing: 'easeOutQuad'
  });
};

// Elastic bounce
export const elasticBounce = (targets, delay = 0) => {
  return anime({
    targets,
    scale: [0, 1],
    duration: 1000,
    delay,
    easing: 'easeOutElastic(1, .5)'
  });
};

// Ripple effect
export const ripple = (x, y, container) => {
  const ripple = document.createElement('span');
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.classList.add('ripple-effect');
  container.appendChild(ripple);

  anime({
    targets: ripple,
    scale: [0, 2],
    opacity: [1, 0],
    duration: 600,
    easing: 'easeOutExpo',
    complete: () => ripple.remove()
  });
};

const animationFunctions = {
  fadeIn,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  staggerFadeIn,
  cardHover,
  cardHoverReset,
  buttonClick,
  rotate,
  pulse,
  bounce,
  slideInBottom,
  slideInTop,
  zoomIn,
  flip,
  waveText,
  shake,
  glow,
  animateCounter,
  animateProgress,
  morph,
  scrollReveal,
  pageTransition,
  elasticBounce,
  ripple
};

export default animationFunctions;
