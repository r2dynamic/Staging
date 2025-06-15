// js/customRoute.js
// Module to build and apply multi-segment custom route filters

import { refreshGallery } from './ui.js';
import { copyToClipboard } from './utils.js';

// Leaflet (L) is loaded globally
let mapInstance = null;
let segmentMarkers = [];

/** Normalize user input to digits only. */
function normalizeRouteInput(input) {
  return (input || '').replace(/\D/g, '');
}

/** Test if a camera lies on a given segment. */
function isCameraOnSegment(cam, { name, mpMin, mpMax }) {
  let mp = null;
  if (cam.RoadwayOption1 === name) mp = cam.MilepostOption1;
  else if (cam.RoadwayOption2 === name) mp = cam.MilepostOption2;
  if (mp == null || isNaN(mp)) return false;
  if (mpMin != null && mp < mpMin) return false;
  if (mpMax != null && mp > mpMax) return false;
  return true;
}

/** Serialize segments into a multiRoute query string. */
export function serializeSegments(segs) {
  return segs.map(s => `${s.name}:${s.mpMin}-${s.mpMax}`).join(',');
}

/** Parse multiRoute parameter into window.customRouteFormData. */
function parseMultiRouteFromURL() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('multiRoute');
  if (!raw) {
    window.customRouteFormData = [];
    return;
  }
  window.customRouteFormData = raw.split(',').map(chunk => {
    const [r, range] = chunk.split(':');
    const code = (r || '').toUpperCase();
    const name = code.endsWith('P') ? code : code + 'P';
    const [minRaw, maxRaw] = (range || '').split('-');
    const mpMin = parseFloat(minRaw);
    const mpMax = parseFloat(maxRaw);
    return {
      name,
      mpMin: isNaN(mpMin) ? null : mpMin,
      mpMax: isNaN(mpMax) ? null : mpMax
    };
  });
}

/** Ensure at least one segment exists in the form data. */
function ensureSegmentData() {
  if (!Array.isArray(window.customRouteFormData)) window.customRouteFormData = [];
  if (window.customRouteFormData.length === 0) {
    window.customRouteFormData.push({ name: '', mpMin: null, mpMax: null });
  }
}

/** Enable or disable the Apply button based on form validity. */
function updateApplyButtonState() {
  const btn = document.getElementById('customRouteApply');
  if (!btn) return;
  const ok = Array.isArray(window.customRouteFormData) &&
             window.customRouteFormData.every(s => s.name && s.mpMin != null && s.mpMax != null);
  btn.disabled = !ok;
}

/** Render the custom route form rows. */
function renderForm() {
  const container = document.getElementById('customRouteFormContainer');
  if (!container) return;
  container.innerHTML = '';

  ensureSegmentData();
  const segs = window.customRouteFormData;

  segs.forEach((seg, idx) => {
    const row = document.createElement('div');
    row.className = 'd-flex flex-wrap align-items-center gap-2 mb-2';

    // Up button
    const up = document.createElement('button');
    up.type = 'button'; up.className = 'btn btn-sm btn-outline-light'; up.textContent = '⬆️';
    up.disabled = idx === 0;
    up.onclick = () => { [segs[idx-1], segs[idx]] = [segs[idx], segs[idx-1]]; renderForm(); renderMap(); };
    row.append(up);

    // Down button
    const down = document.createElement('button');
    down.type = 'button'; down.className = 'btn btn-sm btn-outline-light'; down.textContent = '⬇️';
    down.disabled = idx === segs.length - 1;
    down.onclick = () => { [segs[idx], segs[idx+1]] = [segs[idx+1], segs[idx]]; renderForm(); renderMap(); };
    row.append(down);

    // Route input
    const routeIn = document.createElement('input');
    routeIn.type = 'text'; routeIn.placeholder = 'Route #';
    routeIn.value = seg.name.replace(/P$/, '');
    routeIn.className = 'form-control glass-dropdown-input'; routeIn.style.width = '80px';
    routeIn.oninput = () => {
      const n = normalizeRouteInput(routeIn.value);
      seg.name = n ? n + 'P' : '';
      updateApplyButtonState(); renderMap();
    };
    row.append(routeIn);

    // From MP
    const minIn = document.createElement('input');
    minIn.type = 'number'; minIn.placeholder = 'From';
    minIn.value = seg.mpMin != null ? seg.mpMin : '';
    minIn.className = 'form-control glass-dropdown-input'; minIn.style.width = '80px';
    minIn.oninput = () => {
      const v = parseFloat(minIn.value);
      seg.mpMin = isNaN(v) ? null : v;
      updateApplyButtonState(); renderMap();
    };
    row.append(minIn);

    // Swap button
    const swap = document.createElement('button');
    swap.type = 'button'; swap.className = 'btn btn-sm btn-outline-light'; swap.textContent = '🔁';
    swap.onclick = () => { [seg.mpMin, seg.mpMax] = [seg.mpMax, seg.mpMin]; renderForm(); renderMap(); };
    row.append(swap);

    // To MP
    const maxIn = document.createElement('input');
    maxIn.type = 'number'; maxIn.placeholder = 'To';
    maxIn.value = seg.mpMax != null ? seg.mpMax : '';
    maxIn.className = 'form-control glass-dropdown-input'; maxIn.style.width = '80px';
    maxIn.oninput = () => {
      const v = parseFloat(maxIn.value);
      seg.mpMax = isNaN(v) ? null : v;
      updateApplyButtonState(); renderMap();
    };
    row.append(maxIn);

    // Remove button
    const rem = document.createElement('button');
    rem.type = 'button'; rem.className = 'btn btn-sm btn-outline-danger'; rem.textContent = '❌';
    rem.disabled = segs.length === 1;
    rem.onclick = () => { segs.splice(idx, 1); renderForm(); renderMap(); };
    row.append(rem);

    container.append(row);
  });

  // Add Segment
  const addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn btn-sm button'; addBtn.textContent = '+ Add Segment';
  addBtn.onclick = ()=> { window.customRouteFormData.push({ name: '', mpMin: null, mpMax: null }); renderForm(); renderMap(); };
  container.append(addBtn);

  updateApplyButtonState();
}

