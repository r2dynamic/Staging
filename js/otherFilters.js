// js/otherFilters.js

import { refreshGallery } from './ui.js';

/**
 * Configuration for each "Other Filters" menu item.
 * - name         : dropdown label & data-value
 * - loader       : returns/resolves to an array of camera objects
 * - forecastHTML : optional HTML anchor snippet for the weather widget
 */
export const otherFiltersConfig = [
  {
    name: 'Inactive Cameras',
    loader: () => {
      const all = Array.isArray(window.camerasList) ? window.camerasList : [];
      return all.filter(cam =>
        Array.isArray(cam.Views) &&
        String(cam.Views[0].Status).toLowerCase() === 'disabled'
      );
    }
  },
  {
    name: 'Idaho Cameras',
    loader: async () => {
      try {
        const res = await fetch('IdahoCameras.json');
        const json = await res.json();
        return Array.isArray(json.CamerasList) ? json.CamerasList : [];
      } catch (err) {
        console.error('Error loading IdahoCameras.json', err);
        return [];
      }
    },
    forecastHTML: `<a class="weatherwidget-io"
       href="https://forecast7.com/en40d30n111d69/orem/"
       data-label_1="OREM"
       data-label_2="WEATHER"
       data-font="Verdana"
       data-icons="Climacons Animated"
       data-mode="Current"
       data-theme="weather_one">
      OREM WEATHER
    </a>`
  },
  {
    name: 'Zions Cameras',
    loader: async () => {
      try {
        const res = await fetch('ZionCameras.json');
        const json = await res.json();
        return Array.isArray(json.CamerasList) ? json.CamerasList : [];
      } catch (err) {
        console.error('Error loading ZionCameras.json', err);
        return [];
      }
    },
    forecastHTML: `<a class="weatherwidget-io"
       href="https://forecast7.com/en/37d19n113d00/springdale/"
       data-label_1="SPRINGDALE"
       data-label_2="WEATHER"
       data-font="Verdana"
       data-icons="Climacons Animated"
       data-mode="Current"
       data-theme="weather_one">
      SPRINGDALE WEATHER
    </a>`
  }
];

/**
 * Renders the “Other Filters” dropdown menu.
 */
export function renderOtherFiltersMenu(rootEl) {
  rootEl.innerHTML = otherFiltersConfig
    .map(cfg => `
      <li>
        <a class="dropdown-item" href="#" data-value="${cfg.name}">
          ${cfg.name}
        </a>
      </li>
    `)
    .join('');
}

/**
 * Applies the selected filter:
 * 1. Load cameras via loader()
 * 2. Prepend forecast tile if forecastHTML exists
 * 3. Refresh gallery with unified items
 * 4. Load or re-init the weatherwidget.io script
 */
export async function applyOtherFilter(name) {
  const cfg = otherFiltersConfig.find(f => f.name === name);
  if (!cfg) {
    console.warn(`No Other Filter configured for “${name}”`);
    return;
  }

  // 1) load camera list
  const cameraList = await cfg.loader();

  // 2) build mixed items array
  const items = [];
  if (cfg.forecastHTML) {
    items.push({ type: 'forecast', html: cfg.forecastHTML });
  }
  cameraList.forEach(cam => items.push({ type: 'camera', camera: cam }));

  // 3) redraw gallery
  refreshGallery(items);

  // 4) ensure weatherwidget.io script is loaded & initialized
  const scriptId = 'weatherwidget-io-js';
  if (!document.getElementById(scriptId)) {
    const s = document.createElement('script');
    s.id = scriptId;
    s.src = 'https://weatherwidget.io/js/widget.min.js';
    s.onload = () => {
      if (typeof __weatherwidget_init === 'function') __weatherwidget_init();
      if (typeof weatherwidget_init === 'function') weatherwidget_init();
    };
    document.body.appendChild(s);
  } else {
    if (typeof __weatherwidget_init === 'function') __weatherwidget_init();
    if (typeof weatherwidget_init === 'function') weatherwidget_init();
  }
}
