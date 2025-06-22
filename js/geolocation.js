// geolocation.js (50 nearest, clears on other filter, controls one-time permission prompt)

import { computeDistance } from './utils.js';
import { renderGallery, updateCameraCount } from './gallery.js';
import { updateSelectedFilters, updateURLParameters } from './ui.js';
import { filterImages } from './filters.js';

const STORAGE_KEY = 'udot-location-allowed';

/**
 * Geolocation options.
 */
const geoOptions = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
};

/**
 * Sort all cameras by distance to given lat/lng.
 * @param {number} lat
 * @param {number} lng
 * @returns {Array} Sorted cameras
 */
function getCamerasSortedByProximity(lat, lng) {
  return window.camerasList
    .map(cam => ({
      cam,
      distance: computeDistance(lat, lng, cam.Latitude, cam.Longitude)
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(x => x.cam);
}

/**
 * Activates the "Nearest Cameras" mode:
 *  - Clears all other filters
 *  - Picks top 50 by proximity
 *  - Renders gallery & updates UI
 */
function activateNearestCamerasMode(lat, lng) {
  window.isNearestFilterActive = true;
  window.nearestUserLocation = { lat, lng };

  // Clear all other filters
  window.selectedRegion = '';
  window.selectedCounty = '';
  window.selectedCity = '';
  window.selectedMaintenanceStation = '';
  window.selectedRoute = 'All';
  window.selectedOtherFilter = '';
  window.searchQuery = '';

  // Sort & pick nearest 50
  const sorted = getCamerasSortedByProximity(lat, lng);
  window.visibleCameras = sorted.slice(0, 50);
  window.currentIndex = 0;

  // Update badges, gallery, URL
  updateCameraCount();
  renderGallery(window.visibleCameras);
  updateSelectedFilters();
  updateURLParameters();
}

/**
 * Clears "Nearest Cameras" mode flags.
 * Does NOT re-render; that happens elsewhere.
 */
export function clearNearestCamerasMode() {
  window.isNearestFilterActive = false;
  window.nearestUserLocation = null;
}

/**
 * Centralized geolocation request:
 *  - On success: remember permission & activate nearest mode
 *  - On error/deny: clear flag & load default gallery
 */
function requestAndFilter() {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported');
    return loadDefaultGallery();
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      // ✅ user granted
      localStorage.setItem(STORAGE_KEY, 'yes');
      activateNearestCamerasMode(pos.coords.latitude, pos.coords.longitude);
    },
    err => {
      // ❌ user denied or error
      console.warn('Geolocation error:', err);
      localStorage.removeItem(STORAGE_KEY);
      loadDefaultGallery();
    },
    geoOptions
  );
}

/**
 * On app startup, decide whether to prompt or silently load defaults.
 *  - If never asked before → prompt now
 *  - If asked & still granted → prompt now (UA auto-grants)
 *  - If asked & UA wants to re-prompt → load defaults
 */
export async function initAutoLocationFilter() {
  const userAllowedBefore = localStorage.getItem(STORAGE_KEY) === 'yes';

  if (navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state === 'granted') {
        // UA still considers us granted
        return requestAndFilter();
      }
      // UA state is 'prompt' or 'denied'
      return userAllowedBefore
        ? loadDefaultGallery()
        : requestAndFilter();
    } catch {
      // Permissions API failed
      return userAllowedBefore
        ? loadDefaultGallery()
        : requestAndFilter();
    }
  }

  // No Permissions API → use our own flag
  return userAllowedBefore
    ? loadDefaultGallery()
    : requestAndFilter();
}

/**
 * Binds the “Locate Me” button to re-prompt for geolocation.
 */
export function setupLocateButton() {
  const btn = document.getElementById('nearestButton');
  if (!btn) return;
  btn.addEventListener('click', () => {
    requestAndFilter();
  });
}

/**
 * Helper to clear nearest mode and show the regular gallery
 */
function loadDefaultGallery() {
  clearNearestCamerasMode();
  filterImages();
}
