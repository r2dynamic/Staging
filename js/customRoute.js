// js/customRoute.js
import { refreshGallery } from './ui.js';
import { copyToClipboard } from './utils.js';

// ——————————————————————————————————————————————
// Marker + Tooltip State
// ——————————————————————————————————————————————
const smallIcon = L.divIcon({
  className:     'custom-marker',
  iconSize:      [12, 12],
  iconAnchor:    [6,  6],
  tooltipAnchor: [0, 10]
});

let mapInstance = null;
let segmentMarkers = [];
let openTips = [];

// ——————————————————————————————————————————————
// Constants (match your overview logic exactly)
// ——————————————————————————————————————————————
const MAX_TOOLTIPS    = 20;
const THUMB_WIDTH     = 120;
const ARROW_HALF      = 6;
const MARKER_RAD      = 8;
const MIN_ANCHOR_PX   = 10;
const ZOOM_OPEN       = 13;
const ZOOM_COLLIDE    = 14;

// ——————————————————————————————————————————————
// Segment Utilities
// ——————————————————————————————————————————————
function isCameraOnSegment(cam, seg) {
  let mp = null;
  if (cam.RoadwayOption1 === seg.name)      mp = cam.MilepostOption1;
  else if (cam.RoadwayOption2 === seg.name) mp = cam.MilepostOption2;
  if (mp == null || isNaN(mp)) return false;
  if (seg.mpMin != null && mp < seg.mpMin) return false;
  if (seg.mpMax != null && mp > seg.mpMax) return false;
  return true;
}

export function serializeSegments(segs) {
  return segs.map(s => `${s.name}:${s.mpMin}-${s.mpMax}`).join(',');
}

export function parseMultiRouteFromURL() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('multiRoute');
  if (!raw) {
    window.customRouteFormData = [];
    return;
  }
  window.customRouteFormData = raw.split(',').map(chunk => {
    const [r, range] = chunk.split(':');
    const code = (r||'').toUpperCase();
    const name = code.endsWith('P') ? code : `${code}P`;
    const [minRaw, maxRaw] = (range||'').split('-');
    const mpMin = parseFloat(minRaw), mpMax = parseFloat(maxRaw);
    return {
      name,
      mpMin: isNaN(mpMin) ? null : mpMin,
      mpMax: isNaN(mpMax) ? null : mpMax
    };
  });
}

// ——————————————————————————————————————————————
// Form controls
// ——————————————————————————————————————————————
function ensureSegmentData() {
  if (!Array.isArray(window.customRouteFormData)) window.customRouteFormData = [];
  if (window.customRouteFormData.length === 0) {
    window.customRouteFormData.push({ name:'', mpMin:null, mpMax:null });
  }
}

function updateApplyButtonState() {
  const btn = document.getElementById('customRouteApply');
  if (!btn) return;
  const ok = Array.isArray(window.customRouteFormData) &&
    window.customRouteFormData.every(s => s.name && s.mpMin != null && s.mpMax != null);
  btn.disabled = !ok;
}

