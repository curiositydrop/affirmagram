/* MBG Digital — Logo Lab (simple inputs, autodetect API, stable client) */

const FALLBACK_ENDPOINTS = [
  // 1) likely subpath for your site
  '/mbgdigital/api/logo',
  // 2) root-level common path
  '/api/logo'
];
// allow override via query param, e.g. .../logolab/?api=/api/logo
const apiOverride = new URLSearchParams(location.search).get('api');
let triedEndpoints = [];
function currentEndpoint() {
  return apiOverride || FALLBACK_ENDPOINTS[0];
}
const IMG_COUNT = 4;
const IMG_SIZE  = '1024x1024';

// ---------- DOM ----------
const brandInput = document.getElementById('brand');
const nextBtn    = document.getElementById('next1');
const chat       = document.getElementById('chat');
const statusEl   = document.getElementById('status');
const gallery    = document.getElementById('gallery');
const grid       = document.getElementById('grid');
const actions    = document.getElementById('actions');
const fineprint  = document.getElementById('fineprint');
const buyDIY     = document.getElementById('buy-diy');
const buyPRO     = document.getElementById('buy-pro');

let state = { brand:'', vibe:'', colors:'', symbol:'', extras:'' };

// ---------- helpers ----------
async function robustFetch(url, options={}, {retries=2, baseDelay=800, timeoutMs=30000}={}) {
  for (let i=0; i<=retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal, cache:'no-store' });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) throw new Error('retryable HTTP '+res.status);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (i === retries) throw err;
      const delay = baseDelay * Math.pow(2, i) + Math.random()*200;
      await new Promise(r=>setTimeout(r, delay));
    }
  }
}

function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstElementChild; }
function setStatus(msg){ statusEl.textContent = msg; }

function progressNode(){
  const n = el(`<div class="progress-line" aria-live="polite"><div class="bar-inner"></div><small>Optimizing your concept…</small></div>`);
  const inner = n.querySelector('.bar-inner'); let pct = 30, dir = +1;
  n._int = setInterval(()=>{ pct += dir*(3+Math.random()*2); if(pct>85)dir=-1; if(pct<30)dir=+1; inner.style.width=pct+'%'; }, 300);
  n.cleanup = ()=> clearInterval(n._int);
  return n;
}
function showSoftError(onRetry){
  const box = el(`<div class="soft-error"><div>Generator is cooling down. Retrying usually fixes it.</div><button class="retry-btn">Retry</button></div>`);
  box.querySelector('.retry-btn').addEventListener('click', onRetry);
  chat.appendChild(box);
}
function clearSoftErrors(){ chat.querySelectorAll('.soft-error').forEach(n=>n.remove()); }

function normalizeImages(apiResp){
  const out = [];
  if (!apiResp) return out;

  // handle many common shapes
  const candidates =
    apiResp.images ||
    apiResp.data ||
    apiResp.results ||
    apiResp.output ||
    apiResp.urls ||
    apiResp.images_url ||
    [];

  if (Array.isArray(candidates) && typeof candidates[0] === 'string') {
    candidates.forEach(u => {
      if (u.startsWith('data:image') || u.startsWith('http')) out.push(u);
    });
    return out;
  }

  (candidates || []).forEach(item => {
    if (!item) return;
    if (typeof item === 'string') {
      if (item.startsWith('data:image') || item.startsWith('http')) out.push(item);
      return;
    }
    if (item.url && (item.url.startsWith('http') || item.url.startsWith('data:image'))) {
      out.push(item.url);
    } else if (item.image_url) {
      out.push(item.image_url);
    } else if (item.b64_json || item.base64) {
      out.push(`data:image/png;base64,${item.b64_json || item.base64}`);
    }
  });
  return out;
}

function buildPrompt({brand, vibe, colors, symbol, extras}){
  return `${brand} — logo concept.
Style: ${vibe || 'modern, balanced, premium'}.
Colors: ${colors || 'designer’s choice with strong contrast'}.
Symbol/Abstract: ${symbol || 'abstract mark that fits the name'}.
Typography: clean, legible, custom-feel (no stock-font look).
Output: ${IMG_COUNT} presentation-ready logo concepts; strong silhouette, clear negative space; suitable for app icon, business card, and signage.${extras ? '\nNotes: '+extras : ''}`;
}

