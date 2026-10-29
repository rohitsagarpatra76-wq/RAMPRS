const $ = (id) => document.getElementById(id);

function getApiBase() {
  const custom = localStorage.getItem('RAMPRS_API_URL');
  if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://127.0.0.1:8000';
  }
  return 'http://127.0.0.1:8000';
}


const state = {
  personPhotoUrl: 'assets/user_portrait_sample.jpg',
  garmentPhotoUrl: null,
  targetRegion: 'all',
  inputMode: 'ajio', // 'ajio', 'text', 'garment', 'hybrid'
  styleMode: 'editorial',
  fit: 'Regular',
  stream: null,
  lastEditedUrl: 'assets/user_portrait_sample.jpg',
  maskPreviewUrl: 'assets/user_portrait_sample.jpg',
  ajioCategory: 'All'
};

/* ── UI Elements ─────────────────────────────────────── */
const personPreview = $('personPreview');
const cameraVideo = $('cameraVideo');
const cameraCanvas = $('cameraCanvas');
const beforeImg = $('beforeImg');
const afterImg = $('afterImg');
const sideBeforeImg = $('sideBeforeImg');
const sideAfterImg = $('sideAfterImg');
const singleAfterImg = $('singleAfterImg');
const singleMaskImg = $('singleMaskImg');
const comparisonSlider = $('comparisonSlider');
const slideBefore = $('slideBefore');
const sliderHandle = $('sliderHandle');

/* ── Tab & Mode Switchers ─────────────────────────────── */
function setInputMode(mode) {
  state.inputMode = mode;
  if ($('tabAjioMode')) $('tabAjioMode').classList.toggle('active', mode === 'ajio');
  $('tabTextMode').classList.toggle('active', mode === 'text');
  $('tabGarmentMode').classList.toggle('active', mode === 'garment');
  $('tabHybridMode').classList.toggle('active', mode === 'hybrid');

  if ($('contentAjio')) $('contentAjio').hidden = (mode !== 'ajio');
  $('contentPrompt').hidden = (mode !== 'text' && mode !== 'hybrid');
  $('contentGarment').hidden = (mode !== 'garment' && mode !== 'hybrid');
}

if ($('tabAjioMode')) $('tabAjioMode').addEventListener('click', () => setInputMode('ajio'));
$('tabTextMode').addEventListener('click', () => setInputMode('text'));
$('tabGarmentMode').addEventListener('click', () => setInputMode('garment'));
$('tabHybridMode').addEventListener('click', () => setInputMode('hybrid'));

/* ── Target Region Selector ──────────────────────────── */
document.querySelectorAll('#regionSelector .region-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#regionSelector .region-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.targetRegion = btn.getAttribute('data-region') || 'all';
  });
});

/* ── Prompt Chips ────────────────────────────────────── */
document.querySelectorAll('.prompt-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    $('promptInput').value = chip.getAttribute('data-prompt') || '';
  });
});

/* ── View Mode Switcher ──────────────────────────────── */
document.querySelectorAll('.view-toggles .view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-toggles .view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.getAttribute('data-view');

    $('comparisonSlider').hidden = (view !== 'slider');
    $('sideBySideView').hidden = (view !== 'side');
    $('singleEditedView').hidden = (view !== 'edited');
    $('singleMaskView').hidden = (view !== 'mask');
  });
});

/* ── Before / After Split Comparison Slider ──────────── */
let isDragging = false;

function setSliderPosition(clientX) {
  const rect = comparisonSlider.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  let pct = (offsetX / rect.width) * 100;
  pct = Math.max(5, Math.min(95, pct));

  slideBefore.style.width = `${pct}%`;
  sliderHandle.style.left = `${pct}%`;
}

sliderHandle.addEventListener('mousedown', (e) => {
  isDragging = true;
  e.preventDefault();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  setSliderPosition(e.clientX);
});

// Touch support for mobile / tablets
sliderHandle.addEventListener('touchstart', (e) => {
  isDragging = true;
}, { passive: true });

