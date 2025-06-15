// js/customRoute.js
// Module for building multi-segment custom routes via a URL-driven form and preview map

import { refreshGallery } from './ui.js';
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
  const r1 = normalizeCameraRoute(camera.RoadwayOption1);
  if (r1 === target) {
    const mp = camera.MilepostOption1;
    if ((segment.mpMin != null && mp < segment.mpMin) ||
        (segment.mpMax != null && mp > segment.mpMax)) return false;
    return true;
  }
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
    const name = seg.name;
    const asc  = seg.mpMin <= seg.mpMax;
    const matches = cams.filter(cam => isCameraOnSegment(cam, seg));
    matches.sort((a, b) => {
      const mpA = normalizeCameraRoute(a.RoadwayOption1) === name
        ? a.MilepostOption1 : a.MilepostOption2;
      const mpB = normalizeCameraRoute(b.RoadwayOption1) === name
        ? b.MilepostOption1 : b.MilepostOption2;
      return asc ? mpA - mpB : mpB - mpA;
    });
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
  return segments.map(seg => `${seg.name}:${seg.mpMin}-${seg.mpMax}`).join(',');
}

function parseSegmentsParam(param) {
  if (!param) return [];
  return param.split(',').map(chunk => {
    const [rawName, range] = chunk.split(':');
    const [minS, maxS] = (range || '').split('-');
    return {
      name: normalizeRouteInput(rawName),
      mpMin: parseFloat(minS),
      mpMax: parseFloat(maxS)
    };
  }).filter(s => s.name && !isNaN(s.mpMin) && !isNaN(s.mpMax));
}

// ===== State =====
const state = { segments: [] };
let mapInstance;

// ===== Form Row Management =====
function addSegmentRow(data = { name: '', mpMin: '', mpMax: '' }) {
  const container = document.getElementById('customRouteFields');
  const index = container.children.length;
  const row = document.createElement('div');
  row.className = 'd-flex gap-2 align-items-center';

  const routeIn = document.createElement('input');
  routeIn.type = 'text';
  routeIn.placeholder = 'e.g. SR 209';
  routeIn.value = data.name;
  routeIn.className = 'form-control glass-dropdown-input flex-fill';

  const mpMinIn = document.createElement('input');
  mpMinIn.type = 'number';
  mpMinIn.placeholder = 'MP start';
  mpMinIn.value = data.mpMin;
  mpMinIn.className = 'form-control glass-dropdown-input';

  const mpMaxIn = document.createElement('input');
  mpMaxIn.type = 'number';
  mpMaxIn.placeholder = 'MP end';
  mpMaxIn.value = data.mpMax;
  mpMaxIn.className = 'form-control glass-dropdown-input';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-close btn-close-white';

  row.append(routeIn, mpMinIn, mpMaxIn, removeBtn);
  container.append(row);

  state.segments.splice(index, 0, { name: data.name, mpMin: data.mpMin, mpMax: data.mpMax });

  function updateState() {
    state.segments[index] = {
      name: normalizeRouteInput(routeIn.value),
      mpMin: parseFloat(mpMinIn.value),
      mpMax: parseFloat(mpMaxIn.value)
    };
    renderPreviewMap();
    updateApplyState();
  }

  [routeIn, mpMinIn, mpMaxIn].forEach(input => {
    input.addEventListener('input', updateState);
  });

  removeBtn.addEventListener('click', () => {
    state.segments.splice(index, 1);
    row.remove();
    renderPreviewMap();
    updateApplyState();
  });
}

function populateForm() {
  const container = document.getElementById('customRouteFields');
  container.innerHTML = '';
  if (!state.segments.length) state.segments = [{ name: '', mpMin: '', mpMax: '' }];
  state.segments.forEach(seg => addSegmentRow(seg));
}

function resetForm() {
  state.segments = [];
  populateForm();
  renderPreviewMap();
  updateApplyState();
}

function updateApplyState() {
  const btn = document.getElementById('applyRouteButton');
  const valid = state.segments.every(s => s.name && !isNaN(s.mpMin) && !isNaN(s.mpMax));
  btn.disabled = !valid;
}

