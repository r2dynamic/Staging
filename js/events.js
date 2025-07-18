/**
 * Sets up header control button toggles.
 * The first 4 header buttons toggle on/off. The refresh button is only temporarily active.
 */
export function setupHeaderButtonToggles() {
  // IDs of the first 4 header buttons
  const buttonIds = [
    'cameraCount',
    'filterDropdownButton',
    'routeFilterButton',
    'searchDropdownButton'
  ];
  const buttons = buttonIds.map(id => document.getElementById(id)).filter(Boolean);

  // Helper: deactivate all header buttons
  function deactivateAll() {
    buttons.forEach(btn => btn.classList.remove('active'));
  }

  // Attach click and dropdown events
  buttons.forEach(btn => {
    if (btn.classList.contains('dropdown-toggle')) {
      const parent = btn.closest('.dropdown');
      if (parent) {
        // When dropdown is shown, activate this button and deactivate others
        parent.addEventListener('show.bs.dropdown', () => {
          deactivateAll();
          btn.classList.add('active');
        });
        // When dropdown is hidden, deactivate this button
        parent.addEventListener('hide.bs.dropdown', () => {
          btn.classList.remove('active');
        });
        // Do NOT override Bootstrap's click for dropdowns; let Bootstrap handle open/close
      }
    } else {
      // For non-dropdown buttons: toggle active, only one at a time
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
        } else {
          deactivateAll();
          btn.classList.add('active');
        }
      });
    }
  });

  // Refresh button: only show active briefly
  const refreshBtn = document.getElementById('refreshButton');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      refreshBtn.classList.add('active');
      setTimeout(() => refreshBtn.classList.remove('active'), 400);
    });
  }
}
// events.js
import { debounce, getDistance } from './utils.js';
import { filterImages } from './filters.js';
// --- Dropdown auto-close on header scroll ---
export function setupDropdownAutoCloseOnHeaderScroll() {
  const header = document.querySelector('.header-controls');
  if (!header) return;
  const dropdownButtons = document.querySelectorAll('.dropdown-toggle');
  let lastVisible = true;
  function checkHeaderVisibility() {
    const rect = header.getBoundingClientRect();
    // Close dropdown as soon as header top leaves the viewport (not just bottom)
    const visible = rect.top >= 0;
    if (lastVisible && !visible) {
      dropdownButtons.forEach(btn => {
        const instance = window.bootstrap?.Dropdown?.getInstance(btn);
        if (instance) instance.hide();
      });
    }
    lastVisible = visible;
  }
  window.addEventListener('scroll', checkHeaderVisibility, { passive: true });
}
import { updateURLParameters } from './ui.js';
import { copyURLToClipboard } from './ui.js';

const DEBOUNCE_DELAY = 300;
const MIN_IMAGE_SIZE = 80;

export function setupCopyUrlButton() {
  const btn = document.getElementById('copyUrlButton');
  if (!btn) return;

  btn.addEventListener('click', e => {
    e.preventDefault();

    // ensure address bar is up‑to‑date
    updateURLParameters();

    copyURLToClipboard()
      .then(() => {
        // Optional feedback:
        const old = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = old, 1500);
      })
      .catch(err => {
        console.error('Failed to copy URL:', err);
      });
  });
}


/**
 * Sets up the search input listener with debounce.
 */
export function setupSearchListener() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  searchInput.addEventListener('input', debounce(e => {
    window.searchQuery = e.target.value;
    filterImages();
  }, DEBOUNCE_DELAY));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      bootstrap.Dropdown.getInstance(document.getElementById('searchDropdownButton'))?.hide();
    }
  });
}

/**
 * Sets up the refresh button to bust image cache.
 */
export function setupRefreshButton() {
  const refreshButton = document.getElementById('refreshButton');
  if (!refreshButton) return;
  refreshButton.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('imageGallery').querySelectorAll('img').forEach(img => {
      let orig = img.dataset.originalSrc || img.src;
      img.dataset.originalSrc = orig;
      orig = orig.split('?refresh=')[0];
      img.src = orig + (orig.includes('?') ? '&' : '?') + 'refresh=' + Date.now();
    });
  });
}