window.addEventListener('touchend', () => {
  isDragging = false;
});

window.addEventListener('touchmove', (e) => {
  if (!isDragging || !e.touches[0]) return;
  setSliderPosition(e.touches[0].clientX);
});

// Click anywhere on slider to snap
comparisonSlider.addEventListener('click', (e) => {
  if (e.target.closest('#sliderHandle')) return;
  setSliderPosition(e.clientX);
});

/* ── Person Photo Upload & Camera ────────────────────── */
$('btnUploadPerson').addEventListener('click', () => $('personFileInput').click());

$('personFileInput').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    setPersonPhoto(ev.target.result);
  };
  reader.readAsDataURL(file);
});

function setPersonPhoto(url) {
  state.personPhotoUrl = url;
  personPreview.src = url;
  personPreview.hidden = false;
  cameraVideo.hidden = true;
  stopCamera();

  // Reset comparison canvas
  beforeImg.src = url;
  sideBeforeImg.src = url;
  afterImg.src = url;
  sideAfterImg.src = url;
  singleAfterImg.src = url;
  singleMaskImg.src = url;

  // Re-analyze portrait with Ajio fashion stylist
  loadAjioRecommendations();
}

$('btnToggleCamera').addEventListener('click', async () => {
  if (state.stream) {
    stopCamera();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Camera requires HTTPS or localhost. Please use the Upload Image button.');
    return;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    cameraVideo.srcObject = state.stream;
    cameraVideo.hidden = false;
    personPreview.hidden = true;
    $('btnCapturePhoto').hidden = false;
    $('btnToggleCamera').textContent = 'Cancel Camera';
  } catch (err) {
    console.error(err);
    alert('Could not access camera. Please allow camera permissions or upload an image.');
  }
});

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
  }
  cameraVideo.srcObject = null;
  cameraVideo.hidden = true;
  personPreview.hidden = false;
  $('btnCapturePhoto').hidden = true;
  $('btnToggleCamera').textContent = '📷 Use Camera';
}

$('btnCapturePhoto').addEventListener('click', () => {
  if (!state.stream || !cameraVideo.videoWidth) return;
  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  const ctx = cameraCanvas.getContext('2d');
  ctx.translate(cameraCanvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
  const dataUrl = cameraCanvas.toDataURL('image/jpeg', 0.94);
  setPersonPhoto(dataUrl);
});

/* ── Reference Garment Image Upload ──────────────────── */
const garmentDropzone = $('garmentDropzone');
const garmentFileInput = $('garmentFileInput');
const garmentPreviewWrap = $('garmentPreviewWrap');
const garmentPreviewImg = $('garmentPreviewImg');
const garmentEmpty = $('garmentEmpty');
const garmentInfoBox = $('garmentInfoBox');

garmentDropzone.addEventListener('click', (e) => {
  if (e.target.closest('#btnRemoveGarment')) return;
  garmentFileInput.click();
});

garmentFileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    state.garmentPhotoUrl = ev.target.result;
    garmentPreviewImg.src = ev.target.result;
    garmentPreviewWrap.hidden = false;
    garmentEmpty.hidden = true;
    garmentInfoBox.hidden = false;
    $('garmentColorName').textContent = file.name;
  };
  reader.readAsDataURL(file);
});

$('btnRemoveGarment').addEventListener('click', (e) => {
  e.stopPropagation();
  state.garmentPhotoUrl = null;
  garmentFileInput.value = '';
  garmentPreviewWrap.hidden = true;
  garmentEmpty.hidden = false;
  garmentInfoBox.hidden = true;
  document.querySelectorAll('#sampleGarmentsGrid .sample-card').forEach(c => c.classList.remove('active'));
});

