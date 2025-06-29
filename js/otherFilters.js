// js/otherFilters.js

import { refreshGallery } from './ui.js';

/**
 * Each entry becomes one “Other Filters” menu item.
 * - name:        menu label / data-value
 * - loader:      async or sync function returning an array of camera objects
 * - forecastHTML: OPTIONAL: just the <a class="weatherwidget-io"…> anchor
 */
export const otherFiltersConfig = [
  {
    name: 'Inactive Cameras',
    loader: () => {
      const all = window.camerasList || [];
      return all.filter(cam =>
        Array.isArray(cam.Views) &&
        String(cam.Views[0].Status).toLowerCase() === 'disabled'
      );
    }
  },
  {
    name: 'Idaho Cameras',
    loader: async () => {
      const res  = await fetch('IdahoCameras.json');
      const json = await res.json();
      return Array.isArray(json.CamerasList) ? json.CamerasList : [];
    },
    forecastHTML: `<a class="weatherwidget-io"
       href="https://forecast7.com/en/44d56n114d54/idaho-falls/"
       data-label_1="IDAHO FALLS"
       data-label_2="WEATHER"
       data-font="Verdana"
       data-icons="Climacons Animated"
       data-mode="Current"
       data-theme="weather_one">
      IDAHO FALLS WEATHER
    </a>`
  },
  {
    name: 'Zions Cameras',
    loader: async () => {
      const res  = await fetch('ZionCameras.json');
      const json = await res.json();
      return Array.isArray(json.CamerasList) ? json.CamerasList : [];
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

/** Renders the “Other Filters” dropdown */
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
 * Applies the given filter:
 * 1) loads cameraList
 * 2) prepends a forecast item if forecastHTML exists
 * 3) refreshes the gallery
 * 4) ensures the weatherwidget script is loaded and initialized
 */
export async function applyOtherFilter(name) {
  const cfg = otherFiltersConfig.find(f => f.name === name);
  if (!cfg) return;

  // 1) load cameras
  const cameraList = await cfg.loader();

  // 2) build mixed items array
  const items = [];
  if (cfg.forecastHTML) {
    items.push({ type: 'forecast', html: cfg.forecastHTML });
  }
  cameraList.forEach(cam => items.push({ type: 'camera', camera: cam }));

  // 3) redraw gallery
  refreshGallery(items);

  // 4) load & init weatherwidget
  const id = 'weatherwidget-io-js';
  if (!document.getElementById(id)) {
    const s = document.createElement('script');
    s.id = id;
    s.src = 'https://weatherwidget.io/js/widget.min.js';
    s.onload = () => {
      window.__weatherwidget_init?.();
      window.weatherwidget_init?.();
    };
    document.body.appendChild(s);
  } else {
    // if already loaded, just re-init to parse new anchors
    window.__weatherwidget_init?.();
    window.weatherwidget_init?.();
  }
}
