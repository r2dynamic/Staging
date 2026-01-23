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
let transitionTimeoutId = null; // Track timeout for cleanup

const RADIUS = 160;
const NUM_SLIDES = 6;
const ANGLE_STEP = 360 / NUM_SLIDES; // 60 degrees per slide

// ---- NEIGHBOR RESOLUTION FUNCTIONS ----

// Normalize URL for comparison (iOS-safe)
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  
  // Trim whitespace
  let normalized = url.trim();
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Convert to lowercase for case-insensitive comparison
  normalized = normalized.toLowerCase();
  
  // Handle protocol variations (http vs https)
  normalized = normalized.replace(/^https?:\/\//, '');
  
  return normalized;
}

function findCameraByUrl(url) {
  if (!url) {
    console.log('  findCameraByUrl: no URL provided');
    return null;
  }
  
  const normalizedSearch = normalizeUrl(url);
  console.log('  Searching for camera with normalized URL:', normalizedSearch);
  
  const list = window.camerasList || [];
  const found = list.find(cam => {
    const camUrl = cam?.Views?.[0]?.Url;
    if (!camUrl) return false;
    const normalizedCam = normalizeUrl(camUrl);
    return normalizedCam === normalizedSearch;
  });
  
  if (found) {
    console.log('  ✓ Found camera:', found.Location);
  } else {
    console.log('  ✗ Camera not found for URL:', url);
  }
  
  return found || null;
}

function getAdjacentInList(cam, direction) {
  if (!cam) return null;
  
  const list = window.camerasList || [];
  const camUrl = cam?.Views?.[0]?.Url;
  if (!camUrl) {
    console.log('  getAdjacentInList: current camera has no URL');
    return null;
  }
  
  const normalizedCamUrl = normalizeUrl(camUrl);
  
  // Find index using normalized URL comparison
  const idx = list.findIndex(c => {
    const url = c?.Views?.[0]?.Url;
    return url && normalizeUrl(url) === normalizedCamUrl;
  });
  
  console.log('  Current camera index in list:', idx);
  
  if (idx === -1) {
    console.log('  getAdjacentInList: camera not found in list');
    return null;
  }
  
  const targetIdx = direction === 'pos' ? idx + 1 : idx - 1;
  console.log(`  Target ${direction} index:`, targetIdx, `(list length: ${list.length})`);
  
  if (targetIdx < 0 || targetIdx >= list.length) {
    console.log(`  getAdjacentInList: index ${targetIdx} out of bounds`);
    return null;
  }
  
  return list[targetIdx];
}