// --- API caller that auto-tries alternate endpoints ---
async function callLogoAPI(payload){
  const endpointsToTry = apiOverride ? [apiOverride] : FALLBACK_ENDPOINTS;
  let lastErr, lastStatus;

  for (const ep of endpointsToTry) {
    triedEndpoints.push(ep);
    setStatus(`Calling ${ep}…`);
    try {
      const res = await robustFetch(ep, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      lastStatus = res.status;
      const data = await res.json().catch(()=> ({}));
      const urls = normalizeImages(data);
      if (urls.length) {
        setStatus(`Concepts ready from ${ep}.`);
        return urls;
      } else {
        // if response is OK but empty, try next
        lastErr = new Error('Empty images array');
      }
    } catch (e){
      lastErr = e;
      // try the next endpoint
    }
  }
  throw lastErr || new Error(`All endpoints failed (tried: ${endpointsToTry.join(', ')})`);
}

// ---------- UI: simple text inputs + examples ----------
function renderForm(){
  chat.innerHTML = '';
  const examples = el(`
    <div class="bot examples">
      <strong>Prompt Examples</strong>
      <ul>
        <li><em>Vibe:</em> Modern luxury & bold</li>
        <li><em>Colors:</em> Black, gold, white (#FFD700)</li>
        <li><em>Symbol:</em> Interlocked MBG monogram crest</li>
      </ul>
      <ul>
        <li><em>Vibe:</em> Futuristic, sleek, innovative</li>
        <li><em>Colors:</em> Teal & navy (#0fb, #001f3f)</li>
        <li><em>Symbol:</em> Digital wave morphing into neural nodes</li>
      </ul>
      <small style="opacity:.8">Tip: You can force a specific API by adding <code>?api=/api/logo</code> to the page URL.</small>
    </div>
  `);
  const form = el(`
    <div class="bot input-stack">
      <label>What vibe fits <strong>${state.brand}</strong>?
        <input id="vibe" placeholder="e.g., modern, bold, playful, luxury, edgy"/>
      </label>
      <label>Any colors you love or hate?
        <input id="colors" placeholder="e.g., black & gold, or hex: #000000, #FFD700"/>
      </label>
      <label>Want a symbol or keep it abstract?
        <input id="symbol" placeholder="e.g., lantern + keyhole, monogram, abstract wave"/>
      </label>
      <label>Notes (optional)
        <input id="extras" placeholder="e.g., icon-friendly, minimal gradients"/>
      </label>
      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        <button id="gen" class="primary">Generate Concepts</button>
      </div>
    </div>
  `);
  chat.appendChild(examples); chat.appendChild(form);
  form.querySelector('#vibe').value   = state.vibe || '';
  form.querySelector('#colors').value = state.colors || '';
  form.querySelector('#symbol').value = state.symbol || '';
  form.querySelector('#extras').value = state.extras || '';
  form.querySelector('#gen').addEventListener('click', ()=>{
    state.vibe   = form.querySelector('#vibe').value.trim();
    state.colors = form.querySelector('#colors').value.trim();
    state.symbol = form.querySelector('#symbol').value.trim();
    state.extras = form.querySelector('#extras').value.trim();
    generate();
  });
}

// ---------- generation ----------
async function generate(){
  clearSoftErrors();
  state.brand = (brandInput.value || '').trim();
  if (!state.brand){ brandInput.focus(); setStatus('Please enter a brand name first.'); return; }

  const payload = { prompt: buildPrompt(state), size: IMG_SIZE, count: IMG_COUNT };

  setStatus('Generating…');
  const prog = progressNode(); chat.appendChild(prog);

  try {
    const urls = await callLogoAPI(payload);
    grid.innerHTML = '';
    urls.forEach(u=>{
      const card = el(`<div class="card"><img loading="lazy" src="${u}" alt="Logo concept"/><button class="choose">Use this one</button></div>`);
      card.querySelector('.choose').addEventListener('click', ()=>{
        grid.querySelectorAll('.card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected'); updatePurchaseState();
      });
      grid.appendChild(card);
    });
    gallery.hidden = false; actions.hidden = false; updatePurchaseState();
  } catch (e){
    console.warn('Generation failed. Tried endpoints:', triedEndpoints, e);
    showSoftError(()=>{ renderForm(); generate(); });
    setStatus('Could not get images. Tap Retry (or add ?api=/api/logo).');
  } finally {
    if (prog?.cleanup) prog.cleanup(); prog?.remove();
  }
}

// ---------- purchases ----------
function updatePurchaseState(){
  const hasSelection = !!grid.querySelector('.card.selected');
  const agreed = !!fineprint.checked;
  buyDIY.disabled = !(hasSelection && agreed);
  buyPRO.disabled = !(hasSelection && agreed);
}
function attachPurchaseHandlers(){
  fineprint.addEventListener('change', updatePurchaseState);
  buyDIY.addEventListener('click', ()=>{
    const idx = [...grid.children].findIndex(c=>c.classList.contains('selected')); if (idx<0) return;
    alert(`DIY Pack selected for "${state.brand}" (concept #${idx+1}).`);
  });
  buyPRO.addEventListener('click', ()=>{
    const idx = [...grid.children].findIndex(c=>c.classList.contains('selected')); if (idx<0) return;
    alert(`Pro Polish selected for "${state.brand}" (concept #${idx+1}).`);
  });
}

// ---------- init ----------
function init(){
  attachPurchaseHandlers();
  nextBtn.addEventListener('click', ()=>{
    state.brand = (brandInput.value || '').trim();
    if (!state.brand){ brandInput.focus(); setStatus('Please enter a brand name.'); return; }
    renderForm();
  });
  brandInput.addEventListener('keydown', e=>{ if (e.key==='Enter') nextBtn.click(); });
  updatePurchaseState(); setStatus('Ready.');
}
document.addEventListener('DOMContentLoaded', init);
