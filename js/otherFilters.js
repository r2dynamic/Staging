// js/otherFilters.js

import { refreshGallery } from './ui.js';

/** ─── Global Weather Settings (shared across all filters) ───── */
const WEATHER_SETTINGS = {
  timezone:        'America/Denver',  // your fixed timezone
  temperatureUnit: 'fahrenheit',      // units for temperature
  windspeedUnit:   'mph'              // units for windspeed (unused here)
};

/**
 * Fetches current temperature (°F) from Open-Meteo for given lat/lon.
 * No API key required.
 */
async function fetchCurrentTemp(lat, lon) {
  const { timezone, temperatureUnit, windspeedUnit } = WEATHER_SETTINGS;
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',          lat);
  url.searchParams.set('longitude',         lon);
  url.searchParams.set('current_weather',  'true');
  url.searchParams.set('temperature_unit', temperatureUnit);
  url.searchParams.set('windspeed_unit',   windspeedUnit);
  url.searchParams.set('timezone',         timezone);

  const resp = await fetch(url);
  const data = await resp.json();
  const temp = data.current_weather?.temperature;
  return temp != null ? Math.round(temp) : '–';
}

/**
 * Configuration for each “Other Filters” menu item.
 * - name           : dropdown label & data-value
 * - loader         : async function returning CamerasList[]
 * - forecastLoader : OPTIONAL async function returning HTML for a preview tile
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
        const res  = await fetch('IdahoCameras.json');
        const json = await res.json();
        return Array.isArray(json.CamerasList) ? json.CamerasList : [];
      } catch (err) {
        console.error('Error loading IdahoCameras.json', err);
        return [];
      }
    }
    // no forecastLoader here
  },
  {
    name: 'Zions Cameras',
    loader: async () => {
      try {
        const res  = await fetch('ZionCameras.json');
        const json = await res.json();
        return Array.isArray(json.CamerasList) ? json.CamerasList : [];
      } catch (err) {
        console.error('Error loading ZionCameras.json', err);
        return [];
      }
    },
    // preview shows current temp; opens Windy modal on click
    forecastLoader: async () => {
  const temp = await fetchCurrentTemp(37.188976, -112.998541);
  return `
    <button type="button"
            class="forecast-preview"
            data-bs-toggle="modal"
            data-bs-target="#weatherModal">
      <i class="fas fa-cloud-sun"></i>
      <div class="temp-preview">${temp}°F</div>
      <div class="label-preview">Click for map</div>
    </button>`;
}
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
    `).join('');
}

/**
 * Applies the selected “Other Filter”:
 * 1) load cameras via cfg.loader()
 * 2) if cfg.forecastLoader exists, await it and prepend that tile
 * 3) append each camera as a camera tile
 * 4) refreshGallery(items)
 */
export async function applyOtherFilter(name) {
  const cfg = otherFiltersConfig.find(f => f.name === name);
  if (!cfg) {
    console.warn(`No Other Filter configured for “${name}”`);
    return;
  }

  // 1) load camera list
  const cameraList = await cfg.loader();

  // 2) build a mixed items array
  const items = [];
  if (typeof cfg.forecastLoader === 'function') {
    const html = await cfg.forecastLoader();
    if (html) {
      items.push({ type: 'forecast', html });
    }
  }
  cameraList.forEach(cam => items.push({ type: 'camera', camera: cam }));

  // 3) redraw the gallery
  refreshGallery(items);
}
