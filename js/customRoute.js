// js/customRoute.js
// Module for building multi-segment custom routes via a URL-driven form and preview map

import { refreshGallery, updateSelectedFilters } from './ui.js';
import { copyURLToClipboard } from './utils.js';

// ===== Utility Functions =====
function normalizeRouteInput(input) {
  return (input || '').toString().replace(/\D+/g, '');
}
function normalizeCameraRoute(route) {
  return (route || '').toString().replace(/P$/i, '').replace(/\D+/g, '');
}

function isCameraOnSegment(camera, segment) {
  const target = segment.name;
  // check RoadwayOption1
  const r1 = normalizeCameraRoute(camera.RoadwayOption1);
  if (r1 === target) {
    const mp = camera.MilepostOption1;
    if ((segment.mpMin != null && mp < segment.mpMin) ||
        (segment.mpMax != null && mp > segment.mpMax)) return false;
    return true;
  }
  // check RoadwayOption2
  const r2 = normalizeCameraRoute(camera.RoadwayOption2);
  if (r2 === target) {
    const mp = camera.MilepostOption2;
    if ((segment.mpMin != null && mp < segment.mpMin) ||
        (segment.mpMax != null && mp > segment.mpMax)) return false;
    return true;
  }
  return false;
}

function computeCustomRouteCameras(segments) {
  const cams = (window.camerasList || []).filter(cam => cam.Views?.[0]?.Status !== 'Disabled');
  const seen = new Set();
  const result = [];
  segments.forEach(seg => {
    const segName = seg.name;
    const asc = seg.mpMin <= seg.mpMax;
    // find matching cameras
    const matches = cams.filter(cam => isCameraOnSegment(cam, seg));
    // sort by MP
    matches.sort((a, b) => {
      // get MP for camera a
      const mpA = normalizeCameraRoute(a.RoadwayOption1) === segName
        ? a.MilepostOption1 : a.MilepostOption2;
      const mpB = normalizeCameraRoute(b.RoadwayOption1) === segName
        ? b.MilepostOption1 : b.MilepostOption2;
      return asc ? mpA - mpB : mpB - mpA;
    });
    // append unique
    matches.forEach(cam => {
      if (!seen.has(cam.Id)) {
        seen.add(cam.Id);
        result.push(cam);
      }
    });
  });
  return result;
}

function serializeSegments(segments) {
  return segments
    .map(seg => `${seg.name}:${seg.mpMin}-${seg.mpMax}`)
    .join(',');
}

function parseSegmentsParam(param) {
  if (!param) return [];
  return param.split(',').map(chunk => {
    const [namePart, mpPart] = chunk.split(':');
    const [minS, maxS] = (mpPart || '').split('-');
    return {
      name: normalizeRouteInput(namePart),
      mpMin: parseFloat(minS),
      mpMax: parseFloat(maxS)
    };
  }).filter(seg => seg.name && !isNaN(seg.mpMin) && !isNaN(seg.mpMax));
}

// ===== DOM & State =====
let modal, mapInstance;
const state = {
  segments: []  // { name, mpMin, mpMax }
};

// ===== Form Row Management =====
function addSegmentRow(data = { name: '', mpMin: '', mpMax: '' }) {
  const container = document.getElementById('customRouteFields');
  const idx = container.children.length;
  const row = document.createElement('div');
  row.className = 'd-flex gap-2 align-items-center';

  // Route input
  const routeIn = document.createElement('input');
  routeIn.type = 'text';
  routeIn.placeholder = 'Route Number';
  routeIn.value = data.name;
  routeIn.className = 'form-control glass-dropdown-input flex-fill';
  row.append(routeIn);

  // MP Min
  const mpMinIn = document.createElement('input');
  mpMinIn.type = 'number';
  mpMinIn.placeholder = 'MP start';
  mpMinIn.value = data.mpMin;
  mpMinIn.className = 'form-control glass-dropdown-input';
  row.append(mpMinIn);

  // MP Max
  const mpMaxIn = document.createElement('input');
  mpMaxIn.type = 'number';
  mpMaxIn.placeholder = 'MP end';
  mpMaxIn.value = data.mpMax;
  mpMaxIn.className = 'form-control glass-dropdown-input';
  row.append(mpMaxIn);

  // Remove button
  const rm = document.createElement('button');
  rm.type = 'button';
  rm.className = 'btn-close btn-close-white';
  row.append(rm);

  // Insert
  container.append(row);

  // Sync to state
  state.segments.splice(idx, 0, { name: data.name, mpMin: data.mpMin, mpMax: data.mpMax });

  function updateState() {
    state.segments[idx] = {
      name: normalizeRouteInput(routeIn.value),
      mpMin: parseFloat(mpMinIn.value),
      mpMax: parseFloat(mpMaxIn.value)
    };
    renderPreviewMap();
    updateApplyButtonState();
  }

  [routeIn, mpMinIn, mpMaxIn].forEach(input => {
    input.addEventListener('input', updateState);
  });
  rm.addEventListener('click', () => {
    state.segments.splice(idx, 1);
    row.remove();
    // rebuild indices
    renderPreviewMap();
    updateApplyButtonState();
  });
  return row;
}

function populateForm() {
  const container = document.getElementById('customRouteFields');
  container.innerHTML = '';
  if (!state.segments.length) {
    state.segments = [{ name: '', mpMin: '', mpMax: '' }];
  }
  state.segments.forEach(seg => addSegmentRow(seg));
}

