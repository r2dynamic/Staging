// js/main.js
// Entry point: orchestrates module imports and initializes the app

import { loadCameras, loadRoutes } from './dataLoader.js';
import { filterImages } from './filters.js';
import { setupCopyUrlButton } from './events.js';
import { copyURLToClipboard } from './utils.js';
import { setupCustomRouteBuilder } from './customRoute.js';

import {
  updateRegionDropdown,
  updateCountyDropdown,
  updateCityDropdown,
  updateMaintenanceStationDropdown,
  updateRouteOptions
} from './dropdowns.js';

import {
  setupModalMapToggle,
  setupModalCleanup,
  setupLongPressShare,
  setupOverviewModal
} from './modal.js';

import { setupNearestCameraButton, autoSortByLocation } from './geolocation.js';

import {
  setupSearchListener,
  setupRefreshButton,
  setupSizeSlider,
  setupDropdownHide,
  setupModalLinks,
  setupOtherFiltersListener
} from './events.js';

import {
  revealMainContent,
  fadeOutSplash,
  updateURLParameters,
  updateSelectedFilters,
  resetFilters,
  applyFiltersFromURL
} from './ui.js';

// --- Global State ---
window.selectedRegion = '';
window.selectedCounty = '';
window.selectedCity = '';
window.selectedMaintenanceStation = '';
window.selectedRoute = 'All';
window.selectedOtherFilter = '';
window.searchQuery = '';

window.camerasList = [];
window.curatedRoutes = [];
window.visibleCameras = [];
window.currentIndex = 0;

// Expose core functions on window (for console/debug)
window.filterImages = filterImages;
window.updateRegionDropdown = updateRegionDropdown;
window.updateCountyDropdown = updateCountyDropdown;
window.updateCityDropdown = updateCityDropdown;
window.updateMaintenanceStationDropdown = updateMaintenanceStationDropdown;
window.updateRouteOptions = updateRouteOptions;
window.copyURLToClipboard = copyURLToClipboard;

window.revealMainContent = revealMainContent;
window.fadeOutSplash = fadeOutSplash;
window.updateURLParameters = updateURLParameters;
window.updateSelectedFilters = updateSelectedFilters;
window.resetFilters = resetFilters;
window.applyFiltersFromURL = applyFiltersFromURL;

/**
 * Initializes cameras and routes, then sets up the app UI.
 */
async function initializeApp() {
  // 1. Load cameras & routes
  window.camerasList   = await loadCameras();
  window.curatedRoutes = await loadRoutes();

  // 2. Build dropdowns
  updateRegionDropdown();
  updateCountyDropdown();
  updateCityDropdown();
  updateMaintenanceStationDropdown();
  updateRouteOptions();

  // 3. If there's no multiRoute=… param, run the normal filter flow
  const params = new URLSearchParams(window.location.search);
  if (!params.has('multiRoute')) {
    applyFiltersFromURL();
    filterImages();
  }
}

// Kick off the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await initializeApp();

  // Nearest camera button
  setupNearestCameraButton();

  // Only auto-sort by location if the user did NOT supply any URL filters
  const initialParams = new URLSearchParams(window.location.search);
  if ([...initialParams.keys()].length === 0) {
    autoSortByLocation();
  }

  // Core UI controls
  setupRefreshButton();
  setupSearchListener();
  setupDropdownHide();
  setupModalLinks();
  setupOtherFiltersListener();
  setupSizeSlider();
  setupModalMapToggle();
  setupModalCleanup();
  setupOverviewModal();
  setupCopyUrlButton();

  // Custom Route Builder
  setupCustomRouteBuilder();

  // Splash screen logic with fallback timers
  const splash = document.getElementById('splashScreen');
  if (splash) {
    const dv = document.getElementById('desktopVideo');
    if (dv) {
      dv.addEventListener('playing',  () => setTimeout(fadeOutSplash, 2300));
      dv.addEventListener('error',    () => setTimeout(fadeOutSplash, 2000));
    }
    // Always hide splash after 3 seconds
    setTimeout(fadeOutSplash, 3000);
  }

  // Long-press image share handlers
  setupLongPressShare('.aspect-ratio-box img');
  setupLongPressShare('#imageModal img');

  // Hide all collapse panels initially
  ['regionOptions','countyOptions','cityOptions','maintenanceOptions','otherFiltersOptions']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) bootstrap.Collapse.getOrCreateInstance(el, { toggle: false }).hide();
    });
});
