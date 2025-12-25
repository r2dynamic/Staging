// js/mobileCarousel.js - Mobile-specific 3D drum carousel with infinite scroll

import { updateModalInfoDeck } from './modal.js';

let mobileCarouselContainer = null;
let mobileGallery = null;
let mobileCurrentRotation = 0;
let mobileTouchStartY = 0;
let currentListIndex = 0; // Current camera index in the full camera list
let isUpdating = false; // Prevent updates during transitions
let lastSnapPosition = 0; // Track last snapped position to detect movement

const RADIUS = 160;
const NUM_SLIDES = 6;
const ANGLE_STEP = 360 / NUM_SLIDES; // 60 degrees per slide

export function initMobileCarousel(centerCam, prevCam, nextCam) {
  if (window.innerWidth > 768) return; // Only for mobile
  
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

  // Remove any existing mobile carousel
  removeMobileCarousel();

  // Get the full camera list and find starting camera's index
  const cameraList = window.camerasList || [];
  if (cameraList.length === 0) {
    console.log('No cameras in list');
    return;
  }
  
  const startIndex = cameraList.findIndex(cam => 
    cam?.Views?.[0]?.Url === centerCam?.Views?.[0]?.Url
  );
  
  currentListIndex = startIndex !== -1 ? startIndex : 0;
  console.log(`Starting carousel at camera index ${currentListIndex} of ${cameraList.length}`);

  // Create mobile carousel container
  mobileCarouselContainer = document.createElement('div');
  mobileCarouselContainer.className = 'mobile-carousel-scene';
  mobileCarouselContainer.innerHTML = `
    <div class="mobile-gallery" id="mobileGallery"></div>
    <div class="mobile-carousel-controls">
      <button class="button ghost mobile-up-btn" type="button" title="Previous camera">
        <i class="fas fa-chevron-up"></i>
      </button>
      <div class="carousel-dot"></div>
      <button class="button ghost mobile-down-btn" type="button" title="Next camera">
        <i class="fas fa-chevron-down"></i>
      </button>
    </div>
  `;

  modalBody.appendChild(mobileCarouselContainer);
  mobileGallery = document.getElementById('mobileGallery');

  // Create 6 physical cards
  for (let i = 0; i < NUM_SLIDES; i++) {
    const card = document.createElement('div');
    card.className = 'mobile-slide';
    card.style.transform = `rotateX(${i * ANGLE_STEP}deg) translateZ(${RADIUS}px)`;
    card.dataset.position = i;
    
    const img = document.createElement('img');
    img.loading = 'lazy';
    card.appendChild(img);
    mobileGallery.appendChild(card);
  }
  
  // Populate all cards with initial cameras
  updateAllCards();
  
  // Start at center (rotation 0 = position 0)
  mobileCurrentRotation = 0;
  lastSnapPosition = 0;
  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;

  setupMobileControls();
  setupMobileTouchEvents();
}

function updateAllCards() {
  console.log('=== updateAllCards START ===');
  console.log('mobileGallery exists:', !!mobileGallery);
  
  if (!mobileGallery) {
    console.log('EXIT: No mobileGallery');
    return;
  }
  
  const cameraList = window.camerasList || [];
  console.log('Camera list length:', cameraList.length);
  
  if (cameraList.length === 0) {
    console.log('EXIT: No cameras in list');
    return;
  }
  
  const slides = mobileGallery.querySelectorAll('.mobile-slide');
  
  // Correct mapping for drum rotation:
  // Position 0 (0°, center): Current camera (N)
  // Position 1 (60°, top): Next camera (N+1) - comes to center when scroll DOWN
  // Position 5 (300°, bottom): Previous camera (N-1) - comes to center when scroll UP
  const offsets = [0, 1, 2, 3, -2, -1]; // Position 4 = N-2, Position 5 = N-1
  
  slides.forEach((slide, position) => {
    const offset = offsets[position];
    const cameraIndex = (currentListIndex + offset + cameraList.length) % cameraList.length;
    const camera = cameraList[cameraIndex];
    
    console.log(`Position ${position} (${position * 60}°, offset ${offset}): Camera index ${cameraIndex} - ${camera?.Location}`);
    
    const img = slide.querySelector('img');
    if (img && camera) {
      img.src = camera?.Views?.[0]?.Url || '';
      img.alt = camera?.Location || 'Camera';
      slide.dataset.cameraIndex = cameraIndex;
    }
  });
  
  // Update modal title and info cards to show current camera
  const currentCamera = cameraList[currentListIndex];
  const modalTitle = document.querySelector('#imageModal .modal-title');
  if (modalTitle && currentCamera) {
    modalTitle.textContent = currentCamera?.Location || 'Camera';
  }
  
  // Update info cards with current camera data - use RAF to ensure DOM is ready
  if (currentCamera) {
    requestAnimationFrame(() => {
      updateModalInfoDeck(currentCamera);
    });
  }
}

function rotateMobile(direction) {
  if (!mobileGallery || isUpdating) return;
  
  const cameraList = window.camerasList || [];
  if (cameraList.length === 0) return;
  
  isUpdating = true;
  
  // First, update camera index
  const step = (direction === 'down' ? 1 : -1);
  currentListIndex = (currentListIndex + step + cameraList.length) % cameraList.length;
  
  // Update all cards BEFORE rotation starts (this also updates info deck)
  updateAllCards();
  
  // Force a reflow to ensure updates complete
  mobileGallery.offsetHeight;
  
  // Now rotate with the correct images already in place
  mobileCurrentRotation += (direction === 'down' ? -ANGLE_STEP : ANGLE_STEP);
  mobileGallery.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';
  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
  
  // After rotation completes, reset to 0° (now invisible since images match)
  setTimeout(() => {
    mobileGallery.style.transition = 'none';
    mobileCurrentRotation = 0;
    mobileGallery.style.transform = `rotateX(0deg)`;
    
    // Restore transition
    mobileGallery.offsetHeight; // Force reflow
    mobileGallery.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';
    isUpdating = false;
  }, 410);
}

