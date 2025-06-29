// js/otherFilters.js

import { refreshGallery } from './ui.js';

/**
 * Configuration for each "Other Filters" menu item.
 * - name: dropdown label & data-value
 * - loader: returns/resolves to an array of camera objects
 * - forecastHTML: optional HTML string for a weather widget (<a>…</a> + <script>)
 */
export const otherFiltersConfig = [
  {
    name: 'Inactive Cameras',
    loader: () => {
      console.log('[OtherFilters] loader: Inactive Cameras');
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
      console.log('[OtherFilters] loader: Idaho Cameras');
      try {
        const res = await fetch('IdahoCameras.json');
        const json = await res.json();
        const list = Array.isArray(json.CamerasList) ? json.CamerasList : [];
        console.log(`[OtherFilters] Idaho Cameras → ${list.length} items`);
        return list;
      } catch (err) {
        console.error('[OtherFilters] Idaho loader error', err);
        return [];
      }
    },
    forecastHTML: `<a class="weatherwidget-io" href="https://forecast7.com/en/44d56n114d54/idaho-falls/"
       data-label_1="IDAHO FALLS" data-label_2="WEATHER" data-font="Verdana"
       data-icons="Climacons Animated" data-mode="Current" data-theme="weather_one">
      IDAHO FALLS WEATHER
    </a>
    <script>
    !function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];
    if(!d.getElementById(id)){js=d.createElement(s);js.id=id;
    js.src='https://weatherwidget.io/js/widget.min.js';
    fjs.parentNode.insertBefore(js,fjs);} }(document,'script','weatherwidget-io-js');
    </script>`
  },
  {
    name: 'Zions Cameras',
    loader: async () => {
      console.log('[OtherFilters] loader: Zions Cameras');
      try {
        const res = await fetch('ZionCameras.json');
        const json = await res.json();
        const list = Array.isArray(json.CamerasList) ? json.CamerasList : [];
        console.log(`[OtherFilters] Zions Cameras → ${list.length} items`);
        return list;
      } catch (err) {
        console.error('[OtherFilters] Zions loader error', err);
        return [];
      }
    },
    forecastHTML: `<a class="weatherwidget-io" href="https://forecast7.com/en/37d19n113d00/springdale/"
       data-label_1="SPRINGDALE" data-label_2="WEATHER" data-font="Verdana"
       data-icons="Climacons Animated" data-mode="Current" data-theme="weather_one">
      SPRINGDALE WEATHER
    </a>
    <script>
    !function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];
    if(!d.getElementById(id)){js=d.createElement(s);js.id=id;
    js.src='https://weatherwidget.io/js/widget.min.js';
    fjs.parentNode.insertBefore(js,fjs);} }(document,'script','weatherwidget-io-js');
    </script>`
  }
];

/** Renders the "Other Filters" dropdown menu. */
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
 */
export async function applyOtherFilter(name) {
  console.log('[OtherFilters] applyOtherFilter()', name);
  const cfg = otherFiltersConfig.find(f => f.name === name);
  if (!cfg) {
    console.warn(`No Other Filter configured for “${name}”`);
    return;
  }

  // Load cameras
  const cameraList = await cfg.loader();

  // Build items array
  const items = [];
  if (cfg.forecastHTML) {
    items.push({ type: 'forecast', html: cfg.forecastHTML });
  }
  cameraList.forEach(cam => items.push({ type: 'camera', camera: cam }));

  // Render
  refreshGallery(items);
}