function renderForm() {
  const container = document.getElementById('customRouteFormContainer');
  if (!container) return;
  container.innerHTML = '';
  ensureSegmentData();
  const segs = window.customRouteFormData;

  segs.forEach((seg, idx) => {
    const row = document.createElement('div');
    row.className = 'd-flex flex-nowrap align-items-center gap-2 mb-2 custom-route-row';

    // Drag handle
    const drag = document.createElement('span');
    drag.className = 'drag-handle';
    drag.textContent = '☰';
    row.append(drag);

    // Route #
    const routeIn = document.createElement('input');
    routeIn.type = 'text';
    routeIn.placeholder = 'Route';
    routeIn.value = seg.name.replace(/P$/, '');
    routeIn.className = 'form-control glass-dropdown-input';
    routeIn.style.width = '60px';
    routeIn.oninput = () => {
      const d = (routeIn.value||'').replace(/\D/g,'');
      seg.name = d ? `${d}P` : '';
      updateApplyButtonState();
      renderMap();
    };
    row.append(routeIn);

    // From MP
    const minIn = document.createElement('input');
    minIn.type = 'number';
    minIn.placeholder = 'From';
    minIn.value = seg.mpMin != null ? seg.mpMin : '';
    minIn.className = 'form-control glass-dropdown-input';
    minIn.style.width = '60px';
    minIn.oninput = () => {
      const v = parseFloat(minIn.value);
      seg.mpMin = isNaN(v) ? null : v;
      updateApplyButtonState();
      renderMap();
    };
    row.append(minIn);

    // Swap
    const swap = document.createElement('button');
    swap.type = 'button';
    swap.className = 'btn btn-sm btn-outline-light swapBtn';
    swap.innerHTML = '<i class="fas fa-sync-alt"></i>';
    swap.onclick = () => {
      [seg.mpMin, seg.mpMax] = [seg.mpMax, seg.mpMin];
      renderForm(); renderMap();
    };
    row.append(swap);

    // To MP
    const maxIn = document.createElement('input');
    maxIn.type = 'number';
    maxIn.placeholder = 'To';
    maxIn.value = seg.mpMax != null ? seg.mpMax : '';
    maxIn.className = 'form-control glass-dropdown-input';
    maxIn.style.width = '60px';
    maxIn.oninput = () => {
      const v = parseFloat(maxIn.value);
      seg.mpMax = isNaN(v) ? null : v;
      updateApplyButtonState();
      renderMap();
    };
    row.append(maxIn);

    // Remove
    const rem = document.createElement('button');
    rem.type = 'button';
    rem.className = 'btn btn-sm btn-outline-danger remBtn';
    rem.innerHTML = '<i class="far fa-window-close"></i>';
    rem.disabled = segs.length === 1;
    rem.onclick = () => {
      segs.splice(idx,1);
      renderForm(); renderMap();
    };
    row.append(rem);

    container.append(row);
  });

  // Add Segment
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-sm button';
  addBtn.textContent = '+ Add Segment';
  addBtn.onclick = () => {
    window.customRouteFormData.push({ name:'', mpMin:null, mpMax:null });
    renderForm();
    renderMap();
  };
  container.append(addBtn);

  updateApplyButtonState();
}

// ——————————————————————————————————————————————
// Tooltip + Anchor Logic (exactly as your main modal)
// ——————————————————————————————————————————————
function clearTooltip(marker) {
  if (!marker.unbindTooltip) return;
  marker.unbindTooltip();
  marker.sticky = false;
  if (marker._connector) {
    mapInstance.removeLayer(marker._connector);
    marker._connector = null;
  }
  if (marker._updateConn) {
    mapInstance.off('move zoom viewreset', marker._updateConn);
    marker._updateConn = null;
  }
  const i = openTips.indexOf(marker);
  if (i > -1) openTips.splice(i, 1);
}

