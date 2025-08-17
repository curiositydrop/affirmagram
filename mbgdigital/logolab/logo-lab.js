/* MBG Digital — Logo Lab (stable client)
   - robustFetch: timeout + retries for 429/5xx/network
   - promptBuilder: combines wizard inputs into one strong prompt
   - friendly soft-error + Retry (keeps inputs)
   - simple progress "breathing" while waiting
*/

const ENDPOINT = '/api/logo';         // <-- change if your backend is different
const IMG_COUNT = 4;                  // 2–6 recommended
const IMG_SIZE  = '1024x1024';        // keep consistent for clean grids

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

// keep state so Retry works without losing answers
let state = {
  brand: '',
  vibe: '',
  colors: '',
  symbol: '',
  extras: ''
};

// ---------- Helpers ----------
async function robustFetch(url, options={}, {retries=2, baseDelay=800, timeoutMs=30000}={}) {
  for (let i=0; i<=retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {...options, signal: controller.signal, cache:'no-store'});
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) throw new Error('retryable');
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (i === retries) throw err;
      const jitter = Math.random()*200;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i) + jitter));
    }
  }
}

function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstElementChild; }

function setStatus(msg){ statusEl.textContent = msg; }
function setLoading(on){
  if (on) {
    setStatus('Generating…');
    chat.appendChild(progressNode());
  } else {
    const p = chat.querySelector('.progress-line');
    if (p) p.remove();
    setStatus('Ready.');
  }
}

function progressNode(){
  const n = el(`
    <div class="progress-line" aria-live="polite">
      <div class="bar-inner"></div>
      <small>Optimizing your concept…</small>
    </div>
  `);
  // breathe from ~30% to ~85%
  const inner = n.querySelector('.bar-inner');
  let pct = 30, dir = +1;
  n._int = setInterval(()=>{
    pct += dir * (3 + Math.random()*2);
    if (pct > 85) dir = -1;
    if (pct < 30) dir = +1;
    inner.style.width = pct + '%';
  }, 300);
  n._cleanup = ()=> clearInterval(n._int);
  return n;
}

function softErrorUI(onRetry){
  const box = el(`
    <div class="soft-error">
      <div>Our generator is cooling down (traffic spike). Retrying usually fixes it.</div>
      <button class="retry-btn">Retry</button>
    </div>
  `);
  box.querySelector('.retry-btn').addEventListener('click', onRetry);
  chat.appendChild(box);
  return box;
}

function clearSoftErrors(){
  chat.querySelectorAll('.soft-error').forEach(n=>n.remove());
}

// Normalize provider responses (url OR base64 fields)
function normalizeImages(apiResp){
  const images = [];
  const src = apiResp?.images || apiResp?.data || [];
  src.forEach(img=>{
    if (!img) return;
    if (img.url) images.push(img.url);
    else if (img.b64_json || img.base64) {
      images.push(`data:image/png;base64,${img.b64_json || img.base64}`);
    }
  });
  return images;
}

// Build a strong, consistent prompt from wizard inputs
function buildPrompt({brand, vibe, colors, symbol, extras}){
  return `${brand} — logo concept.
Style: ${vibe || 'modern, balanced, premium'}.
Colors: ${colors || 'designer’s choice with strong contrast'}.
Symbol/Abstract: ${symbol || 'abstract mark that fits the name'}.
Typography: clean, legible, custom-feel (no stock-font look).
Output: ${IMG_COUNT} presentation-ready logo concepts; strong silhouette, clear negative space; suitable for app icon, business card, and sign usage.${extras ? '\nNotes: ' + extras : ''}`;
}

