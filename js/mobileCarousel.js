// js/mobileCarousel.js - Mobile-specific 3D drum carousel with infinite scroll

import { updateModalInfoDeck, updateMobileMiniMap } from './modal.js';

let mobileCarouselContainer = null;
let mobileGallery = null;
let mobileCurrentRotation = 0;
let mobileTouchStartY = 0;
let currentCenterCamera = null; // Current camera object at center
let isUpdating = false; // Prevent updates during transitions
let lastSnapPosition = 0; // Track last snapped position to detect movement
let cardCameras = [null, null, null, null, null, null]; // Track which camera each physical card (0-5) is showing

const RADIUS = 160;
const NUM_SLIDES = 6;
const ANGLE_STEP = 360 / NUM_SLIDES; // 60 degrees per slide

// ---- NEIGHBOR RESOLUTION FUNCTIONS ----

function findCameraByUrl(url) {
  if (!url) return null;
  const normalized = (url || '').trim();
  return (window.camerasList || []).find(cam => 
    (cam?.Views?.[0]?.Url || '').trim() === normalized
  ) || null;
}

function getAdjacentInList(cam, direction) {
  if (!cam) return null;
  const list = window.camerasList || [];
  const idx = list.findIndex(c => c?.Views?.[0]?.Url === cam?.Views?.[0]?.Url);
  if (idx === -1) return null;
  
  const targetIdx = direction === 'pos' ? idx + 1 : idx - 1;
  if (targetIdx < 0 || targetIdx >= list.length) return null;
  return list[targetIdx];
}

function getNeighborCamera(cam, direction) {
  if (!cam) return null;
  
  // Try neighbor field first
  const meta = cam?._geoJsonMetadata?.neighbors;
  const neighborUrl = direction === 'pos' ? meta?.route1PosUrl : meta?.route1NegUrl;
  
  if (neighborUrl) {
    const neighborCam = findCameraByUrl(neighborUrl);
    if (neighborCam) {
      console.log(`  Found ${direction} neighbor via metadata:`, neighborCam.Location);
      return neighborCam;
    }
  }
  
  // Fallback to list order
  const fallback = getAdjacentInList(cam, direction);
  if (fallback) {
    console.log(`  Using ${direction} fallback from list:`, fallback.Location);
  }
  return fallback;
}

export function initMobileCarousel(centerCam, prevCam, nextCam) {
  if (window.innerWidth > 768) return; // Only for mobile
  
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

  // Remove any existing mobile carousel
  removeMobileCarousel();

  // Set current center camera
  currentCenterCamera = centerCam;
  console.log(`Starting carousel at camera: ${currentCenterCamera?.Location}`);

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
  
  // Populate all 6 cards using neighbor chains
  console.log('=== Initial neighbor chain population ===');
  const pos1 = getNeighborCamera(currentCenterCamera, 'pos');  // Top visible
  const neg1 = getNeighborCamera(currentCenterCamera, 'neg');  // Bottom visible
  const pos2 = pos1 ? getNeighborCamera(pos1, 'pos') : null;   // Back-top
  const neg2 = neg1 ? getNeighborCamera(neg1, 'neg') : null;   // Back-bottom
  const pos3 = pos2 ? getNeighborCamera(pos2, 'pos') : null;   // Far back
  
  cardCameras = [
    currentCenterCamera, // P0 (0°, center)
    pos1,                // P1 (60°, top visible)
    pos2,                // P2 (120°, back-top)
    pos3,                // P3 (180°, far back)
    neg2,                // P4 (240°, back-bottom)
    neg1                 // P5 (300°, bottom visible)
  ];
  
  console.log('Card cameras:', cardCameras.map((cam, i) => `P${i}: ${cam?.Location || 'null'}`).join(', '));
  
  // Update all card images
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
  
  if (!mobileGallery) {
    console.log('EXIT: No mobileGallery');
    return;
  }
  
  const slides = mobileGallery.querySelectorAll('.mobile-slide');
  
  slides.forEach((slide, position) => {
    const camera = cardCameras[position];
    
    console.log(`Position ${position} (${position * 60}°): ${camera?.Location || 'null'}`);
    
    const img = slide.querySelector('img');
    if (img && camera) {
      img.src = camera?.Views?.[0]?.Url || '';
      img.alt = camera?.Location || 'Camera';
    } else if (img) {
      img.src = '';
      img.alt = '';
    }
  });
  
  // Update modal title and info cards to show current center camera
  const modalTitle = document.querySelector('#imageModal .modal-title');
  if (modalTitle && currentCenterCamera) {
    modalTitle.textContent = currentCenterCamera?.Location || 'Camera';
  }
  
  // Update info cards with current camera data - use RAF to ensure DOM is ready
  if (currentCenterCamera) {
    // Get the 3 visible cameras for mini map: bottom (P5), center (P0), top (P1)
    const bottomCam = cardCameras[5]; // NEG neighbor
    const topCam = cardCameras[1];    // POS neighbor
    
    console.log('Visible cameras in carousel:');
    console.log('  Bottom (P5):', bottomCam?.Location || 'null');
    console.log('  Center (P0):', currentCenterCamera?.Location);
    console.log('  Top (P1):', topCam?.Location || 'null');
    
    requestAnimationFrame(() => {
      updateModalInfoDeck(currentCenterCamera);
      updateMobileMiniMap(currentCenterCamera, bottomCam, topCam);
    });
  }
}

