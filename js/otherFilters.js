// js/otherFilters.js

import { refreshGallery } from './ui.js';

/**
 * Each entry here drives one menu item in “Other Filters”.
 * - name: what shows up in the dropdown (must exactly match data-value)
 * - loader: returns (or resolves to) an array of camera objects
 */
export const otherFiltersConfig = [
  {
    name: 'Inactive Cameras',
    loader: () => {
      const all = Array.isArray(window.camerasList) ? window.camerasList : [];
      // only include cams whose first View has Status === 'Disabled'
      return all.filter(cam => 
        Array.isArray(cam.Views) &&
        String(cam.Views[0].Status).toLowerCase() === 'disabled'
      );
    }
  },
  {
    name: 'Idaho Cameras',
    loader: async () => {
      if (!window.idahoCamerasList) {
        try {
          const res  = await fetch('IdahoCameras.json');
          const json = await res.json();
          window.idahoCamerasList = Array.isArray(json.CamerasList)
            ? json.CamerasList
            : [];
        } catch (err) {
          console.error('Failed to load IdahoCameras.json:', err);
          window.idahoCamerasList = [];
        }
      }
      return window.idahoCamerasList;
    }
  },
    {
    name: 'Zions Cameras',
    loader: async () => {
      if (!window.idahoCamerasList) {
        try {
          const res  = await fetch('ZionCameras.json');
          const json = await res.json();
          window.idahoCamerasList = Array.isArray(json.CamerasList)
            ? json.CamerasList
            : [];
        } catch (err) {
          console.error('Failed to load IdahoCameras.json:', err);
          window.idahoCamerasList = [];
        }
      }
      return window.idahoCamerasList;
    }
  }
  // → to add more later, just append another { name, loader } here
];

/**
 * Populates the <ul id="otherFiltersMenu"> with one <li> per config entry.
 */
export function renderOtherFiltersMenu(rootEl) {
  rootEl.innerHTML = otherFiltersConfig
    .map(cfg => `
      <li>
        <a class="dropdown-item" href="#" data-value="${cfg.name}">
          ${cfg.name}
        </a>
      </li>
    `).join('');
}

/**
 * Given a filter name, finds its config, runs its loader,
 * then hands the resulting array into refreshGallery().
 */
export async function applyOtherFilter(name) {
  console.log('[OtherFilters] applyOtherFilter()', name);
  const cfg = otherFiltersConfig.find(f => f.name === name);
  if (!cfg) {
    console.warn(`[OtherFilters] no config found for “${name}”`);
    return;
  }

  let list = [];
  try {
    list = await cfg.loader();
    console.log(`[OtherFilters] loader returned ${list.length} items`);
  } catch (err) {
    console.error('[OtherFilters] loader error', err);
  }

  refreshGallery(list);
}
