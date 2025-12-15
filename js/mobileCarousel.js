// js/mobileCarousel.js - Mobile-specific 3D drum carousel

let mobileCarouselContainer = null;
let mobileGallery = null;
let mobileCurrentRotation = 0;
let mobileTouchStartY = 0;

const RADIUS = 160;
const NUM_SLIDES = 6;
const ANGLE_STEP = 360 / NUM_SLIDES; // 60 degrees per slide

export function initMobileCarousel(centerCam, prevCam, nextCam) {
  if (window.innerWidth > 768) return; // Only for mobile
  
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;

  // Remove any existing mobile carousel
  removeMobileCarousel();

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

  // Build slides - Fill all 6 positions with the 3 cameras in order
  // This creates smooth continuous rotation
  const cameras = [centerCam, nextCam, prevCam].filter(Boolean);
  const slideCameras = [];
  
  // Fill 6 positions: center, next, prev, center, next, prev
  for (let i = 0; i < NUM_SLIDES; i++) {
    slideCameras.push(cameras[i % cameras.length]);
  }
  
  slideCameras.forEach((cam, i) => {
    const card = document.createElement('div');
    card.className = 'mobile-slide';
    card.style.transform = `rotateX(${i * ANGLE_STEP}deg) translateZ(${RADIUS}px)`;
    card.dataset.slideIndex = i;
    
    const img = document.createElement('img');
    img.src = cam?.Views?.[0]?.Url || '';
    img.alt = cam?.Location || 'Camera';
    img.loading = 'lazy';
    
    card.appendChild(img);
    mobileGallery.appendChild(card);
  });
  
  // Start at center camera (index 0)
  mobileCurrentRotation = 0;
  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;

  setupMobileControls();
  setupMobileTouchEvents();
}

function rotateMobile(direction) {
  if (!mobileGallery) return;
  
  // Rotate one step (60 degrees)
  mobileCurrentRotation += (direction === 'down' ? -ANGLE_STEP : ANGLE_STEP);
  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
  
  // Calculate current position (0-5)
  const normalizedRotation = ((mobileCurrentRotation % 360) + 360) % 360;
  const currentSlideIndex = Math.round(normalizedRotation / ANGLE_STEP) % NUM_SLIDES;
  
  // Pattern: 0=center, 1=next, 2=prev, 3=center, 4=next, 5=prev
  // Only switch cameras when landing on specific positions
  setTimeout(() => {
    if (currentSlideIndex === 1 || currentSlideIndex === 4) {
      // At next camera position
      document.getElementById('carouselNextButton')?.click();
    } else if (currentSlideIndex === 2 || currentSlideIndex === 5) {
      // At prev camera position
      document.getElementById('carouselPrevButton')?.click();
    }
    // Positions 0 and 3 are center - no switch needed
  }, 400); // Wait for rotation animation
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
    e.stopPropagation(); // Prevent touch from reaching gallery below
    mobileTouchStartY = e.touches[0].clientY;
  }, { passive: true });

  scene.addEventListener('touchmove', e => {
    e.stopPropagation(); // Prevent touch from reaching gallery below
    e.preventDefault(); // Prevent scrolling
    const deltaY = e.touches[0].clientY - mobileTouchStartY;
    mobileTouchStartY = e.touches[0].clientY;
    mobileCurrentRotation -= deltaY * 0.5; // Reversed direction
    if (mobileGallery) {
      mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
    }
  }, { passive: false }); // Must be non-passive to allow preventDefault

  scene.addEventListener('touchend', e => {
    e.stopPropagation(); // Prevent touch from reaching gallery below
    snapToNearestPosition();
  }, { passive: true });

  // Wheel support
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
  if (!mobileGallery) return;
  
  // Find the nearest snap position
  const nearestStep = Math.round(mobileCurrentRotation / ANGLE_STEP);
  const targetRotation = nearestStep * ANGLE_STEP;
  
  // Smooth transition to snap position
  mobileGallery.style.transition = 'transform 0.3s ease-out';
  mobileCurrentRotation = targetRotation;
  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
  
  // Restore default transition after snap completes
  setTimeout(() => {
    if (mobileGallery) mobileGallery.style.transition = 'transform 0.6s ease';
  }, 300);
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
}
