// js/mobileCarousel.js - Mobile-specific 3D drum carousel

let mobileCarouselContainer = null;
let mobileGallery = null;
let mobileSlides = [];
let mobileCurrentRotation = 0;
let mobileTotal = 0;
let mobileTouchStartY = 0;

const RADIUS = 140;
const NUM_SLIDES = 6; // Create full drum with 6 positions

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

  // Build slides from cameras - create full drum with duplicates
  const cameras = [prevCam, centerCam, nextCam].filter(Boolean);
  mobileTotal = NUM_SLIDES;
  const angleStep = 360 / NUM_SLIDES;
  
  // Create 6 slides: prev, center, next, prev, center, next
  for (let i = 0; i < NUM_SLIDES; i++) {
    const cam = cameras[i % cameras.length];
    const card = document.createElement('div');
    card.className = 'mobile-slide';
    card.style.transform = `rotateX(${i * angleStep}deg) translateZ(${RADIUS}px)`;
    
    const img = document.createElement('img');
    img.src = cam?.Views?.[0]?.Url || '';
    img.alt = cam?.Location || 'Camera';
    img.loading = 'lazy';
    
    card.appendChild(img);
    mobileGallery.appendChild(card);
  }

  mobileSlides = Array.from(mobileGallery.querySelectorAll('.mobile-slide'));
  
  // Start at center camera (rotate to show index 1)
  mobileCurrentRotation = -angleStep;
  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;

  setupMobileControls();
  setupMobileTouchEvents();
}

function rotateMobile(direction) {
  if (!mobileTotal || !mobileGallery) return;

  // Rotate by 60 degrees (360/6) to show next/prev
  const angleStep = 360 / NUM_SLIDES;
  
  if (direction === 'down') {
    mobileCurrentRotation -= angleStep;
  } else {
    mobileCurrentRotation += angleStep;
  }

  mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
  
  // After rotating 2 steps (120 degrees), trigger camera switch
  const rotationCount = Math.abs(Math.round(mobileCurrentRotation / angleStep));
  if (rotationCount % 2 === 0) {
    setTimeout(() => {
      if (direction === 'up') {
        document.getElementById('carouselPrevButton')?.click();
      } else {
        document.getElementById('carouselNextButton')?.click();
      }
    }, 100);
  }
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
    mobileCurrentRotation += deltaY * 0.5;
    if (mobileGallery) {
      mobileGallery.style.transform = `rotateX(${mobileCurrentRotation}deg)`;
    }
  }, { passive: false }); // Must be non-passive to allow preventDefault

  scene.addEventListener('touchend', e => {
    e.stopPropagation(); // Prevent touch from reaching gallery below
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
  mobileSlides = [];
  mobileCurrentRotation = 0;
  mobileTotal = 0;
}