function resetForm() {
  state.segments = [];
  populateForm();
  renderPreviewMap();
  updateApplyButtonState();
}

function updateApplyButtonState() {
  const btn = document.getElementById('applyRouteButton');
  const valid = state.segments.every(seg => seg.name && !isNaN(seg.mpMin) && !isNaN(seg.mpMax));
  btn.disabled = !valid;
}

// ===== URL & Badge Updates =====
function updateURL() {
  const params = new URLSearchParams(window.location.search);
  // preserve existing params except multiRoute
  params.delete('multiRoute');
  if (state.segments.length) {
    const s = serializeSegments(state.segments);
    if (s) params.set('multiRoute', s);
  }
  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

function renderPinnedBadges() {
  const cont = document.getElementById('selectedFilters');
  const badges = cont.querySelector('.badges');
  if (!badges) return;
  // remove old custom
  badges.querySelectorAll('.custom-route-badge').forEach(el => el.remove());
  state.segments.forEach(seg => {
    const d = document.createElement('div');
    d.className = 'filter-item custom-route-badge';
    d.innerHTML = `📍 ${seg.name}: ${seg.mpMin}–${seg.mpMax}`;
    badges.append(d);
  });
}

// ===== Preview Map =====
function renderPreviewMap() {
  if (mapInstance) mapInstance.remove();
  const mapDiv = document.getElementById('customRouteMap');
  mapInstance = L.map(mapDiv, { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: true });
  // tile layers
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(mapInstance);
  // plot
  const segments = state.segments.map(s => ({
    name: normalizeRouteInput(s.name),
    mpMin: s.mpMin,
    mpMax: s.mpMax
  }));
  const cams = computeCustomRouteCameras(segments);
  if (cams.length) {
    const pts = cams.map(c => [c.Latitude, c.Longitude]);
    const bounds = L.latLngBounds(pts);
    cams.forEach(c => L.circleMarker([c.Latitude, c.Longitude], { radius: 4, fillColor: '#ff7800', color: '#fff', weight: 1 }).addTo(mapInstance));
    mapInstance.fitBounds(bounds, { padding: [10,10], maxZoom: 14 });
  }
}

// ===== Apply Custom Route =====
function applyCustomRoute() {
  const segments = state.segments.map(s => ({ name: normalizeRouteInput(s.name), mpMin: s.mpMin, mpMax: s.mpMax }));
  const cams = computeCustomRouteCameras(segments);
  refreshGallery(cams);
  renderPinnedBadges();
  updateURL();
}

// ===== Initialization =====
export function setupCustomRouteBuilder() {
  // insert menu item
  const menu = document.getElementById('routeFilterMenu');
  const li = document.createElement('li');
  li.innerHTML = `<a id="launchCustomRouteButton" class="dropdown-item" href="#">🛠 Build Custom Route...</a>`;
  menu.prepend(li);
  // inject modal HTML
  document.body.insertAdjacentHTML('beforeend', `
<div class="modal fade" id="customRouteModal" tabindex="-1" aria-labelledby="customRouteLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-lg">
    <div class="modal-content glass-modal">
      <div class="modal-header"><h5 class="modal-title" id="customRouteLabel">Build Custom Route</h5></div>
      <div class="modal-body">
        <div class="d-flex flex-column flex-md-row">
          <div id="customRouteFormContainer" class="p-2 flex-fill">
            <div id="customRouteFields" class="d-flex flex-column gap-2"></div>
            <button id="addSegmentButton" type="button" class="button mt-2"><i class="fas fa-plus"></i> Add Segment</button>
          </div>
          <div id="customRouteMapContainer" class="p-2 flex-fill">
            <div id="customRouteMap" style="width:100%; height:300px;"></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="resetRouteFormButton" type="button" class="reset-button me-auto">Reset Form</button>
        <button id="copyRouteUrlButton" type="button" class="button me-2"><i class="fas fa-link"></i> Copy URL</button>
        <button id="applyRouteButton" type="button" class="button"><i class="fas fa-check"></i> Apply</button>
        <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
    </div>
  </div>
</div>
  `);

  // references
  modal = document.getElementById('customRouteModal');
  const launchBtn = document.getElementById('launchCustomRouteButton');
  const addBtn    = document.getElementById('addSegmentButton');
  const resetBtn  = document.getElementById('resetRouteFormButton');
  const copyBtn   = document.getElementById('copyRouteUrlButton');
  const applyBtn  = document.getElementById('applyRouteButton');
  const bsModal   = new bootstrap.Modal(modal);

  // launch
  launchBtn.addEventListener('click', e => { e.preventDefault(); bsModal.show(); });
  // on show
  modal.addEventListener('shown.bs.modal', () => {
    populateForm();
    renderPreviewMap();
    updateApplyButtonState();
  });
  // on hide
  modal.addEventListener('hidden.bs.modal', () => {
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
  });

  addBtn.addEventListener('click', () => { addSegmentRow(); updateApplyButtonState(); });
  resetBtn.addEventListener('click', () => resetForm());
  copyBtn.addEventListener('click', () => {
    updateURL();
    copyURLToClipboard().then(() => alert('URL copied!'));
  });
  applyBtn.addEventListener('click', () => {
    applyCustomRoute();
    bsModal.hide();
  });

  // parse URL on load
  const params = new URLSearchParams(window.location.search);
  if (params.has('multiRoute')) {
    state.segments = parseSegmentsParam(params.get('multiRoute'));
    applyCustomRoute();
  }
}