function getNeighborCamera(cam, direction) {
  if (!cam) {
    console.log('getNeighborCamera: no camera provided');
    return null;
  }
  
  console.log(`\n--- getNeighborCamera(${cam.Location}, ${direction}) ---`);
  
  // Try neighbor field first
  const meta = cam?._geoJsonMetadata?.neighbors;
  console.log('  Metadata neighbors:', meta);
  
  const neighborUrl = direction === 'pos' ? meta?.route1PosUrl : meta?.route1NegUrl;
  console.log(`  ${direction} neighbor URL from metadata:`, neighborUrl);
  
  if (neighborUrl) {
    const neighborCam = findCameraByUrl(neighborUrl);
    if (neighborCam) {
      console.log(`  ✓ Found ${direction} neighbor via metadata:`, neighborCam.Location);
      return neighborCam;
    } else {
      console.log(`  ✗ Neighbor URL found in metadata but camera not found in list`);
    }
  } else {
    console.log(`  ✗ No ${direction} neighbor URL in metadata`);
  }
  
  // Fallback to list order
  console.log('  Attempting fallback to sequential list order...');
  const fallback = getAdjacentInList(cam, direction);
  if (fallback) {
    console.log(`  ✓ Using ${direction} fallback from list:`, fallback.Location);
  } else {
    console.log(`  ✗ No fallback found (at list boundary)`);
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
      const newSrc = camera?.Views?.[0]?.Url || '';
      // Only update src if it changed (iOS optimization)
      if (img.src !== newSrc) {
        img.src = newSrc;
        // Force image decode on iOS for smoother rendering
        if (img.decode) {
          img.decode().catch(() => {
            console.warn('Image decode failed for:', camera?.Location);
          });
        }
      }
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
  
  // Update visible card borders
  updateVisibleCardBorders();
}

function updateVisibleCardBorders() {
  if (!mobileGallery) return;
  
  // Calculate which physical cards are currently visible
  // Use floor instead of round for more predictable behavior on iOS
  const normalizedRotation = ((mobileCurrentRotation % 360) + 360) % 360;
  const rawIndex = (360 - normalizedRotation) / 60;
  const centerCardIndex = (Math.floor(rawIndex + 0.5)) % 6;
  const topCardIndex = (centerCardIndex + 1) % 6;
  const bottomCardIndex = (centerCardIndex + 5) % 6;
  
  // Remove all visible position classes
  const slides = mobileGallery.querySelectorAll('.mobile-slide');
  slides.forEach(slide => {
    slide.classList.remove('visible-center', 'visible-top', 'visible-bottom');
  });
  
  // Add classes to currently visible cards
  if (slides[centerCardIndex]) slides[centerCardIndex].classList.add('visible-center');
  if (slides[topCardIndex]) slides[topCardIndex].classList.add('visible-top');
  if (slides[bottomCardIndex]) slides[bottomCardIndex].classList.add('visible-bottom');
}

function rotateMobile(direction) {
  if (!mobileGallery || isUpdating) {
    console.log('Blocked: isUpdating =', isUpdating);
    return;
  }
  if (!currentCenterCamera) return;
  
  isUpdating = true;
  
  console.log(`\n=== Rotating ${direction} ===`);
  console.log('Before rotation - cardCameras:', cardCameras.map((cam, i) => `P${i}: ${cam?.Location || 'null'}`).join(', '));
  
  // Rotate the drum with existing images (true card rotation)
  mobileCurrentRotation += (direction === 'down' ? -ANGLE_STEP : ANGLE_STEP);
  
  // Normalize rotation to prevent precision loss on iOS (keep between -360 and 360)
  if (Math.abs(mobileCurrentRotation) > 720) {
    const normalizedRot = ((mobileCurrentRotation % 360) + 360) % 360;
    // Adjust to keep the same visual position but smaller number
    mobileCurrentRotation = normalizedRot > 180 ? normalizedRot - 360 : normalizedRot;
    console.log('Normalized rotation to:', mobileCurrentRotation);
  }
  
  mobileGallery.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';
  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
  
  // Force reflow on iOS to ensure transform applies
  void mobileGallery.offsetHeight;
  
  // After rotation completes, update the card that moved to far back
  // Use transitionend event instead of setTimeout for iOS reliability
  let hasExecuted = false;
  const handleTransitionEnd = (e) => {
    // iOS can fire transitionend multiple times for different properties
    // Only handle transform property transitions
    if (e && e.propertyName && e.propertyName !== 'transform') {
      return;
    }
    
    // Prevent multiple executions (iOS safety)
    if (hasExecuted) return;
    hasExecuted = true;
    
    // Clean up
    if (mobileGallery) {
      mobileGallery.removeEventListener('transitionend', handleTransitionEnd);
    }
    if (transitionTimeoutId) {
      clearTimeout(transitionTimeoutId);
      transitionTimeoutId = null;
    }
    
    // Calculate which physical card is now at center (0° effective angle)
    // Use floor instead of round for more predictable behavior on iOS
    const normalizedRotation = ((mobileCurrentRotation % 360) + 360) % 360;
    const rawIndex = (360 - normalizedRotation) / 60;
    const centerCardIndex = (Math.floor(rawIndex + 0.5)) % 6;
    
    console.log('After rotation:');
    console.log('  mobileCurrentRotation:', mobileCurrentRotation);
    console.log('  Physical card at center:', centerCardIndex);
    
    // Update current center camera to what's now at center
    currentCenterCamera = cardCameras[centerCardIndex];
    console.log('  New center camera:', currentCenterCamera?.Location);
    
    // Calculate top and bottom card positions relative to center
    const topCardIndex = (centerCardIndex + 1) % 6;
    const bottomCardIndex = (centerCardIndex + 5) % 6;
    
    // Get the actual neighbor cameras from the current center
    const topNeighbor = getNeighborCamera(currentCenterCamera, 'pos');
    const bottomNeighbor = getNeighborCamera(currentCenterCamera, 'neg');
    
    // Ensure top and bottom positions have the correct neighbors
    cardCameras[topCardIndex] = topNeighbor;
    cardCameras[bottomCardIndex] = bottomNeighbor;
    
    console.log('  Set top neighbor (P' + topCardIndex + '):', topNeighbor?.Location || 'null');
    console.log('  Set bottom neighbor (P' + bottomCardIndex + '):', bottomNeighbor?.Location || 'null');
    
    // Update the card at far back (180° from center) with next in chain
    const backCardIndex = (centerCardIndex + 3) % 6;
    
    if (direction === 'down') {
      // Chain from top neighbor: get its POS neighbor
      const nextInChain = topNeighbor ? getNeighborCamera(topNeighbor, 'pos') : null;
      cardCameras[backCardIndex] = nextInChain;
      console.log(`  Updated far back (P${backCardIndex}) with: ${nextInChain?.Location || 'null'}`);
    } else {
      // Chain from bottom neighbor: get its NEG neighbor
      const prevInChain = bottomNeighbor ? getNeighborCamera(bottomNeighbor, 'neg') : null;
      cardCameras[backCardIndex] = prevInChain;
      console.log(`  Updated far back (P${backCardIndex}) with: ${prevInChain?.Location || 'null'}`);
    }
    
    // Update the physical cards that changed (top, bottom, and back)
    const slides = mobileGallery.querySelectorAll('.mobile-slide');
    [topCardIndex, bottomCardIndex, backCardIndex].forEach(idx => {
      const slide = slides[idx];
      const camera = cardCameras[idx];
      if (slide) {
        const img = slide.querySelector('img');
        if (img) {
          if (camera) {
            const newSrc = camera?.Views?.[0]?.Url || '';
            // Only update src if it changed (iOS optimization)
            if (img.src !== newSrc) {
              img.src = newSrc;
              // Force image decode on iOS for smoother rendering
              if (img.decode) {
                img.decode().catch(() => {});
              }
            }
            img.alt = camera?.Location || 'Camera';
          } else {
            img.src = '';
            img.alt = '';
          }
        }
      }
    });
    
    console.log('After update - cardCameras:', cardCameras.map((cam, i) => `P${i}: ${cam?.Location || 'null'}`).join(', '));
    
    // Update info deck with current center camera
    if (currentCenterCamera) {
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
    
    // Update visible card borders
    updateVisibleCardBorders();
    
    // Update modal title
    const modalTitle = document.querySelector('#imageModal .modal-title');
    if (modalTitle && currentCenterCamera) {
      modalTitle.textContent = currentCenterCamera?.Location || 'Camera';
    }
    
    isUpdating = false;
  };
  
  // Add event listener for transitionend, with setTimeout fallback for safety
  mobileGallery.addEventListener('transitionend', handleTransitionEnd);
  
  // Fallback timeout in case transitionend doesn't fire (iOS quirk)
  transitionTimeoutId = setTimeout(() => {
    if (!hasExecuted && isUpdating) {
      console.warn('Transitionend did not fire, using timeout fallback');
      handleTransitionEnd({ propertyName: 'transform' });
    }
  }, 500);
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
      // Force redraw on iOS - helps with render synchronization
      void mobileGallery.offsetHeight;
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
  
  // Prevent snap during button-triggered rotation
  isUpdating = true;
  
  // Use floor instead of round for more consistent snapping on iOS
  const nearestStep = Math.floor(mobileCurrentRotation / ANGLE_STEP + 0.5);
  const targetRotation = nearestStep * ANGLE_STEP;
  const normalizedRotation = ((targetRotation % 360) + 360) % 360;
  const rawPosition = normalizedRotation / ANGLE_STEP;
  const centeredPosition = (Math.floor(rawPosition + 0.5)) % NUM_SLIDES;
  
  console.log('  nearestStep:', nearestStep);
  console.log('  targetRotation:', targetRotation);
  console.log('  normalizedRotation:', normalizedRotation);
  console.log('  centeredPosition:', centeredPosition);
  
  mobileGallery.style.transition = 'transform 0.3s ease-out';
  mobileCurrentRotation = targetRotation;
  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
  
  // Use transitionend event instead of setTimeout for iOS reliability
  let snapExecuted = false;
  const handleSnapTransitionEnd = (e) => {
    // iOS safety: check property name and prevent multiple executions
    if (e && e.propertyName && e.propertyName !== 'transform') return;
    if (snapExecuted) return;
    snapExecuted = true;
    
    if (mobileGallery) {
      mobileGallery.removeEventListener('transitionend', handleSnapTransitionEnd);
      mobileGallery.style.transition = 'transform 0.6s ease';
      console.log('  Calling handleCameraChange with position:', centeredPosition);
      handleCameraChange(centeredPosition);
    }
  };
  
  mobileGallery.addEventListener('transitionend', handleSnapTransitionEnd);
  
  // Fallback timeout in case transitionend doesn't fire
  setTimeout(() => {
    if (!snapExecuted) {
      console.warn('Snap transitionend did not fire, using fallback');
      handleSnapTransitionEnd({ propertyName: 'transform' });
    }
  }, 400);
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
  
  // Calculate final center card after all rotations
  // Use floor instead of round for more predictable behavior on iOS
  const normalizedRotation = ((mobileCurrentRotation % 360) + 360) % 360;
  const rawIndex = (360 - normalizedRotation) / 60;
  const finalCenterCardIndex = (Math.floor(rawIndex + 0.5)) % 6;
  
  // Update current center camera
  currentCenterCamera = cardCameras[finalCenterCardIndex];
  
  // Calculate top and bottom positions relative to new center
  const topCardIndex = (finalCenterCardIndex + 1) % 6;
  const bottomCardIndex = (finalCenterCardIndex + 5) % 6;
  
  // Get the actual neighbor cameras from the new center
  const topNeighbor = getNeighborCamera(currentCenterCamera, 'pos');
  const bottomNeighbor = getNeighborCamera(currentCenterCamera, 'neg');
  
  // Update top and bottom with correct neighbors
  cardCameras[topCardIndex] = topNeighbor;
  cardCameras[bottomCardIndex] = bottomNeighbor;
  
  // Update back cards with chained neighbors
  const direction = stepsFromCenter > 0 ? 'down' : 'up';
  
  // Position 2 cards from center in each direction need updating
  if (direction === 'down') {
    // Update cards ahead in rotation direction
    const card2ahead = (finalCenterCardIndex + 2) % 6;
    const card3ahead = (finalCenterCardIndex + 3) % 6;
    cardCameras[card2ahead] = topNeighbor ? getNeighborCamera(topNeighbor, 'pos') : null;
    cardCameras[card3ahead] = cardCameras[card2ahead] ? getNeighborCamera(cardCameras[card2ahead], 'pos') : null;
  } else {
    // Update cards behind in rotation direction
    const card2behind = (finalCenterCardIndex + 4) % 6;
    const card3behind = (finalCenterCardIndex + 3) % 6;
    cardCameras[card2behind] = bottomNeighbor ? getNeighborCamera(bottomNeighbor, 'neg') : null;
    cardCameras[card3behind] = cardCameras[card2behind] ? getNeighborCamera(cardCameras[card2behind], 'neg') : null;
  }
  
  console.log('  After updates - cardCameras:', cardCameras.map((cam, i) => `P${i}: ${cam?.Location || 'null'}`).join(', '));
  console.log('  Final center camera (P' + finalCenterCardIndex + '):', currentCenterCamera?.Location);
  
  // Update ALL physical card images to match updated cardCameras array
  const slides = mobileGallery.querySelectorAll('.mobile-slide');
  slides.forEach((slide, position) => {
    const camera = cardCameras[position];
    const img = slide.querySelector('img');
    if (img) {
      if (camera) {
        const newSrc = camera?.Views?.[0]?.Url || '';
        // Only update src if it changed (iOS optimization)
        if (img.src !== newSrc) {
          img.src = newSrc;
          // Force image decode on iOS for smoother rendering
          if (img.decode) {
            img.decode().catch(() => {});
          }
        }
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
  
  // Update visible card borders
  updateVisibleCardBorders();
  
  // Small delay before allowing next interaction (iOS timing)
  setTimeout(() => {
    console.log('  isUpdating -> false');
    isUpdating = false;
  }, 150);
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
