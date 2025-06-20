// js/customRoute.js
import { refreshGallery } from './ui.js';
import { copyToClipboard } from './utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared icon (identical to overview modal)
// ─────────────────────────────────────────────────────────────────────────────
const smallIcon = L.divIcon({
  className:     'custom-marker',
  iconSize:      [12, 12],
  iconAnchor:    [6,  6],
  tooltipAnchor: [0, 10]
});

// ─────────────────────────────────────────────────────────────────────────────
// Constants (match your overview logic exactly)
// ─────────────────────────────────────────────────────────────────────────────
const MAX_TOOLTIPS  = 20;
const THUMB_WIDTH   = 120;
const ARROW_HALF    = 6;
const MARKER_RAD    = 8;
const MIN_ANCHOR    = 10;
const ZOOM_OPEN     = 13;
const ZOOM_COLLIDE  = 14;

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
let mapInstance    = null;
let segmentMarkers = [];
let openTips       = [];

// ─────────────────────────────────────────────────────────────────────────────
// Utility: does camera lie on this segment?
// ─────────────────────────────────────────────────────────────────────────────
function isCameraOnSegment(cam, seg) {
  let mp = cam.RoadwayOption1===seg.name
         ? cam.MilepostOption1
         : cam.RoadwayOption2===seg.name
           ? cam.MilepostOption2
           : null;
  if (mp == null || isNaN(mp)) return false;
  if (seg.mpMin != null && mp < seg.mpMin) return false;
  if (seg.mpMax != null && mp > seg.mpMax) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported: serialize array of segments → multiRoute query string
// ─────────────────────────────────────────────────────────────────────────────
export function serializeSegments(segs) {
  return segs.map(s => `${s.name}:${s.mpMin}-${s.mpMax}`).join(',');
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported: read multiRoute from URL into window.customRouteFormData
// ─────────────────────────────────────────────────────────────────────────────
export function parseMultiRouteFromURL() {
  const params = new URLSearchParams(window.location.search);
  const raw    = params.get('multiRoute');
  if (!raw) {
    window.customRouteFormData = [];
    return;
  }
  window.customRouteFormData = raw.split(',').map(chunk => {
    const [r, range] = chunk.split(':');
    const code       = (r||'').toUpperCase();
    const name       = code.endsWith('P') ? code : `${code}P`;
    const [minRaw, maxRaw] = (range||'').split('-');
    const mpMin      = parseFloat(minRaw);
    const mpMax      = parseFloat(maxRaw);
    return {
      name,
      mpMin: isNaN(mpMin) ? null : mpMin,
      mpMax: isNaN(mpMax) ? null : mpMax
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers to clear & reposition tooltips exactly as overview modal
// ─────────────────────────────────────────────────────────────────────────────
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
  const idx = openTips.indexOf(marker);
  if (idx !== -1) openTips.splice(idx, 1);
}

function repositionTooltip(marker) {
  clearTooltip(marker);
  const html = `<div class="glass-popup-content"><img src="${marker.cam.Views[0].Url}"/></div>`;

  // occupied boxes
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

  // measure each
  const measured = candidates.map(c => {
    const tmp = L.tooltip({
      direction:    c.dir,
      offset:       c.offset,
      permanent:    true,
      interactive:  false,
      opacity:      1
    })
      .setLatLng(marker.getLatLng())
      .setContent(html)
      .addTo(mapInstance);
    const rect = tmp.getElement().getBoundingClientRect();
    mapInstance.removeLayer(tmp);
    return { ...c, rect };
  });

  // pick non-colliding
  let chosen = measured.find(c => {
    if (boxes.some(b => !(b.right < c.rect.left || b.left > c.rect.right || b.bottom < c.rect.top || b.top > c.rect.bottom))) {
      return false;
    }
    return !openTips.some(ot => {
      const r2 = ot.getTooltip().getElement().getBoundingClientRect();
      return !(r2.right < c.rect.left || r2.left > c.rect.right || r2.bottom < c.rect.top || r2.top > c.rect.bottom);
    });
  }) || measured[0];

  // enforce min anchor
  let [ox, oy] = chosen.offset;
  const norm   = Math.hypot(ox, oy);
  if (norm < MARKER_RAD + MIN_ANCHOR) {
    const f = (MARKER_RAD + MIN_ANCHOR)/(norm||1);
    ox *= f; oy *= f;
  }

  // bind & open
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

  // draw connector
  const cp  = mapInstance.latLngToContainerPoint(marker.getLatLng());
  const tip = mapInstance.containerPointToLatLng(cp.add([ox, oy]));
  const poly = L.polyline([marker.getLatLng(), tip], {
    color:       '#ff7800',
    weight:      4,
    interactive: false
  }).addTo(mapInstance);
  marker._connector = poly;

  // update on pan/zoom
  marker._updateConn = () => {
    const cp1 = mapInstance.latLngToContainerPoint(marker.getLatLng());
    const tt  = marker.getTooltip().getElement().getBoundingClientRect();
    const mp  = mapInstance.getContainer().getBoundingClientRect();
    let px, py;
    switch (chosen.dir) {
      case 'top':
        px = tt.left - mp.left + tt.width/2; py = tt.bottom - mp.top; break;
      case 'bottom':
        px = tt.left - mp.left + tt.width/2; py = tt.top - mp.top; break;
      case 'left':
        px = tt.right - mp.left; py = tt.top - mp.top + tt.height/2; break;
      default:
        px = tt.left - mp.left; py = tt.top - mp.top + tt.height/2;
    }
    let vec = L.point(px, py).subtract(cp1);
    const d  = cp1.distanceTo([px, py]);
    if (d < MARKER_RAD + MIN_ANCHOR) {
      vec = vec.multiplyBy((MARKER_RAD+MIN_ANCHOR)/(d||1));
    }
    const newLL = mapInstance.containerPointToLatLng(cp1.add(vec));
    poly.setLatLngs([marker.getLatLng(), newLL]);
  };
  mapInstance.on('move zoom viewreset', marker._updateConn);
}

// ─────────────────────────────────────────────────────────────────────────────
// Form rendering + Sortable drag-and-drop
// ─────────────────────────────────────────────────────────────────────────────
function ensureSegmentData() {
  if (!Array.isArray(window.customRouteFormData)) window.customRouteFormData = [];
  if (window.customRouteFormData.length === 0) {
    window.customRouteFormData.push({ name:'', mpMin:null, mpMax:null });
  }
}
function updateApplyButtonState() {
  const btn = document.getElementById('customRouteApply');
  if (!btn) return;
  btn.disabled = !window.customRouteFormData.every(s => s.name && s.mpMin!=null && s.mpMax!=null);
}
function renderForm() {
  const container = document.getElementById('customRouteFormContainer');
  if (!container) return;
  container.innerHTML = '';
  ensureSegmentData();

  // ─── HEADER ROW ───────────────────────────────────────────
  const headerRow = document.createElement('div');
  headerRow.className = 'custom-route-headers d-flex align-items-center gap-2 mb-2';
  ['hdr-handle','hdr-route','hdr-from','hdr-swap','hdr-to','hdr-rem']
    .forEach(cls => headerRow.append(
      Object.assign(document.createElement('span'), { className: cls })
    ));
  headerRow.querySelector('.hdr-route').textContent = 'Route #';
  headerRow.querySelector('.hdr-from').textContent  = 'MP From';
  headerRow.querySelector('.hdr-to').textContent    = 'MP To';
  container.append(headerRow);

  // ─── ROWS FOR EACH SEGMENT ────────────────────────────────
  window.customRouteFormData.forEach((seg, idx) => {
    const row = document.createElement('div');
    row.className = 'd-flex flex-nowrap align-items-center gap-2 mb-2 custom-route-row';

    // • drag-handle
    const drag = document.createElement('span');
    drag.className = 'drag-handle';
    drag.textContent = '☰';
    row.append(drag);

    // • Route #
    const routeIn = document.createElement('input');
    routeIn.type        = 'text';
    routeIn.placeholder = 'EX: 15, 201, 80';
    routeIn.value       = seg.name.replace(/P$/,'');
    routeIn.className   = 'form-control glass-dropdown-input';
    routeIn.style.width = '60px';
    routeIn.oninput     = () => {
      const d = (routeIn.value||'').replace(/\D/g,'');
      seg.name = d ? `${d}P` : '';
      updateApplyButtonState();
      renderMap();
    };
    row.append(routeIn);

    // • MP From
    const minIn = document.createElement('input');
    minIn.type        = 'number';
    minIn.value       = seg.mpMin != null ? seg.mpMin : '';
    minIn.className   = 'form-control glass-dropdown-input';
    minIn.style.width = '60px';
    minIn.oninput     = () => {
      const v = parseFloat(minIn.value);
      seg.mpMin = isNaN(v) ? null : v;
      updateApplyButtonState();
      renderMap();
    };
    row.append(minIn);

    // • Swap
    const swap = document.createElement('button');
    swap.type      = 'button';
    swap.className = 'btn btn-sm btn-outline-light swapBtn';
    swap.innerHTML = '<i class="fas fa-sync-alt"></i>';
    swap.onclick   = () => {
      [seg.mpMin, seg.mpMax] = [seg.mpMax, seg.mpMin];
      renderForm();
      renderMap();
    };
    row.append(swap);

    // • MP To
    const maxIn = document.createElement('input');
    maxIn.type        = 'number';
    maxIn.value       = seg.mpMax != null ? seg.mpMax : '';
    maxIn.className   = 'form-control glass-dropdown-input';
    maxIn.style.width = '60px';
    maxIn.oninput     = () => {
      const v = parseFloat(maxIn.value);
      seg.mpMax = isNaN(v) ? null : v;
      updateApplyButtonState();
      renderMap();
    };
    row.append(maxIn);

    // • Remove
    const rem = document.createElement('button');
    rem.type      = 'button';
    rem.className = 'btn btn-sm btn-outline-danger remBtn';
    rem.innerHTML = '<i class="far fa-window-close"></i>';
    rem.disabled  = window.customRouteFormData.length === 1;
    rem.onclick   = () => {
      window.customRouteFormData.splice(idx, 1);
      renderForm();
      renderMap();
    };
    row.append(rem);

    container.append(row);
  });

  // ─── “+ Add Segment” BUTTON ────────────────────────────────
  const addBtn = document.createElement('button');
  addBtn.type        = 'button';
  addBtn.className   = 'btn button';
  addBtn.textContent = '+ Add Segment';
  addBtn.onclick     = () => {
    window.customRouteFormData.push({ name:'', mpMin:null, mpMax:null });
    renderForm();
    renderMap();
  };
  container.append(addBtn);

  updateApplyButtonState();
}




// ─────────────────────────────────────────────────────────────────────────────
// Mini-overview map inside your custom-routes modal
// ─────────────────────────────────────────────────────────────────────────────
function renderMap() {
  const mapDiv = document.getElementById('customRouteMap');
  if (!mapDiv) return;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
  segmentMarkers.forEach(m => m.remove());
  segmentMarkers = [];
  openTips       = [];

  mapInstance = L.map(mapDiv,{
    zoomControl:        false,
    attributionControl: false,
    dragging:           true,
    doubleClickZoom:    true,
    scrollWheelZoom:    true
  });

  // base layers
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution:'© Esri', maxZoom:20 }
  ).addTo(mapInstance);
  L.tileLayer(
    'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    { attribution:'© Esri', minZoom:0, maxZoom:18 }
  ).addTo(mapInstance);

  // place each camera in any selected segment
  window.camerasList.forEach(cam => {
    if (!window.customRouteFormData.some(seg=>isCameraOnSegment(cam,seg))) return;
    const m = L.marker([cam.Latitude,cam.Longitude],{ icon: smallIcon }).addTo(mapInstance);
    m.cam    = cam; m.sticky = false;
    segmentMarkers.push(m);
    m.on('click', ()=>{
      if (m.sticky) { clearTooltip(m); return; }
      if (mapInstance.getZoom()>=ZOOM_COLLIDE && openTips.length>=MAX_TOOLTIPS) {
        clearTooltip(openTips.shift());
      }
      repositionTooltip(m);
    });
  });

  // auto-open & close on zoom/pan
  mapInstance.on('moveend', ()=>{
    if (mapInstance.getZoom()>=ZOOM_OPEN) {
      segmentMarkers.forEach(m=>!m.sticky&&m.fire('click'));
    }
  });
  mapInstance.on('zoomend', ()=>{
    if (mapInstance.getZoom()<ZOOM_OPEN) openTips.forEach(clearTooltip);
    if (mapInstance.getZoom()>=ZOOM_COLLIDE) {
      setTimeout(()=>openTips.forEach(repositionTooltip),200);
    }
  });

  // fit bounds or fallback
  const pts = segmentMarkers.map(m=>m.getLatLng());
  if (pts.length) {
    mapInstance.fitBounds(pts,{ padding:[8,8], maxZoom:14 });
  } else {
    mapInstance.setView([39.5,-111.5],6);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported: apply filter, update URL + gallery
// ─────────────────────────────────────────────────────────────────────────────
export function applyCustomRouteFilter() {
  const ms = serializeSegments(window.customRouteFormData);
  const ps = new URLSearchParams(window.location.search);
  ps.set('multiRoute', ms);
  window.history.replaceState({},'',`${window.location.pathname}?${ps}`);

  const all = window.customRouteFormData.flatMap(seg =>
    window.camerasList
      .filter(cam=>isCameraOnSegment(cam,seg))
      .sort((a,b)=>{
        const ma = (a.RoadwayOption1===seg.name? a.MilepostOption1 : a.MilepostOption2);
        const mb = (b.RoadwayOption1===seg.name? b.MilepostOption1 : b.MilepostOption2);
        return seg.mpMin<seg.mpMax ? ma-mb : mb-ma;
      })
  );
  refreshGallery(Array.from(new Set(all)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported: wire up “Build Custom Route…” button + modal + cancel logic
// ─────────────────────────────────────────────────────────────────────────────
export function setupCustomRouteBuilder() {
  // read any existing multiRoute on page load
  parseMultiRouteFromURL();

  const buildBtn  = document.getElementById('buildCustomRoute');
  const modalEl   = document.getElementById('customRouteModal');
  const resetBtn  = document.getElementById('customRouteReset');
  const copyBtn   = document.getElementById('customRouteCopyUrl');
  const applyBtn  = document.getElementById('customRouteApply');
  if (!buildBtn||!modalEl||!resetBtn||!copyBtn||!applyBtn) return;

  const modal = new bootstrap.Modal(modalEl);
  let originalData, applyClicked;

  // OPEN: snapshot & render form
  buildBtn.onclick = e => {
    e.preventDefault();
    originalData  = JSON.parse(JSON.stringify(window.customRouteFormData||[]));
    applyClicked  = false;
    renderForm();
    modal.show();
  };

  // SHOWN: form + map + Sortable
  modalEl.addEventListener('shown.bs.modal', ()=>{
    renderForm(); renderMap(); updateApplyButtonState();
    mapInstance?.invalidateSize();
    Sortable.create(
      document.getElementById('customRouteFormContainer'),
      {
        handle:    '.drag-handle',
        animation: 150,
        onEnd: ({ oldIndex,newIndex })=>{
          window.customRouteFormData.splice(
            newIndex,0,
            window.customRouteFormData.splice(oldIndex,1)[0]
          );
          renderMap();
        }
      }
    );
  });

  // HIDDEN: revert if cancelled
  modalEl.addEventListener('hidden.bs.modal', ()=>{
    if (!applyClicked) {
      window.customRouteFormData = originalData;
      window.filterImages();
      window.updateSelectedFilters();
      window.updateURLParameters();
    }
    mapInstance?.remove();
    mapInstance = null;
  });

  // RESET: clear & redraw
  resetBtn.onclick = ()=> {
    window.customRouteFormData = [];
    renderForm(); renderMap();
  };

  // COPY: only copies URL, does not apply
  copyBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    // first update the URL in the address bar, same as before
    const ms = serializeSegments(window.customRouteFormData);
    const params = new URLSearchParams(window.location.search);
    params.set('multiRoute', ms);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);

    // now copy it and give feedback to the user
    await copyToClipboard(window.location.href);
    copyBtn.classList.add('copied');
    copyBtn.textContent = 'URL Copied!';
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.textContent = 'Copy URL';
    }, 2000);
  });





  // APPLY: commit & close
  applyBtn.onclick = e => {
    e.preventDefault();
    applyClicked = true;
    applyCustomRouteFilter();
    modal.hide();
  };
}
