/* MBG Digital — Logo Lab v15 (simple inputs + auto demo fallback) */

const ENDPOINTS = [
  '/.netlify/functions/logo'  // Netlify serverless function
];
const apiOverride = new URLSearchParams(location.search).get('api'); // optional ?api=/path
const IMG_COUNT = 4;
const IMG_SIZE  = '1024x1024';

// DOM
const brandInput = document.getElementById('brand');
const nextBtn = document.getElementById('next1');
const chat = document.getElementById('chat');
const statusEl = document.getElementById('status');
const gallery = document.getElementById('gallery');
const grid = document.getElementById('grid');
const actions = document.getElementById('actions');
const fineprint = document.getElementById('fineprint');
const buyDIY = document.getElementById('buy-diy');
const buyPRO = document.getElementById('buy-pro');

let state = { brand:'', vibe:'', colors:'', symbol:'', extras:'' };

// helpers
async function robustFetch(url, options={}, {retries=2, baseDelay=800, timeoutMs=30000}={}) {
  for (let i=0; i<=retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal, cache:'no-store' });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) throw new Error('retryable '+res.status);
      return res;
    } catch (e) {
      clearTimeout(timer);
      if (i === retries) throw e;
      await new Promise(r=>setTimeout(r, baseDelay * Math.pow(2, i) + Math.random()*200));
    }
  }
}
function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstElementChild; }
function setStatus(t){
  console.log('[LogoLab]', t);   // still logs for you
  // statusEl.textContent = t;   // comment out so users don’t see it
}
function progressNode(){
  const n = el(`<div class="progress-line" aria-live="polite"><div class="bar-inner"></div><small>Optimizing your concept…</small></div>`);
  const inner = n.querySelector('.bar-inner'); let pct=30, dir=1;
  n._int = setInterval(()=>{ pct += dir*(3+Math.random()*2); if(pct>85)dir=-1; if(pct<30)dir=1; inner.style.width=pct+'%'; }, 300);
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
  const out=[]; if(!apiResp) return out;
  const candidates = apiResp.images || apiResp.data || apiResp.results || apiResp.output || apiResp.urls || apiResp.images_url || [];
  if (Array.isArray(candidates) && typeof candidates[0]==='string'){
    candidates.forEach(u=>{ if(u.startsWith('http')||u.startsWith('data:image')) out.push(u); });
    return out;
  }
  (candidates||[]).forEach(it=>{
    if (!it) return;
    if (typeof it === 'string'){ if(it.startsWith('http')||it.startsWith('data:image')) out.push(it); return; }
    if (it.url) out.push(it.url);
    else if (it.image_url) out.push(it.image_url);
    else if (it.b64_json || it.base64) out.push(`data:image/png;base64,${it.b64_json || it.base64}`);
  });
  return out;
}
function buildPrompt({brand, vibe, colors, symbol, extras}){
  const vibeLine   = vibe || 'modern, minimal, premium';
  const colorLine  = colors || 'limited palette; strong contrast';
  const symbolLine = symbol || 'abstract geometric mark that fits the name';
  const notesLine  = extras ? `Notes: ${extras}\n` : '';

  return [
    `${brand} — professional logo design (brand mark + wordmark).`,
    `Style: ${vibeLine}; corporate identity; timeless; brandable; grid-aligned; balanced spacing.`,
    `Colors: ${colorLine}.`,
    `Symbol: ${symbolLine}.`,
    `Requirements:`,
    `• Vector aesthetic (flat shapes, clean edges, solid fills; no photo, no sketch).`,
    `• No 3D, no bevels, no shadows, no faux gold, no metallic, no lens flare.`,
    `• No mockups (no storefronts, papers, stamps, business cards).`,
    `• Strong silhouette, readable at 24px; good negative space.`,
    `• Neutral background only (white or very light gray).`,
    `• Typography: clean, kerning-aware, custom-feel; avoid default font look.`,
    `${notesLine}Output: ${IMG_COUNT} concept images, each a flat, presentation-ready logo on a neutral background.`
  ].join('\n');
}

// --- API call with auto endpoint; NO demo fallback (debugging) ---
async function callLogoAPI(payload){
  const list = apiOverride ? [apiOverride] : ENDPOINTS;

  for (const ep of list) {
    try {
      setStatus("Optimizing your concept...");
      const res = await robustFetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      const urls = normalizeImages(data);
      if (urls.length) {
        setStatus(""); // clear status once logos are ready
        return urls;
      }
      // if empty, try the next endpoint
    } catch (e) {
      // try next endpoint
    }
  }

  // If we got here, nothing worked — throw so UI shows a clear error
  throw new Error('Logo API failed — no fallback');
}
  // DEMO FALLBACK disabled (debugging):
throw new Error('Logo API failed — no fallback');

// UI: simple inputs + examples
function renderForm(){
  chat.innerHTML='';
  chat.appendChild(el(`
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
    </div>
  `));
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
  chat.appendChild(form);
  form.querySelector('#vibe').value = state.vibe || '';
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

// generation
async function generate(){
  clearSoftErrors();
  state.brand = (brandInput.value || '').trim();
  if (!state.brand){ brandInput.focus(); setStatus('Please enter a brand name first.'); return; }

  const payload = { prompt: buildPrompt(state), size: IMG_SIZE, count: IMG_COUNT };
  const prog = progressNode(); chat.appendChild(prog); setStatus('Generating…');

  try{
    const urls = await callLogoAPI(payload);
    grid.innerHTML='';
    urls.forEach(u=>{
      const card = el(`
  <div class="card">
    <img loading="lazy" src="${u}" alt="Logo concept"
         onerror="this.onerror=null; this.src='https://placehold.co/1024x1024?text=Logo';" />
    <button class="choose">Use this one</button>
  </div>
`);
      card.querySelector('.choose').addEventListener('click', ()=>{
        grid.querySelectorAll('.card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected'); updatePurchaseState();
      });
      grid.appendChild(card);
    });
    gallery.hidden = false; actions.hidden = false; updatePurchaseState();
  }catch(e){
    console.warn('Generation failed:', e);
    showSoftError(()=>{ renderForm(); generate(); });
    setStatus('Could not get images. Tap Retry.');
  }finally{
    if (prog?.cleanup) prog.cleanup(); prog?.remove();
  }
}

// purchase
function updatePurchaseState(){
  const hasSelection = !!grid.querySelector('.card.selected');
  const agreed = !!fineprint.checked;
  buyDIY.disabled = !(hasSelection && agreed);
  buyPRO.disabled = !(hasSelection && agreed);
}
function attachPurchaseHandlers(){
  fineprint.addEventListener('change', updatePurchaseState);
  buyDIY.addEventListener('click', ()=>{
    const idx = [...grid.children].findIndex(c=>c.classList.contains('selected')); if(idx<0) return;
    alert(`DIY Pack selected for "${state.brand}" (concept #${idx+1}).`);
  });
  buyPRO.addEventListener('click', ()=>{
    const idx = [...grid.children].findIndex(c=>c.classList.contains('selected')); if(idx<0) return;
    alert(`Pro Polish selected for "${state.brand}" (concept #${idx+1}).`);
  });
}

// init
function init(){
  attachPurchaseHandlers();
  nextBtn.addEventListener('click', ()=>{
    state.brand = (brandInput.value || '').trim();
    if (!state.brand){ brandInput.focus(); setStatus('Please enter a brand name.'); return; }
    renderForm();
  });
  brandInput.addEventListener('keydown', e=>{ if(e.key==='Enter') nextBtn.click(); });
  updatePurchaseState(); setStatus('Ready.');
}
document.addEventListener('DOMContentLoaded', init);