// ===== Preview Map =====
function renderPreviewMap() {
  if (mapInstance) mapInstance.remove();
  const div = document.getElementById('customRouteMap');
  mapInstance = L.map(div, { zoomControl: false, attributionControl: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
  const cams = computeCustomRouteCameras(state.segments);
  if (cams.length) {
    const coords = cams.map(c => [c.Latitude, c.Longitude]);
    const bounds = L.latLngBounds(coords);
    cams.forEach(c => L.circleMarker([c.Latitude, c.Longitude], { radius:4 }).addTo(mapInstance));
    mapInstance.fitBounds(bounds, { padding: [10,10], maxZoom: 14 });
  }
}

// ===== Apply & URL =====
function applyCustomRoute() {
  const cams = computeCustomRouteCameras(state.segments);
  refreshGallery(cams);
  // append custom badges
  const sel = document.querySelector('#selectedFilters .badges');
  state.segments.forEach(s => {
    const badge = document.createElement('div');
    badge.className = 'filter-item custom-route-badge';
    badge.textContent = `📍 ${s.name}: ${s.mpMin}–${s.mpMax}`;
    sel.append(badge);
  });
  // update URL
  const params = new URLSearchParams(window.location.search);
  params.set('multiRoute', serializeSegments(state.segments));
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
}

// ===== Initialization =====
export function setupCustomRouteBuilder() {
  // inject menu
  const menu = document.getElementById('routeFilterMenu');
  const item = document.createElement('li');
  item.innerHTML = `<a id="launchCustomRouteButton" class="dropdown-item" href="#">🛠 Build Custom Route...</a>`;
  menu.prepend(item);

  // inject modal
  document.body.insertAdjacentHTML('beforeend', `
<div class="modal fade" id="customRouteModal" tabindex="-1">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content glass-modal">
      <div class="modal-header"><h5 class="modal-title">Build Custom Route</h5></div>
      <div class="modal-body">
        <div class="d-flex flex-column flex-md-row">
          <div class="p-2 flex-fill">
            <div id="customRouteFields" class="d-flex flex-column gap-2"></div>
            <button id="addSegmentButton" type="button" class="button mt-2"><i class="fas fa-plus"></i> Add</button>
          </div>
          <div class="p-2 flex-fill">
            <div id="customRouteMap" style="width:100%;height:300px;"></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="resetRouteFormButton" type="button" class="reset-button me-auto">Reset</button>
        <button id="copyRouteUrlButton" type="button" class="button me-2"><i class="fas fa-link"></i>Copy URL</button>
        <button id="applyRouteButton" type="button" class="button" disabled>Apply</button>
        <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="modal"></button>
      </div>
    </div>
  </div>
</div>`);

  const launch = document.getElementById('launchCustomRouteButton');
  const addBtn = document.getElementById('addSegmentButton');
  const resetBtn = document.getElementById('resetRouteFormButton');
  const copyBtn = document.getElementById('copyRouteUrlButton');
  const applyBtn = document.getElementById('applyRouteButton');
  const modalEl = document.getElementById('customRouteModal');
  const bsModal = new bootstrap.Modal(modalEl);

  launch.addEventListener('click', e => { e.preventDefault(); bsModal.show(); });
  modalEl.addEventListener('shown.bs.modal', () => {
    populateForm();
    renderPreviewMap();
    updateApplyState();
  });
  modalEl.addEventListener('hidden.bs.modal', () => {
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
  });

  addBtn.addEventListener('click', () => { addSegmentRow(); updateApplyState(); });
  resetBtn.addEventListener('click', () => resetForm());
  copyBtn.addEventListener('click', () => {
    applyCustomRoute();
    copyURLToClipboard();
  });
  applyBtn.addEventListener('click', () => {
    applyCustomRoute();
    bsModal.hide();
  });

  // apply on load if provided
  const params = new URLSearchParams(window.location.search);
  if (params.has('multiRoute')) {
    state.segments = parseSegmentsParam(params.get('multiRoute'));
    resetForm();
    applyCustomRoute();
  }
}