function setupMobileControls() {
  if (!mobileCarouselContainer) return;

  const upBtn = mobileCarouselContainer.querySelector('.mobile-up-btn');
  const downBtn = mobileCarouselContainer.querySelector('.mobile-down-btn');

  if (upBtn) upBtn.addEventListener('click', () => rotateMobile('up'));
  if (downBtn) downBtn.addEventListener('click', () => rotateMobile('down'));
}

function setupMobileTouchEvents() {
  if (!mobileCarouselContainer) return;

  const scene = mobileCarouselContainer;

  scene.addEventListener('touchstart', e => {
    e.stopPropagation();
    mobileTouchStartY = e.touches[0].clientY;
  }, { passive: true });

  scene.addEventListener('touchmove', e => {
    e.stopPropagation();
    e.preventDefault();
    const deltaY = e.touches[0].clientY - mobileTouchStartY;
    mobileTouchStartY = e.touches[0].clientY;
    mobileCurrentRotation -= deltaY * 0.5;
    if (mobileGallery) {
      mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
    }
  }, { passive: false });

  scene.addEventListener('touchend', e => {
    e.stopPropagation();
    snapToNearestPosition();
  }, { passive: true });

  scene.addEventListener('wheel', e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY > 0) {
      rotateMobile('down');
    } else {
      rotateMobile('up');
    }
  });
}

function snapToNearestPosition() {
  console.log('\n*** snapToNearestPosition ***');
  console.log('  mobileCurrentRotation:', mobileCurrentRotation);
  console.log('  isUpdating:', isUpdating);
  
  if (!mobileGallery || isUpdating) {
    console.log('  EXIT: No gallery or updating');
    return;
  }
  
  const nearestStep = Math.round(mobileCurrentRotation / ANGLE_STEP);
  const targetRotation = nearestStep * ANGLE_STEP;
  const normalizedRotation = ((targetRotation % 360) + 360) % 360;
  const centeredPosition = Math.round(normalizedRotation / ANGLE_STEP) % NUM_SLIDES;
  
  console.log('  nearestStep:', nearestStep);
  console.log('  targetRotation:', targetRotation);
  console.log('  normalizedRotation:', normalizedRotation);
  console.log('  centeredPosition:', centeredPosition);
  
  mobileGallery.style.transition = 'transform 0.3s ease-out';
  mobileCurrentRotation = targetRotation;
  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
  
  setTimeout(() => {
    if (mobileGallery) {
      mobileGallery.style.transition = 'transform 0.6s ease';
      console.log('  Calling handleCameraChange with position:', centeredPosition);
      handleCameraChange(centeredPosition);
    }
  }, 350);
}

function handleCameraChange(centeredPosition) {
  console.log('\n### handleCameraChange ###');
  console.log('  centeredPosition:', centeredPosition);
  console.log('  isUpdating:', isUpdating);
  
  if (isUpdating) {
    console.log('  EXIT: Already updating');
    return;
  }
  
  const cameraList = window.camerasList || [];
  console.log('  Camera list length:', cameraList.length);
  
  if (cameraList.length === 0) {
    console.log('  EXIT: No cameras');
    return;
  }
  
  let stepsFromCenter = centeredPosition;
  if (stepsFromCenter > 3) {
    stepsFromCenter = stepsFromCenter - 6;
  }
  
  // Invert the step direction for touch gestures
  stepsFromCenter = -stepsFromCenter;
  
  console.log('  stepsFromCenter:', stepsFromCenter);
  
  if (stepsFromCenter === 0) {
    console.log('  EXIT: Still at center, no change needed');
    return;
  }
  
  const oldIndex = currentListIndex;
  currentListIndex = (currentListIndex + stepsFromCenter + cameraList.length) % cameraList.length;
  
  console.log(`  ✓ Moved ${stepsFromCenter} steps. Index ${oldIndex} -> ${currentListIndex}`);
  console.log(`  Old camera: ${cameraList[oldIndex]?.Location}`);
  console.log(`  New camera: ${cameraList[currentListIndex]?.Location}`);
  
  isUpdating = true;
  updateAllCards();
  
  // Update info cards with new camera data
  const newCamera = cameraList[currentListIndex];
  if (newCamera) {
    updateModalInfoDeck(newCamera);
  }
  
  console.log('  Resetting rotation to 0...');
  mobileGallery.style.transition = 'none';
  mobileCurrentRotation = 0;
  lastSnapPosition = 0;
  mobileGallery.style.transform = `rotateX(0deg)`;
  
  requestAnimationFrame(() => {
    if (mobileGallery) {
      mobileGallery.style.transition = 'transform 0.6s ease';
    }
    setTimeout(() => {
      console.log('  isUpdating -> false');
      isUpdating = false;
    }, 100);
  });
}

export function updateMobileCarousel(centerCam, prevCam, nextCam) {
  if (window.innerWidth > 768) return;
  initMobileCarousel(centerCam, prevCam, nextCam);
}

export function removeMobileCarousel() {
  if (mobileCarouselContainer) {
    mobileCarouselContainer.remove();
    mobileCarouselContainer = null;
  }
  mobileGallery = null;
  mobileCurrentRotation = 0;
  currentListIndex = 0;
  isUpdating = false;
  lastSnapPosition = 0;
}