// Render images in the grid + enable action buttons
function renderImages(urls){
  grid.innerHTML = '';
  urls.forEach(u=>{
    const card = el(`
      <div class="card">
        <img loading="lazy" src="${u}" alt="Logo concept"/>
        <button class="choose">Use this one</button>
      </div>
    `);
    card.querySelector('.choose').addEventListener('click', ()=>{
      // Mark selection; enable purchasing
      grid.querySelectorAll('.card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      updatePurchaseState();
    });
    grid.appendChild(card);
  });
  gallery.hidden = urls.length === 0;
  actions.hidden = urls.length === 0;
  updatePurchaseState();
}

function updatePurchaseState(){
  const hasSelection = !!grid.querySelector('.card.selected');
  const agreed = !!fineprint.checked;
  buyDIY.disabled = !(hasSelection && agreed);
  buyPRO.disabled = !(hasSelection && agreed);
}

// ---------- Wizard UI in #chat ----------
function resetChat(){ chat.innerHTML=''; }

function stepVibe(){
  const node = el(`
    <div class="bot">
      <div style="margin-bottom:8px;">Pick a vibe (or type your own):</div>
      <div class="chips">
        ${['Modern','Bold','Playful','Luxury','Minimal','Edgy','Vintage'].map(s=>`<button class="chip">${s}</button>`).join('')}
      </div>
      <input class="free" placeholder="e.g., modern, bold, gritty"/>
      <div style="margin-top:8px; display:flex; gap:8px;">
        <button class="next">Next</button>
      </div>
    </div>
  `);
  const free = node.querySelector('.free');
  node.querySelectorAll('.chip').forEach(b=> b.addEventListener('click', ()=>{ free.value = b.textContent; }));
  node.querySelector('.next').addEventListener('click', ()=>{
    state.vibe = (free.value || '').trim();
    stepColors();
  });
  chat.appendChild(node);
  free.focus();
}

function stepColors(){
  const node = el(`
    <div class="bot">
      <div style="margin-bottom:8px;">Colors (names or hex):</div>
      <div class="chips">
        ${['Black/White','Teal & Navy','#FF6F00 & #111','Gold & Charcoal','Lavender & Silver'].map(s=>`<button class="chip">${s}</button>`).join('')}
      </div>
      <input class="free" placeholder="e.g., black, chrome, electric blue (#1E90FF)"/>
      <div style="margin-top:8px; display:flex; gap:8px;">
        <button class="next">Next</button>
      </div>
    </div>
  `);
  const free = node.querySelector('.free');
  node.querySelectorAll('.chip').forEach(b=> b.addEventListener('click', ()=>{ free.value = b.textContent; }));
  node.querySelector('.next').addEventListener('click', ()=>{
    state.colors = (free.value || '').trim();
    stepSymbol();
  });
  chat.appendChild(node);
  free.focus();
}

function stepSymbol(){
  const node = el(`
    <div class="bot">
      <div style="margin-bottom:8px;">Symbol or abstract idea:</div>
      <div class="chips">
        ${['Monogram','Lantern + keyhole','Owl','Phoenix','Crescent + Rose','Abstract Wave','Panther'].map(s=>`<button class="chip">${s}</button>`).join('')}
      </div>
      <input class="free" placeholder="e.g., barbell morphing into a hammer, or abstract neural wave"/>
      <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="gen">Generate Concepts</button>
        <button class="add-note">Add a note</button>
      </div>
      <textarea class="note" placeholder="Optional note to the designer/model…" style="display:none; width:100%; min-height:70px; margin-top:8px;"></textarea>
    </div>
  `);
  const free = node.querySelector('.free');
  node.querySelectorAll('.chip').forEach(b=> b.addEventListener('click', ()=>{ free.value = b.textContent; }));
  const noteBtn = node.querySelector('.add-note');
  const note = node.querySelector('.note');
  noteBtn.addEventListener('click', ()=>{
    note.style.display = note.style.display==='none' ? 'block' : 'none';
  });
  node.querySelector('.gen').addEventListener('click', ()=>{
    state.symbol = (free.value || '').trim();
    state.extras = (note.value || '').trim();
    generate();
  });
  chat.appendChild(node);
  free.focus();
}

// ---------- Generation ----------
async function generate(){
  clearSoftErrors();

  state.brand = (brandInput.value || '').trim();

  if (!state.brand){
    brandInput.focus();
    setStatus('Please enter a brand name first.');
    return;
  }

  const prompt = buildPrompt(state);
  const payload = { prompt, size: IMG_SIZE, count: IMG_COUNT };

  setLoading(true);
  try {
    const res = await robustFetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    const urls = normalizeImages(data);

    if (!urls.length) {
      // show soft error + retry
      const box = softErrorUI(()=>{ box.remove(); generate(); });
      setStatus('No images yet. Retry usually helps.');
      return;
    }
    renderImages(urls);
    setStatus('Concepts ready.');
  } catch (e){
    console.warn('Generation failed:', e);
    const box = softErrorUI(()=>{ box.remove(); generate(); });
    setStatus('Network hiccup. Try Retry.');
  } finally {
    setLoading(false);
  }
}

// ---------- Purchases ----------
function attachPurchaseHandlers(){
  fineprint.addEventListener('change', updatePurchaseState);
  buyDIY.addEventListener('click', ()=>{
    const selIdx = [...grid.children].findIndex(c=>c.classList.contains('selected'));
    if (selIdx < 0) return;
    // TODO: wire to your checkout
    alert(`DIY Pack selected for "${state.brand}" (concept #${selIdx+1}).`);
  });
  buyPRO.addEventListener('click', ()=>{
    const selIdx = [...grid.children].findIndex(c=>c.classList.contains('selected'));
    if (selIdx < 0) return;
    // TODO: wire to your checkout
    alert(`Pro Polish selected for "${state.brand}" (concept #${selIdx+1}).`);
  });
}

// ---------- Init (keeps your layout; wizard after Next) ----------
function init(){
  attachPurchaseHandlers();
  nextBtn.addEventListener('click', ()=>{
    state.brand = (brandInput.value || '').trim();
    if (!state.brand){
      brandInput.focus();
      setStatus('Please enter a brand name.');
      return;
    }
    resetChat();
    // continue your multi-step wizard:
    stepVibe();
  });
  // enable button on Enter in brand field
  brandInput.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') nextBtn.click();
  });
  updatePurchaseState();
  setStatus('Ready.');
}
document.addEventListener('DOMContentLoaded', init);
