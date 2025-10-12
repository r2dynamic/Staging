// cubicSplash.js
// UDOT Cameras - 3D Cubic Splash Screen (Integrated Version)

// Default configuration - FAST MODE (6 second total)
let density = 4; // Grid density (4x4 = 16 tiles per wall, 64 total - bigger tiles!)
let distance = 0; // Reveal distance (0-100)
let speed = 50; // Speed of image loading (milliseconds) - 64 tiles × 50ms = 3.2 seconds
let imageCount = 40; // Number of images to load (reduced from 50)
let revealDuration = 1200; // Reveal animation duration (ms)
let pauseBeforeTransition = 300; // Pause before hiding splash (ms)

// Mobile detection and adjustment
const isMobile = window.innerWidth <= 768;
if (isMobile) {
  density = 3; // Even fewer tiles on mobile (3x3 = 9 per wall, 36 total)
  speed = 60; // Slightly slower per tile
  imageCount = 25; // Fewer images needed
  console.log('Mobile detected: Using reduced density', density);
}

// Load configuration from localStorage if testing
if (localStorage.getItem('cubicSplashConfig')) {
  try {
    const config = JSON.parse(localStorage.getItem('cubicSplashConfig'));
    if (config.density) density = parseInt(config.density);
    if (config.speed) speed = parseInt(config.speed);
    if (config.imageCount) imageCount = parseInt(config.imageCount);
    if (config.revealDuration) revealDuration = parseInt(config.revealDuration);
    if (config.pause) pauseBeforeTransition = parseInt(config.pause);
    console.log('Using custom cubic splash configuration:', config);
  } catch (e) {
    console.warn('Failed to parse cubic splash configuration:', e);
  }
}

const directions = ['top', 'right', 'bottom', 'left'];

// Sample camera image URLs - will be replaced with actual UDOT camera data
const SAMPLE_IMAGES = [
  "https://picsum.photos/id/106/900/500",
  "https://picsum.photos/id/115/900/500",
  "https://picsum.photos/id/116/900/500",
  "https://picsum.photos/id/124/900/500",
  "https://picsum.photos/id/126/900/500",
  "https://picsum.photos/id/130/900/500",
  "https://picsum.photos/id/143/900/500",
  "https://picsum.photos/id/152/900/500",
  "https://picsum.photos/id/167/900/500",
  "https://picsum.photos/id/190/900/500",
  "https://picsum.photos/id/191/900/500",
  "https://picsum.photos/id/193/900/500"
];

let allGridElements = [];
let intervalId;
let loadedCount = 0;
let totalElementsToLoad = 0;

/**
 * Preload images before displaying
 */
function preloadImages(srcArray, progressCallback) {
  let loaded = 0;
  const total = srcArray.length;
  
  return new Promise((resolve) => {
    if (total === 0) {
      resolve();
      return;
    }
    
    srcArray.forEach(src => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (progressCallback) {
          progressCallback(Math.round((loaded / total) * 100));
        }
        if (loaded === total) {
          resolve();
        }
      };
      img.src = src;
    });
  });
}

/**
 * Initialize and render the 3D walls
 */
function renderWalls() {
  const gridContainer = document.querySelector('.inf-grid-hero-container');
  if (!gridContainer) return;
  
  gridContainer.style.setProperty('--grid-sz', density);
  gridContainer.style.setProperty('--rev-dis', distance);

  allGridElements.length = 0;

  directions.forEach(dir => {
    const parent = gridContainer.querySelector(`.${dir}`);
    if (!parent) return;
    parent.innerHTML = '';
    const total = density * density;
    for (let i = 1; i <= total; i++) {
      const div = document.createElement('div');
      div.classList.add(`${dir.charAt(0)}${i}`);
      parent.appendChild(div);
      allGridElements.push(div);
    }
  });

  startImageInterval();
}

/**
 * Populate grid tiles with images progressively
 */
function startImageInterval() {
  if (intervalId) clearInterval(intervalId);
  loadedCount = 0;
  totalElementsToLoad = allGridElements.length;

  intervalId = setInterval(() => {
    const unloadedElements = allGridElements.filter(el => !el.classList.contains('loaded'));
    if (unloadedElements.length === 0) {
      clearInterval(intervalId);
      onAllTilesLoaded();
      return;
    }

    const randomElement = unloadedElements[Math.floor(Math.random() * unloadedElements.length)];
    const randomImage = SAMPLE_IMAGES[Math.floor(Math.random() * SAMPLE_IMAGES.length)];
    randomElement.style.background = `url('${randomImage}')`;
    randomElement.classList.add('loaded');
    loadedCount++;
  }, speed);
}

/**
 * Called when all tiles are loaded
 */
function onAllTilesLoaded() {
  console.log('All cubic tiles loaded');
  
  // Animate reveal distance
  animateDistance(100, revealDuration, () => {
    // Wait a moment, then hide splash and reveal main app
    setTimeout(() => {
      hideSplashAndRevealApp();
    }, pauseBeforeTransition);
  });
}

/**
 * Animate the reveal distance
 */
function animateDistance(toValue, duration = 1000, callback) {
  const el = document.querySelector('.inf-grid-hero-container');
  if (!el) return;
  
  const fromValue = distance;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
    distance = fromValue + (toValue - fromValue) * eased;
    el.style.setProperty('--rev-dis', distance.toFixed(2));
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else if (callback) {
      callback();
    }
  }
  
  requestAnimationFrame(update);
}

/**
 * Hide the splash screen and reveal the main app
 */
function hideSplashAndRevealApp() {
  const splashOverlay = document.getElementById('cubicSplash');
  if (splashOverlay) {
    splashOverlay.classList.add('splash-complete');
    
    // After fade out animation completes, remove from DOM
    setTimeout(() => {
      splashOverlay.remove();
    }, 1000);
  }
  
  // Reveal main app content
  const hiddenElements = document.querySelectorAll('.hidden-on-load');
  hiddenElements.forEach(el => el.classList.add('fade-in'));
  
  console.log('Main app revealed');
}

/**
 * Fetch camera images from the main app's GeoJSON data
 */
async function loadCameraImages() {
  try {
    const response = await fetch('cameras.geojson');
    if (!response.ok) throw new Error('Failed to load camera data');
    
    const data = await response.json();
    
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Invalid GeoJSON format');
    }
    
    // Extract image URLs from camera data
    const imageUrls = data.features
      .map(feature => feature.properties?.ImageUrl)
      .filter(url => url && url !== "NULL" && url.startsWith('http'))
      .slice(0, imageCount); // Use configured number of images for splash
    
    // Shuffle array
    for (let i = imageUrls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [imageUrls[i], imageUrls[j]] = [imageUrls[j], imageUrls[i]];
    }
    
    return imageUrls.length > 0 ? imageUrls : SAMPLE_IMAGES;
  } catch (error) {
    console.error('Error loading camera images:', error);
    return SAMPLE_IMAGES; // Fallback to sample images
  }
}

/**
 * Initialize the splash screen
 */
async function initCubicSplash() {
  // Load camera images
  const images = await loadCameraImages();
  
  // Replace sample images with actual camera images
  SAMPLE_IMAGES.length = 0;
  SAMPLE_IMAGES.push(...images);
  
  // START IMMEDIATELY - no preloading, images will load as they appear
  console.log('Starting cubic splash with', SAMPLE_IMAGES.length, 'images');
  
  // Start rendering the 3D cubic grid right away
  renderWalls();
}

// Export for main.js to call
export { initCubicSplash };

// Auto-start if DOM is already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCubicSplash);
} else {
  initCubicSplash();
}