function repositionTooltip(marker) {
  clearTooltip(marker);
  const html = `<div class="glass-popup-content"><img src="${marker.cam.Views[0].Url}"/></div>`;

  // occupied boxes from existing markers
  const boxes = segmentMarkers.map(m => {
    const p = mapInstance.latLngToContainerPoint(m.getLatLng());
    return {
      left:   p.x - MARKER_RAD,
      top:    p.y - MARKER_RAD,
      right:  p.x + MARKER_RAD,
      bottom: p.y + MARKER_RAD
    };
  });

  // candidate positions
  const candidates = [
    { dir:'top',    offset:[0, -MARKER_RAD] },
    { dir:'bottom', offset:[0,  MARKER_RAD] },
    { dir:'left',   offset:[-MARKER_RAD, 0] },
    { dir:'right',  offset:[ MARKER_RAD, 0] },
    { dir:'top',    offset:[-(THUMB_WIDTH/2 - ARROW_HALF), -MARKER_RAD] },
    { dir:'top',    offset:[ (THUMB_WIDTH/2 - ARROW_HALF), -MARKER_RAD] },
    { dir:'bottom', offset:[-(THUMB_WIDTH/2 - ARROW_HALF),  MARKER_RAD] },
    { dir:'bottom', offset:[ (THUMB_WIDTH/2 - ARROW_HALF),  MARKER_RAD] }
  ];

  // measure them
  const measured = candidates.map(c => {
    const tmp = L.tooltip({
      direction:   c.dir,
      offset:      c.offset,
      permanent:   true,
      interactive: false,
      opacity:     1
    })
      .setLatLng(marker.getLatLng())
      .setContent(html)
      .addTo(mapInstance);
    const rect = tmp.getElement().getBoundingClientRect();
    mapInstance.removeLayer(tmp);
    return { ...c, rect };
  });

  // pick non-colliding, or fallback
  let chosen = measured.find(c => {
    if (boxes.some(b => !(b.right < c.rect.left || b.left > c.rect.right || b.bottom < c.rect.top || b.top > c.rect.bottom))) {
      return false;
    }
    return !openTips.some(ot => {
      const r2 = ot.getTooltip().getElement().getBoundingClientRect();
      return !(r2.right < c.rect.left || r2.left > c.rect.right || r2.bottom < c.rect.top || r2.top > c.rect.bottom);
    });
  });
  if (!chosen) chosen = measured[0];

  // enforce minimum anchor distance
  let [ox, oy] = chosen.offset;
  const norm = Math.hypot(ox, oy);
  if (norm < MARKER_RAD + MIN_ANCHOR_PX) {
    const f = (MARKER_RAD + MIN_ANCHOR_PX) / (norm || 1);
    ox *= f; oy *= f;
  }

  // bind & open the tooltip
  marker.bindTooltip(html, {
    direction:   chosen.dir,
    offset:      [ox, oy],
    permanent:   true,
    interactive: true,
    className:   'glass-popup',
    maxWidth:    THUMB_WIDTH,
    opacity:     1
  }).openTooltip();
  marker.sticky = true;
  openTips.push(marker);

  // draw the connector line
  const markerCP = mapInstance.latLngToContainerPoint(marker.getLatLng());
  const tipLL    = mapInstance.containerPointToLatLng(markerCP.add([ox, oy]));
  const poly     = L.polyline([marker.getLatLng(), tipLL], {
    color:       '#ff7800',
    weight:      4,
    interactive: false
  }).addTo(mapInstance);
  marker._connector = poly;

  // keep it updated on pan/zoom
  marker._updateConn = () => {
    const cp1  = mapInstance.latLngToContainerPoint(marker.getLatLng());
    const tt   = marker.getTooltip().getElement().getBoundingClientRect();
    const mp   = mapInstance.getContainer().getBoundingClientRect();
    let px, py;
    switch (chosen.dir) {
      case 'top':
        px = tt.left - mp.left + tt.width/2;
        py = tt.bottom - mp.top;
        break;
      case 'bottom':
        px = tt.left - mp.left + tt.width/2;
        py = tt.top - mp.top;
        break;
      case 'left':
        px = tt.right - mp.left;
        py = tt.top - mp.top + tt.height/2;
        break;
      default:
        px = tt.left - mp.left;
        py = tt.top  - mp.top  + tt.height/2;
    }
    let vec = L.point(px, py).subtract(cp1);
    const d  = cp1.distanceTo([px, py]);
    if (d < MARKER_RAD + MIN_ANCHOR_PX) {
      vec = vec.multiplyBy((MARKER_RAD + MIN_ANCHOR_PX)/(d||1));
    }
    const newLL = mapInstance.containerPointToLatLng(cp1.add(vec));
    poly.setLatLngs([marker.getLatLng(), newLL]);
  };
  mapInstance.on('move zoom viewreset', marker._updateConn);
}

// ——————————————————————————————————————————————
// Render the Custom‐Routes mini‐map
// ——————————————————————————————————————————————
function renderMap() {
  const mapDiv = document.getElementById('customRouteMap');
  if (!mapDiv) return;
  const cams = window.camerasList || [];

  // teardown old
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
  segmentMarkers.forEach(m => m.remove());
  segmentMarkers = [];
  openTips = [];

  mapInstance = L.map(mapDiv, {
    zoomControl:        false,
    attributionControl: false,
    dragging:           true,
    doubleClickZoom:    true,
    scrollWheelZoom:    true
  });

  // two base layers
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution:'© Esri', maxZoom:20 }
  ).addTo(mapInstance);
  L.tileLayer(
    'http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    { attribution:'© Esri', minZoom:0, maxZoom:18 }
  ).addTo(mapInstance);

  // place markers for all cams in any selected segment
  cams.forEach(cam => {
    if (!window.customRouteFormData.some(seg => isCameraOnSegment(cam, seg))) return;
    const m = L.marker([cam.Latitude, cam.Longitude], { icon: smallIcon }).addTo(mapInstance);
    m.cam = cam;
    m.sticky = false;
    segmentMarkers.push(m);

    m.on('click', () => {
      if (m.sticky) {
        clearTooltip(m);
        return;
      }
      if (mapInstance.getZoom() >= ZOOM_COLLIDE && openTips.length >= MAX_TOOLTIPS) {
        clearTooltip(openTips.shift());
      }
      repositionTooltip(m);
    });
  });

  // auto-open when zoomed in
  mapInstance.on('moveend', () => {
    if (mapInstance.getZoom() >= ZOOM_OPEN) {
      segmentMarkers.forEach(m => !m.sticky && m.fire('click'));
    }
  });

  // auto-close on zoom out, collision pass on deep zoom
  mapInstance.on('zoomend', () => {
    if (mapInstance.getZoom() < ZOOM_OPEN) {
      openTips.slice().forEach(clearTooltip);
    }
    if (mapInstance.getZoom() >= ZOOM_COLLIDE) {
      setTimeout(() => openTips.forEach(repositionTooltip), 200);
    }
  });

  // fit
  const pts = segmentMarkers.map(m => m.getLatLng());
  if (pts.length) {
    mapInstance.fitBounds(pts, { padding:[8,8], maxZoom:14 });
  } else {
    mapInstance.setView([39.5, -111.5], 6);
  }
}