function rotateMobile(direction) {
  if (!mobileGallery || isUpdating) return;
  if (!currentCenterCamera) return;
  
  isUpdating = true;
  
  console.log(`\n=== Rotating ${direction} ===`);
  console.log('Before rotation - cardCameras:', cardCameras.map((cam, i) => `P${i}: ${cam?.Location || 'null'}`).join(', '));
  
  // Rotate the drum with existing images (true card rotation)
  mobileCurrentRotation += (direction === 'down' ? -ANGLE_STEP : ANGLE_STEP);
  mobileGallery.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';
  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
  
  // After rotation completes, update the card that moved to far back
  setTimeout(() => {
    // Calculate which physical card is now at center (0° effective angle)
    const normalizedRotation = ((mobileCurrentRotation % 360) + 360) % 360;
    const centerCardIndex = Math.round((360 - normalizedRotation) / 60) % 6;
    
    console.log('After rotation:');
    console.log('  mobileCurrentRotation:', mobileCurrentRotation);
    console.log('  Physical card at center:', centerCardIndex);
    
    // Update current center camera to what's now at center
    currentCenterCamera = cardCameras[centerCardIndex];
    console.log('  New center camera:', currentCenterCamera?.Location);
    
    // Update the card that rotated to far back (180° from center) with next neighbor
    const backCardIndex = (centerCardIndex + 3) % 6;
    
    if (direction === 'down') {
      // Rotating down: update the card 3 positions ahead with its next POS neighbor
      const futureTopCard = (centerCardIndex + 2) % 6; // Card that will be top after 2 more rotations
      const nextNeighbor = cardCameras[futureTopCard] ? getNeighborCamera(cardCameras[futureTopCard], 'pos') : null;
      cardCameras[backCardIndex] = nextNeighbor;
      console.log(`  Updated P${backCardIndex} (far back) with: ${nextNeighbor?.Location || 'null'}`);
    } else {
      // Rotating up: update the card 3 positions behind with its next NEG neighbor
      const futureBottomCard = (centerCardIndex + 4) % 6; // Card that will be bottom after 2 more rotations
      const prevNeighbor = cardCameras[futureBottomCard] ? getNeighborCamera(cardCameras[futureBottomCard], 'neg') : null;
      cardCameras[backCardIndex] = prevNeighbor;
      console.log(`  Updated P${backCardIndex} (far back) with: ${prevNeighbor?.Location || 'null'}`);
    }
    
    // Update only the physical card at back that changed
    const slides = mobileGallery.querySelectorAll('.mobile-slide');
    const slideToUpdate = slides[backCardIndex];
    if (slideToUpdate) {
      const img = slideToUpdate.querySelector('img');
      const camera = cardCameras[backCardIndex];
      if (img) {
        if (camera) {
          img.src = camera?.Views?.[0]?.Url || '';
          img.alt = camera?.Location || 'Camera';
        } else {
          img.src = '';
          img.alt = '';
        }
      }
    }
    
    console.log('After update - cardCameras:', cardCameras.map((cam, i) => `P${i}: ${cam?.Location || 'null'}`).join(', '));
    
    // Update info deck with current center camera
    if (currentCenterCamera) {
      // Get the cameras at top and bottom positions (relative to center)
      const topCardIndex = (centerCardIndex + 1) % 6;
      const bottomCardIndex = (centerCardIndex + 5) % 6;
      const topCam = cardCameras[topCardIndex];
      const bottomCam = cardCameras[bottomCardIndex];
      
      console.log('  Visible cameras:');
      console.log('    Top (P' + topCardIndex + '):', topCam?.Location || 'null');
      console.log('    Center (P' + centerCardIndex + '):', currentCenterCamera?.Location);
      console.log('    Bottom (P' + bottomCardIndex + '):', bottomCam?.Location || 'null');
      
      requestAnimationFrame(() => {
        updateModalInfoDeck(currentCenterCamera);
        updateMobileMiniMap(currentCenterCamera, bottomCam, topCam);
      });
    }
    
    // Update modal title
    const modalTitle = document.querySelector('#imageModal .modal-title');
    if (modalTitle && currentCenterCamera) {
      modalTitle.textContent = currentCenterCamera?.Location || 'Camera';
    }
    
    isUpdating = false;
  }, 420);
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
  console.log('\n### handleCameraChange (touch gesture) ###');
  console.log('  centeredPosition:', centeredPosition);
  console.log('  isUpdating:', isUpdating);
  
  if (isUpdating) {
    console.log('  EXIT: Already updating');
    return;
  }
  
  if (!currentCenterCamera) {
    console.log('  EXIT: No current camera');
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
  
  isUpdating = true;
  
  console.log(`  Moving ${stepsFromCenter > 0 ? 'down' : 'up'} by ${Math.abs(stepsFromCenter)} steps`);
  console.log('  Before - cardCameras:', cardCameras.map((cam, i) => `P${i}: ${cam?.Location || 'null'}`).join(', '));
  
  // Update cards based on steps moved
  for (let i = 0; i < Math.abs(stepsFromCenter); i++) {
    const direction = stepsFromCenter > 0 ? 'down' : 'up';
    
    // Calculate which physical card will be at center after this step
    const stepRotation = mobileCurrentRotation + ((direction === 'down' ? -ANGLE_STEP : ANGLE_STEP) * (i + 1));
    const normalizedRotation = ((stepRotation % 360) + 360) % 360;
    const centerCardIndex = Math.round((360 - normalizedRotation) / 60) % 6;
    const backCardIndex = (centerCardIndex + 3) % 6;
    
    console.log(`    Step ${i+1}: Center will be P${centerCardIndex}, updating P${backCardIndex}`);
    
    // Update the card at far back with next neighbor in chain
    if (direction === 'down') {
      const futureTopCard = (centerCardIndex + 2) % 6;
      const nextNeighbor = cardCameras[futureTopCard] ? getNeighborCamera(cardCameras[futureTopCard], 'pos') : null;
      cardCameras[backCardIndex] = nextNeighbor;
    } else {
      const futureBottomCard = (centerCardIndex + 4) % 6;
      const prevNeighbor = cardCameras[futureBottomCard] ? getNeighborCamera(cardCameras[futureBottomCard], 'neg') : null;
      cardCameras[backCardIndex] = prevNeighbor;
    }
  }
  
  // Calculate final center card after all rotations
  const normalizedRotation = ((mobileCurrentRotation % 360) + 360) % 360;
  const finalCenterCardIndex = Math.round((360 - normalizedRotation) / 60) % 6;
  currentCenterCamera = cardCameras[finalCenterCardIndex];
  
  console.log('  After updates - cardCameras:', cardCameras.map((cam, i) => `P${i}: ${cam?.Location || 'null'}`).join(', '));
  console.log('  Final center camera (P' + finalCenterCardIndex + '):', currentCenterCamera?.Location);
  
  // Update ALL physical card images to match updated cardCameras array
  const slides = mobileGallery.querySelectorAll('.mobile-slide');
  slides.forEach((slide, position) => {
    const camera = cardCameras[position];
    const img = slide.querySelector('img');
    if (img) {
      if (camera) {
        img.src = camera?.Views?.[0]?.Url || '';
        img.alt = camera?.Location || 'Camera';
      } else {
        img.src = '';
        img.alt = '';
      }
    }
  });
  
  // Update info cards with new camera data
  if (currentCenterCamera) {
    const topCardIndex = (finalCenterCardIndex + 1) % 6;
    const bottomCardIndex = (finalCenterCardIndex + 5) % 6;
    const topCam = cardCameras[topCardIndex];
    const bottomCam = cardCameras[bottomCardIndex];
    
    requestAnimationFrame(() => {
      updateModalInfoDeck(currentCenterCamera);
      updateMobileMiniMap(currentCenterCamera, bottomCam, topCam);
    });
  }
  
  // Update modal title
  const modalTitle = document.querySelector('#imageModal .modal-title');
  if (modalTitle && currentCenterCamera) {
    modalTitle.textContent = currentCenterCamera?.Location || 'Camera';
  }
  
  setTimeout(() => {
    console.log('  isUpdating -> false');
    isUpdating = false;
  }, 100);
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
  currentCenterCamera = null;
  cardCameras = [null, null, null, null, null, null];
  isUpdating = false;
  lastSnapPosition = 0;
}