/**
 * Sets up the image size slider and pinch-zoom controls.
 */
export function setupSizeSlider() {
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeControlButton = document.getElementById('sizeControlButton');
  const sizeSliderContainer = document.getElementById('sizeSliderContainer');
  if (sizeControlButton && sizeSliderContainer) {
    sizeControlButton.addEventListener('click', e => {
      e.stopPropagation();
      sizeSliderContainer.classList.toggle('active');
      setTimeout(() => sizeSliderContainer.classList.remove('active'), 3000);
    });
  }
  if (!sizeSlider) return;
  const galleryContainer = document.getElementById('imageGallery');
  sizeSlider.addEventListener('input', () => {
    const v = parseInt(sizeSlider.value, 10);
    const n = Math.max(v, MIN_IMAGE_SIZE);
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${n}px, 1fr))`;
    window.userImageSizeOverride = true;
    clearTimeout(sizeSlider.autoHideTimeout);
    sizeSlider.autoHideTimeout = setTimeout(() => sizeSliderContainer && sizeSliderContainer.classList.remove('active'), 3000);
  });
  document.addEventListener('click', e => {
    if ((sizeControlButton && !sizeControlButton.contains(e.target)) && (sizeSliderContainer && !sizeSliderContainer.contains(e.target))) {
      if (sizeSliderContainer) sizeSliderContainer.classList.remove('active');
    }
  });

  // Pinch-zoom handling
  let initialGridDistance = null;
  let initialGridSize     = parseInt(sizeSlider.value, 10) || 120;
  galleryContainer.style.touchAction = 'pan-y pinch-zoom';
  galleryContainer.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialGridDistance = getDistance(e.touches[0], e.touches[1]);
      initialGridSize     = parseInt(sizeSlider.value, 10) || 120;
    }
  }, { passive: false });
  galleryContainer.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && initialGridDistance) {
      e.preventDefault();
      const currentDist = getDistance(e.touches[0], e.touches[1]);
      let newSize = Math.round(initialGridSize * (currentDist / initialGridDistance));
      newSize = Math.max(MIN_IMAGE_SIZE, Math.min(newSize, parseInt(sizeSlider.max, 10) || 380));
      sizeSlider.value = newSize;
      galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${newSize}px, 1fr))`;
    }
  }, { passive: false });
  galleryContainer.addEventListener('touchend', () => {
    initialGridDistance = null;
  }, { passive: true });
}

/**
 * Hides open dropdown panels when the main filter button is collapsed.
 */
export function setupDropdownHide() {
  const parent = document.getElementById('filterDropdownButton')?.parentElement;
  if (!parent) return;
  parent.addEventListener('hide.bs.dropdown', () => {
    ['regionOptions', 'countyOptions', 'cityOptions', 'maintenanceOptions', 'otherFiltersOptions']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) bootstrap.Collapse.getOrCreateInstance(el).hide();
      });
  });
}

/**
 * Links any [data-modal] items to their respective Bootstrap modals.
 */
export function setupModalLinks() {
  document.querySelectorAll('[data-modal]').forEach(item =>
    item.addEventListener('click', e => {
      e.preventDefault();
      new bootstrap.Modal(document.getElementById(item.dataset.modal)).show();
    })
  );
}


/** Attach click handlers for “Other Filters” submenu items 
export function setupOtherFiltersListener() {
  document
    .querySelectorAll('#otherFiltersMenu .dropdown-item')
    .forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        // Set the global and re-filter
        window.selectedOtherFilter = item.dataset.value;
        filterImages();
        updateURLParameters();
        // Close the submenu
        bootstrap.Collapse
          .getOrCreateInstance(document.getElementById('otherFiltersOptions'))
          .hide();
      });
    });
}*/