// ——————————————————————————————————————————————
// Apply & wire up
// ——————————————————————————————————————————————
export function applyCustomRouteFilter() {
  const ms = serializeSegments(window.customRouteFormData);
  const ps = new URLSearchParams(window.location.search);
  ps.set('multiRoute', ms);
  window.history.replaceState({}, '', `${window.location.pathname}?${ps}`);

  let all = [];
  window.customRouteFormData.forEach(seg => {
    const subset = window.camerasList.filter(cam => isCameraOnSegment(cam, seg));
    subset.sort((a,b) => {
      const ma = (a.RoadwayOption1===seg.name ? a.MilepostOption1 : a.MilepostOption2);
      const mb = (b.RoadwayOption1===seg.name ? b.MilepostOption1 : b.MilepostOption2);
      return seg.mpMin < seg.mpMax ? ma - mb : mb - ma;
    });
    all = all.concat(subset);
  });
  const unique = Array.from(new Set(all));
  refreshGallery(unique);
}

export function setupCustomRouteBuilder() {
  // 1) Read any existing multiRoute from URL on initial page load:
  parseMultiRouteFromURL();

  const buildBtn  = document.getElementById('buildCustomRoute');
  const modalEl   = document.getElementById('customRouteModal');
  const resetBtn  = document.getElementById('customRouteReset');
  const copyBtn   = document.getElementById('customRouteCopyUrl');
  const applyBtn  = document.getElementById('customRouteApply');
  if (!buildBtn || !modalEl || !resetBtn || !copyBtn || !applyBtn) return;

  const modal = new bootstrap.Modal(modalEl);

  let originalData = null;    // snapshot of applied route-data
  let applyClicked = false;   // did user hit Apply this session?

  // OPEN modal: snapshot & render
  buildBtn.onclick = e => {
    e.preventDefault();
    // deep‐copy current applied data
    originalData = (window.customRouteFormData || []).map(s => ({ ...s }));
    applyClicked = false;
    renderForm();
    modal.show();
  };

  // WHEN modal is fully visible: draw your map/editor
  modalEl.addEventListener('shown.bs.modal', () => {
    renderMap();
    updateApplyButtonState();
    if (mapInstance) mapInstance.invalidateSize();
  });

  // WHEN modal hides: commit or revert
  modalEl.addEventListener('hidden.bs.modal', () => {
    if (!applyClicked) {
      // user cancelled → revert to originalData
      window.customRouteFormData = originalData || [];
      // refresh gallery/UI to remove any temp filter
      window.filterImages();
      // ensure badges + URL reflect that revert
      window.updateSelectedFilters();
      window.updateURLParameters();
    }
    // cleanup
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
  });

  // RESET inside modal: clear form & re‐render map
  resetBtn.onclick = () => {
    window.customRouteFormData = [];
    renderForm();
    renderMap();
  };

  // COPY URL inside modal: just copy current URL (does not apply)
  copyBtn.onclick = e => {
    e.preventDefault();
    const ms = serializeSegments(window.customRouteFormData);
    const ps = new URLSearchParams(window.location.search);
    ps.set('multiRoute', ms);
    window.history.replaceState({}, '', `${window.location.pathname}?${ps}`);
    copyToClipboard(window.location.href);
  };

  // APPLY (commit) → set flag & call your existing applyCustomRouteFilter
  applyBtn.onclick = e => {
    e.preventDefault();
    applyClicked = true;
    applyCustomRouteFilter();   // this will do history.replaceState + refreshGallery
    modal.hide();
  };
}