/* ── Capsule Wardrobe Sample Garments Clicker ────────── */
document.querySelectorAll('#sampleGarmentsGrid .sample-card').forEach(card => {
  card.addEventListener('click', async () => {
    document.querySelectorAll('#sampleGarmentsGrid .sample-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    
    const src = card.getAttribute('data-src');
    const name = card.getAttribute('data-name');
    
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        state.garmentPhotoUrl = reader.result;
        garmentPreviewImg.src = reader.result;
        garmentPreviewWrap.hidden = false;
        garmentEmpty.hidden = true;
        garmentInfoBox.hidden = false;
        $('garmentColorName').textContent = name;
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error("Could not load sample garment:", e);
    }
  });
});

/* ── Execute AI Clothing Edit ────────────────────────── */
async function executeClothingEdit() {
  const btn = $('btnGenerate');
  const overlay = $('inferenceOverlay');
  const statusText = $('inferenceStatusText');

  btn.disabled = true;
  overlay.hidden = false;
  statusText.textContent = 'Segmenting targeted clothing regions & locking identity…';

  try {
    let personB64 = state.personPhotoUrl;

    // Convert local asset path to Base64 if needed
    if (!personB64.startsWith('data:')) {
      const resp = await fetch(personB64);
      const blob = await resp.blob();
      personB64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }

    statusText.textContent = 'Applying diffusion inpainting with fabric physics…';

    const payload = {
      photo: personB64,
      garment_photo: (state.inputMode !== 'text' && state.garmentPhotoUrl) ? state.garmentPhotoUrl : null,
      prompt: (state.inputMode !== 'garment') ? $('promptInput').value.trim() : null,
      target_region: state.targetRegion,
      style_mode: $('styleModeSelect').value,
      fit: $('fitSelect').value
    };

    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/edit_clothing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error ${res.status}`);
    }

    const data = await res.json();

    // 1. Update Result Images
    if (data.edited_image) {
      state.lastEditedUrl = data.edited_image;
      afterImg.src = data.edited_image;
      sideAfterImg.src = data.edited_image;
      singleAfterImg.src = data.edited_image;
    }

    if (data.original_image) {
      beforeImg.src = data.original_image;
      sideBeforeImg.src = data.original_image;
    }

    if (data.mask_preview) {
      state.maskPreviewUrl = data.mask_preview;
      singleMaskImg.src = data.mask_preview;
    }

    // 2. Update QA Metrics
    if (data.metrics) {
      $('metricIdentity').textContent = data.metrics.identity_preserved || '100% Preserved';
      $('metricBackground').textContent = data.metrics.background_preserved || '100% Locked';
      $('metricRegion').textContent = data.metrics.target_region_modified || state.targetRegion.toUpperCase();
      $('metricStyle').textContent = data.metrics.style_applied || $('styleModeSelect').value.toUpperCase();
    }
    if (data.mask_stats && data.mask_stats.detector_used) {
      const el = $('metricDetector');
      if (el) el.textContent = data.mask_stats.detector_used;
    }

    // 3. Update Garment Detection Badge if reference was provided
    if (data.garment_info) {
      $('garmentColorSwatch').style.backgroundColor = data.garment_info.hex;
      $('garmentColorName').textContent = `${data.garment_info.color_name} (${data.garment_info.hex})`;
      garmentInfoBox.hidden = false;
    }

    // Reset slider to center
    slideBefore.style.width = '50%';
    sliderHandle.style.left = '50%';

  } catch (err) {
    console.error('Editing error:', err);
    if (window.location.hostname.includes('vercel.app') && !localStorage.getItem('RAMPRS_API_URL')) {
      alert("⚡ Vercel Deployment Notice:\n\nThe heavy PyTorch/ControlNet AI model runs on local/cloud GPU hardware.\n\nTo generate live diffusion try-ons from Vercel, connect your server in '⚙️ AI Server' (e.g. using a free Cloudflare Tunnel: cloudflared tunnel --url http://127.0.0.1:8000).");
      const btnCfg = $('btnServerConfig');
      if (btnCfg) btnCfg.click();
    } else {
      alert(`Virtual Try-On error: ${err.message || 'Server unavailable'}`);
    }
  } finally {
    btn.disabled = false;
    overlay.hidden = true;
  }
}

$('btnGenerate').addEventListener('click', executeClothingEdit);

/* ── Download High-Res Result ────────────────────────── */
$('btnDownload').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `ramprs-virtual-tryon-${Date.now()}.jpg`;
  link.href = state.lastEditedUrl;
  link.click();
});

/* ── AI Model Specs Toggle ────────────────────────────── */
const btnToggleModelInfo = $('btnToggleModelInfo');
const modelsInfoCard = $('modelsInfoCard');
if (btnToggleModelInfo && modelsInfoCard) {
  btnToggleModelInfo.addEventListener('click', () => {
    modelsInfoCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    modelsInfoCard.style.outline = '2px solid var(--gold)';
    setTimeout(() => { modelsInfoCard.style.outline = 'none'; }, 2000);
  });
}

/* ── AI Server Health Check ───────────────────────────── */
async function checkAIServer() {
  const statusEl = $('aiStatus');
  if (!statusEl) return;
  const apiBase = getApiBase();
  try {
    const res = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (data.ok && data.model_loaded) {
      statusEl.className = 'ai-status-badge';
      statusEl.innerHTML = `<i class="dot"></i> AI Ready (${data.device.toUpperCase()})`;
      if (data.device && $('modelInfoDevice')) {
        $('modelInfoDevice').textContent = `${data.device.toUpperCase()} (PyTorch Safe Mode)`;
      }
    } else {
      statusEl.className = 'ai-status-badge offline';
      statusEl.innerHTML = `<i class="dot"></i> AI Initializing...`;
    }
  } catch (e) {
    statusEl.className = 'ai-status-badge offline';
    const isVercel = window.location.hostname.includes('vercel.app');
    statusEl.innerHTML = isVercel 
      ? `<i class="dot"></i> Cloud Mode (Connect AI ⚙️)` 
      : `<i class="dot"></i> AI Offline (Port 8000)`;
  }
}

/* ── Client-Side In-Browser Ajio Stylist Fallback ────── */
let cachedAjioCatalog = null;
async function runClientSideAjioStylist(photoB64, category, limit) {
  try {
    if (!cachedAjioCatalog) {
      const resp = await fetch('ajio_curated_catalog.json');
      if (resp.ok) cachedAjioCatalog = await resp.json();
    }
  } catch (e) {
    console.warn('Could not load static ajio catalog', e);
  }

  let undertone = 'Warm';
  let contrastDesc = 'Medium Contrast';
  let styleTip = 'Rich earthy tones (Olive, Burgundy, Rust, Caramel) beautifully enhance your skin warmth.';
  let bestPalettes = ['Earthy Tones', 'Terracotta & Rust', 'Forest Green', 'Rich Burgundy'];

  try {
    const img = new Image();
    img.src = photoB64;
    await new Promise((r) => { img.onload = r; img.onerror = r; });
    const cvs = document.createElement('canvas');
    cvs.width = 64; cvs.height = 64;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0, 64, 64);
    const p = ctx.getImageData(24, 20, 16, 16).data;
    let rSum = 0, gSum = 0, bSum = 0;
    for (let i = 0; i < p.length; i += 4) {
      rSum += p[i]; gSum += p[i+1]; bSum += p[i+2];
    }
    const count = p.length / 4;
    const avgR = rSum / count, avgG = gSum / count, avgB = bSum / count;
    if (avgR - avgB > 24) {
      undertone = 'Warm';
      contrastDesc = (avgR > 140) ? 'Medium Contrast' : 'High Contrast';
      styleTip = 'Rich earthy tones (Olive, Burgundy, Rust, Caramel) beautifully enhance your natural skin warmth.';
      bestPalettes = ['Earthy Tones', 'Terracotta & Rust', 'Forest Green', 'Deep Navy'];
    } else if (avgB >= avgR - 5) {
      undertone = 'Cool';
      contrastDesc = 'Cool Ash Contrast';
      styleTip = 'Cool crisp tones (Powder Blue, Sage Green, Slate Grey, Crisp White) provide refined balance.';
      bestPalettes = ['Powder Blue', 'Sage Green', 'Slate Grey', 'Crisp White'];
    } else {
      undertone = 'Neutral';
      contrastDesc = 'Balanced Contrast';
      styleTip = 'Balanced versatility — both subtle pastels and deep jewel tones (Navy, Olive, Charcoal) look sharp.';
      bestPalettes = ['Classic Navy', 'Charcoal Grey', 'Stone Beige', 'Ivory Cream'];
    }
  } catch (err) {
    console.warn('Canvas colorimetry error:', err);
  }

  const catalog = cachedAjioCatalog || [];
  let filtered = catalog;
  if (category && category !== 'All') {
    filtered = catalog.filter(it => it.category && it.category.toLowerCase() === category.toLowerCase());
    if (filtered.length === 0) filtered = catalog;
  }

  const sorted = [...filtered].sort((a, b) => {
    const aMatch = a.flattering_undertone === undertone ? 1 : 0;
    const bMatch = b.flattering_undertone === undertone ? 1 : 0;
    return bMatch - aMatch;
  });

  return {
    ok: true,
    styling_analysis: {
      undertone,
      contrast_desc: contrastDesc,
      style_tip: styleTip,
      best_palettes: bestPalettes
    },
    recommendations: sorted.slice(0, limit || 14)
  };
}

/* ── Ajio AI Fashion Stylist Integration ─────────────── */
async function loadAjioRecommendations() {
  const grid = $('ajioCatalogGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="ajio-loading">Analyzing skin tone & matching Ajio catalog...</div>';

  try {
    let personB64 = state.personPhotoUrl;
    if (!personB64.startsWith('data:')) {
      const resp = await fetch(personB64);
      const blob = await resp.blob();
      personB64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }

    const apiBase = getApiBase();
    let data = null;

    try {
      const res = await fetch(`${apiBase}/ajio/analyze_and_recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo: personB64,
          category: state.ajioCategory,
          limit: 14
        }),
        signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        data = await res.json();
      }
    } catch (_netErr) {
      // Backend not running on this host (e.g. on Vercel); gracefully fallback to client-side catalog intelligence!
      data = await runClientSideAjioStylist(personB64, state.ajioCategory, 14);
    }

    if (!data) {
      data = await runClientSideAjioStylist(personB64, state.ajioCategory, 14);
    }

    // 1. Update Stylist Diagnostic Card
    if (data.styling_analysis) {
      const sa = data.styling_analysis;
      if ($('ajioUndertoneBadge')) {
        $('ajioUndertoneBadge').textContent = `${sa.undertone} (${sa.contrast_desc})`;
      }
      if ($('ajioStyleTip')) {
        $('ajioStyleTip').textContent = sa.style_tip;
      }
      if ($('ajioPaletteTags') && sa.best_palettes) {
        $('ajioPaletteTags').innerHTML = sa.best_palettes.map(p => `<span class="color-tag">${p}</span>`).join('');
      }
    }

    // 2. Render Ajio Catalog Products
    if (data.recommendations && data.recommendations.length > 0) {
      grid.innerHTML = data.recommendations.map(it => `
        <div class="ajio-item-card">
          <div class="ajio-img-wrap">
            <img src="${it.image_url}" alt="${it.title}" loading="lazy" onerror="this.src='assets/card_1.jpg'">
            <span class="ajio-price-badge">${it.price || 'Ajio'}</span>
          </div>
          <div class="ajio-card-body">
            <span class="ajio-brand">${it.brand}</span>
            <span class="ajio-title" title="${it.title}">${it.title}</span>
            <button class="btn-tryon-ajio" data-ajio='${JSON.stringify(it).replace(/'/g, "&apos;")}'>✨ Try This On</button>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.btn-tryon-ajio').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const raw = btn.getAttribute('data-ajio');
          const item = JSON.parse(raw);
          applyAjioItemAndTryOn(item);
        });
      });
    } else {
      grid.innerHTML = '<div class="ajio-loading">No matched items found in this category.</div>';
    }

  } catch (err) {
    console.warn('Ajio stylist error:', err);
    grid.innerHTML = '<div class="ajio-loading">Ajio Stylist offline (Check port 8000).</div>';
  }
}

function applyAjioItemAndTryOn(item) {
  // Set target region based on item
  state.targetRegion = item.region || 'top';
  document.querySelectorAll('#regionSelector .region-pill').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-region') === state.targetRegion);
  });

  // Populate prompt
  $('promptInput').value = item.tryon_prompt;

  // Set style and fit
  if (item.fit) $('fitSelect').value = item.fit;
  if (item.style_mode) $('styleModeSelect').value = item.style_mode;

  // Set reference garment preview
  state.garmentPhotoUrl = item.image_url;
  $('garmentPreviewImg').src = item.image_url;
  $('garmentPreviewWrap').hidden = false;
  $('garmentEmpty').hidden = true;
  $('garmentInfoBox').hidden = false;
  $('garmentColorName').textContent = `${item.brand} • ${item.color} (${item.title.slice(0, 22)}…)`;

  // Execute Try-On
  executeClothingEdit();
}

// Category filter listeners
document.querySelectorAll('#ajioFilters .cat-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('#ajioFilters .cat-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.ajioCategory = pill.getAttribute('data-cat') || 'All';
    loadAjioRecommendations();
  });
});

// Initial checks & setup
checkAIServer();
setInterval(checkAIServer, 10000);
loadAjioRecommendations();


/* ── Server Settings Modal Event Handlers ────────────── */
const serverModal = $('serverModal');
const btnServerConfig = $('btnServerConfig');
const btnCloseModal = $('btnCloseModal');
const inputServerUrl = $('inputServerUrl');
const btnSaveServerUrl = $('btnSaveServerUrl');
const modalTestResult = $('modalTestResult');

if (btnServerConfig && serverModal) {
  btnServerConfig.addEventListener('click', () => {
    if (inputServerUrl) inputServerUrl.value = localStorage.getItem('RAMPRS_API_URL') || getApiBase();
    if (modalTestResult) {
      modalTestResult.textContent = '';
      modalTestResult.className = 'modal-test-status';
    }
    serverModal.hidden = false;
  });
}

if (btnCloseModal && serverModal) {
  btnCloseModal.addEventListener('click', () => { serverModal.hidden = true; });
  serverModal.addEventListener('click', (e) => {
    if (e.target === serverModal) serverModal.hidden = true;
  });
}

if (btnSaveServerUrl && inputServerUrl) {
  btnSaveServerUrl.addEventListener('click', async () => {
    const val = inputServerUrl.value.trim().replace(/\/+$/, '');
    localStorage.setItem('RAMPRS_API_URL', val);
    if (modalTestResult) {
      modalTestResult.textContent = 'Testing connection...';
      modalTestResult.className = 'modal-test-status';
    }
    try {
      const res = await fetch(`${val}/health`, { signal: AbortSignal.timeout(3500) });
      const d = await res.json();
      if (d.ok) {
        if (modalTestResult) {
          modalTestResult.textContent = `✓ Connected! AI Ready (${d.device ? d.device.toUpperCase() : 'CPU'})`;
          modalTestResult.className = 'modal-test-status success';
        }
        checkAIServer();
        loadAjioRecommendations();
        setTimeout(() => { if (serverModal) serverModal.hidden = true; }, 1200);
      } else {
        if (modalTestResult) {
          modalTestResult.textContent = 'Server responded but model is not loaded.';
          modalTestResult.className = 'modal-test-status error';
        }
      }
    } catch (e) {
      if (modalTestResult) {
        modalTestResult.textContent = `✕ Could not reach ${val}: ${e.message}`;
        modalTestResult.className = 'modal-test-status error';
      }
    }
  });
}