/** Render the mini overview map. */
function renderMap() {
  const mapDiv = document.getElementById('customRouteMap'); if (!mapDiv) return;
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }
  mapInstance = L.map(mapDiv, { zoomControl: false, attributionControl: false });
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(mapInstance);
  L.tileLayer('http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}').addTo(mapInstance);

  segmentMarkers.forEach(m=>m.remove()); segmentMarkers=[];
  const cams = window.camerasList || [];
  window.customRouteFormData.forEach(seg=>{
    cams.filter(cam=>isCameraOnSegment(cam, seg))
        .sort((a,b)=>{
          const ma = a.RoadwayOption1===seg.name ? a.MilepostOption1 : a.MilepostOption2;
          const mb = b.RoadwayOption1===seg.name ? b.MilepostOption1 : b.MilepostOption2;
          return seg.mpMin < seg.mpMax ? ma - mb : mb - ma;
        })
        .forEach(cam=>{
          const m = L.marker([cam.Latitude, cam.Longitude]).addTo(mapInstance);
          m.bindTooltip(
            `<div class='glass-popup-content'><img src='${cam.Views[0].Url}'/><br/><strong>${cam.Location}</strong></div>`,
            { direction: 'top', offset: [0, -8], className: 'glass-popup' }
          );
          segmentMarkers.push(m);
        });
  });

  const pts = segmentMarkers.map(m=>m.getLatLng());
  if (pts.length) mapInstance.fitBounds(pts, { padding:[8,8], maxZoom:14 });
  else mapInstance.setView([39.5, -111.5], 6);
}

/** Apply custom route to gallery filtering. */
function applyCustomRouteFilter() {
  const ms = serializeSegments(window.customRouteFormData);
  const params = new URLSearchParams(window.location.search);
  params.set('multiRoute', ms);
  window.history.replaceState({}, '', `${window.location.pathname}?${params}`);

  let result = [];
  window.customRouteFormData.forEach(seg=>{
    const subset = window.camerasList.filter(cam=>isCameraOnSegment(cam, seg));
    subset.sort((a,b)=>{
      const ma = a.RoadwayOption1===seg.name ? a.MilepostOption1 : a.MilepostOption2;
      const mb = b.RoadwayOption1===seg.name ? b.MilepostOption1 : b.MilepostOption2;
      return seg.mpMin < seg.mpMax ? ma - mb : mb - ma;
    });
    result = result.concat(subset);
  });
  refreshGallery(Array.from(new Set(result)));
}

/** Initialize and wire up the Custom Route Builder UI. */
export function setupCustomRouteBuilder() {
  parseMultiRouteFromURL();
  const buildBtn = document.getElementById('buildCustomRoute');
  const modalEl  = document.getElementById('customRouteModal');
  const resetBtn = document.getElementById('customRouteReset');
  const copyBtn  = document.getElementById('customRouteCopyUrl');
  const applyBtn = document.getElementById('customRouteApply');

  if (!buildBtn || !modalEl || !resetBtn || !copyBtn || !applyBtn) return;
  const modal = new bootstrap.Modal(modalEl);

  buildBtn.onclick = e => { e.preventDefault(); renderForm(); renderMap(); modal.show(); };
  modalEl.addEventListener('hidden.bs.modal', () => { if (mapInstance) mapInstance.remove(); mapInstance = null; });

  resetBtn.onclick = () => { window.customRouteFormData = []; renderForm(); renderMap(); };

  copyBtn.onclick = e => {
    e.preventDefault();
    const ms = serializeSegments(window.customRouteFormData);
    const params = new URLSearchParams(window.location.search);
    params.set('multiRoute', ms);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    copyToClipboard(window.location.href);
  };

  applyBtn.onclick = e => { e.preventDefault(); applyCustomRouteFilter(); modal.hide(); };
}
// after your existing setupCustomRouteBuilder()
export { parseMultiRouteFromURL, applyCustomRouteFilter };
