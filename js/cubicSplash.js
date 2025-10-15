// cubicSplash.js
// UDOT Cameras - 3D Cubic Splash Screen (Integrated Version)

// Default configuration - FAST MODE (6 second total)
let density = 4; // Grid density (4x4 = 16 tiles per wall, 64 total - bigger tiles!)
let distance = 0; // Reveal distance (0-100)
let speed = 25; // Speed of image loading (milliseconds) - 64 tiles × 25ms = 1.6 seconds ⚡
let imageCount = 40; // Number of images to load (reduced from 50)
let revealDuration = 1200; // Reveal animation duration (ms)
let pauseBeforeTransition = 0; // Instant transition - no pause!

// Mobile detection and adjustment
const isMobile = window.innerWidth <= 768;
const isPortrait = window.innerHeight > window.innerWidth;
const useMobileCurtain = isMobile && isPortrait;

if (useMobileCurtain) {
  density = 4; // 4x4 grid for portrait mobile (16 tiles)
  speed = 30;
  imageCount = 20;
  console.log('Mobile portrait detected: Using curtain mode with', density, 'x', density, 'grid');
} else if (isMobile) {
  density = 3; // Landscape mobile
  speed = 30;
  imageCount = 25;
  console.log('Mobile landscape detected: Using reduced density', density);
} else {
  console.log('Desktop detected: Using full 3D cubic grid');
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

// Pre-selected UDOT camera images for fast, consistent splash screen loading
const SPLASH_IMAGES = [
  "https://udottraffic.utah.gov/1_devices/aux16853.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16852.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16346.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17402.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14632.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17401.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18252.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14633.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17955.jpg",
  "https://udottraffic.utah.gov/1_devices/aux14634.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16834.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18476.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18479.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18481.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16516.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17996.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16077.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16076.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16680.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17068.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17069.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18322.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17070.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux15822.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux15695.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17426.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18336.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16681.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17001.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17002.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16999.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17000.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18012.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18013.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18014.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16171.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14917.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16628.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14860.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14861.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14863.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14864.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14865.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14922.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux16339.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux15089.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14923.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux15965.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux15966.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18480.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18212.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18046.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18213.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18226.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17672.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17673.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17967.jpg",
  "https://udottraffic.utah.gov/1_devices/aux61.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux60.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14831.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18383.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux157.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux151.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux152.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux153.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux154.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux155.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux156.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux14770.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17441.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux18276.jpeg",
  "https://udottraffic.utah.gov/1_devices/aux17433.jpeg"
];

// Fallback images (only used if SPLASH_IMAGES fails to load)
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
let rotationIntervals = []; // Store all rotation interval IDs

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
  
  // For mobile curtain mode, only render the front wall
  const wallsToRender = useMobileCurtain ? ['bottom'] : directions;
  
  // Add mobile curtain class if needed
  if (useMobileCurtain) {
    gridContainer.classList.add('mobile-curtain-mode');
  }

  wallsToRender.forEach(dir => {
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

  // Create a shuffled array of images to ensure each is used only once
  const shuffledImages = [...SPLASH_IMAGES];
  for (let i = shuffledImages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
  }
  
  let imageIndex = 0; // Track which image to use next

  intervalId = setInterval(() => {
    const unloadedElements = allGridElements.filter(el => !el.classList.contains('loaded'));
    if (unloadedElements.length === 0) {
      clearInterval(intervalId);
      onAllTilesLoaded();
      return;
    }

    // Pick a random unloaded tile
    const randomElement = unloadedElements[Math.floor(Math.random() * unloadedElements.length)];
    
    // Use the next image in our shuffled array (ensures each image used once)
    const imageUrl = shuffledImages[imageIndex % shuffledImages.length];
    imageIndex++;
    
    randomElement.style.background = `url('${imageUrl}')`;
    randomElement.classList.add('loaded');
    loadedCount++;
    
    // Immediately start rotating this tile's image
    startTileRotation(randomElement);
  }, speed);
}

/**
 * Start rotating images on a single tile
 */
function startTileRotation(element) {
  // Each tile gets a random interval around 250ms (200-300ms for variation)
  const randomInterval = 200 + Math.random() * 100;
  
  const rotateId = setInterval(() => {
    // Pick a random image from the pool
    const randomImageUrl = SPLASH_IMAGES[Math.floor(Math.random() * SPLASH_IMAGES.length)];
    element.style.background = `url('${randomImageUrl}')`;
  }, randomInterval);
  
  rotationIntervals.push(rotateId);
}

/**
 * Start rotating images on all tiles (not used anymore - kept for compatibility)
 */
function startImageRotation() {
  // Clear any existing rotation intervals
  rotationIntervals.forEach(id => clearInterval(id));
  rotationIntervals = [];
  
  allGridElements.forEach((element) => {
    // Each tile gets a random interval around 250ms
    const randomInterval = 200 + Math.random() * 100;
    
    const rotateId = setInterval(() => {
      // Pick a random image from the pool
      const randomImageUrl = SPLASH_IMAGES[Math.floor(Math.random() * SPLASH_IMAGES.length)];
      element.style.background = `url('${randomImageUrl}')`;
    }, randomInterval);
    
    rotationIntervals.push(rotateId);
  });
  
  console.log('Image rotation started on all tiles');
}

/**
 * Stop all image rotation
 */
function stopImageRotation() {
  rotationIntervals.forEach(id => clearInterval(id));
  rotationIntervals = [];
  console.log('Image rotation stopped');
}

/**
 * Called when all tiles are loaded
 */
function onAllTilesLoaded() {
  console.log('All cubic tiles loaded - images rotating, preparing VHS transition');
  
  // Wait just 500ms to let user see the gallery briefly, then start VHS effect
  setTimeout(() => {
    startVHSTransition();
  }, 500);
}

/**
 * Start the VHS transition effect
 */
function startVHSTransition() {
  console.log('Starting VHS + Glitch transition...');
  
  const splashOverlay = document.getElementById('cubicSplash');
  if (!splashOverlay) return;
  
  // Create VHS effect overlays
  const scanlines = document.createElement('div');
  scanlines.className = 'vhs-scanlines';
  document.body.appendChild(scanlines);
  
  const staticOverlay = document.createElement('div');
  staticOverlay.className = 'vhs-static';
  document.body.appendChild(staticOverlay);
  
  const tracking = document.createElement('div');
  tracking.className = 'vhs-tracking';
  document.body.appendChild(tracking);
  
  // Create GLITCH effect overlays
  const glitchOverlay = document.createElement('div');
  glitchOverlay.className = 'glitch-overlay';
  document.body.appendChild(glitchOverlay);
  
  // Add random glitch blocks
  for (let i = 0; i < 8; i++) {
    const block = document.createElement('div');
    block.className = 'glitch-block';
    block.style.top = `${Math.random() * 80}%`;
    block.style.left = `${Math.random() * 80}%`;
    block.style.width = `${20 + Math.random() * 30}%`;
    block.style.height = `${10 + Math.random() * 20}px`;
    block.style.background = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`;
    block.style.animationDelay = `${Math.random() * 0.3}s`;
    glitchOverlay.appendChild(block);
  }
  
  // Add digital tear overlay
  const glitchTear = document.createElement('div');
  glitchTear.className = 'glitch-tear';
  glitchTear.style.background = `linear-gradient(90deg, 
    transparent 0%, 
    rgba(255, 0, 0, 0.2) 45%, 
    rgba(0, 255, 255, 0.2) 55%, 
    transparent 100%)`;
  document.body.appendChild(glitchTear);
  
  // Add pixelation overlay
  const pixelate = document.createElement('div');
  pixelate.className = 'glitch-pixelate';
  document.body.appendChild(pixelate);
  
  // Trigger VHS glitch animation on splash
  splashOverlay.classList.add('vhs-transition');
  
  // Update static opacity dynamically for flicker effect
  let staticIntensity = 0;
  const staticInterval = setInterval(() => {
    staticIntensity += 0.05;
    staticOverlay.style.setProperty('--static-opacity', Math.min(staticIntensity, 0.8));
    if (staticIntensity >= 0.8) clearInterval(staticInterval);
  }, 100);
  
  // Randomize glitch blocks positions during transition
  const glitchInterval = setInterval(() => {
    const blocks = glitchOverlay.querySelectorAll('.glitch-block');
    blocks.forEach(block => {
      if (Math.random() > 0.7) {
        block.style.top = `${Math.random() * 80}%`;
        block.style.left = `${Math.random() * 80}%`;
      }
    });
  }, 150);
  
  // Stop image rotation during transition
  setTimeout(() => {
    stopImageRotation();
  }, 900);
  
  // Clean up and reveal main app after VHS effect completes
  setTimeout(() => {
    clearInterval(glitchInterval);
    
    // Remove all overlays
    scanlines.remove();
    staticOverlay.remove();
    tracking.remove();
    glitchOverlay.remove();
    glitchTear.remove();
    pixelate.remove();
    
    // Remove splash screen
    splashOverlay.remove();
    
    // Reveal main app
    const hiddenElements = document.querySelectorAll('.hidden-on-load');
    hiddenElements.forEach(el => el.classList.add('fade-in'));
    
    console.log('VHS + Glitch transition complete - main app revealed');
  }, 1800); // Match animation duration
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
    
    // After fade out animation completes, remove from DOM (instant fade = 200ms)
    setTimeout(() => {
      splashOverlay.remove();
    }, 200);
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
    
    // Calculate exact number of images needed for the grid
    const tilesNeeded = density * density * 4; // 4 walls
    
    // Extract ALL valid image URLs from camera data
    const allImageUrls = data.features
      .map(feature => feature.properties?.ImageUrl)
      .filter(url => url && url !== "NULL" && url.startsWith('http'));
    
    // Shuffle the entire array
    for (let i = allImageUrls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allImageUrls[i], allImageUrls[j]] = [allImageUrls[j], allImageUrls[i]];
    }
    
    // Take exactly the number we need (or slightly more as backup)
    const selectedImages = allImageUrls.slice(0, Math.max(tilesNeeded, imageCount));
    
    console.log(`Selected ${selectedImages.length} unique images for ${tilesNeeded} tiles`);
    
    return selectedImages.length > 0 ? selectedImages : SAMPLE_IMAGES;
  } catch (error) {
    console.error('Error loading camera images:', error);
    return SAMPLE_IMAGES; // Fallback to sample images
  }
}

/**
 * Initialize the splash screen
 */
async function initCubicSplash() {
  // Use pre-selected SPLASH_IMAGES directly - no fetch needed!
  console.log('Starting cubic splash with', SPLASH_IMAGES.length, 'pre-selected images');
  
  // Start rendering the 3D cubic grid immediately
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
