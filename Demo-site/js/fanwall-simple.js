// js/fanwall-simple.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// --- Init (uses window.FB_CONFIG from js/firebase-config.js) ---
const app = initializeApp(window.FB_CONFIG);
const db  = getFirestore(app);

// --- Elements ---
const form  = document.getElementById('fanForm');
const stage = document.querySelector('.graffiti-wall') || document.querySelector('.fan-posts');
const statusEl = document.getElementById('fanStatus');

// --- helpers ---
const esc = (t='') => String(t).replace(/</g,'&lt;');
const validHex = (hex) => /^#([0-9A-F]{6})$/i.test(hex);

// profanity / derogatory masking
function censor(text) {
  const map = {
    "fuck":"f*#k","fucking":"f*#king","shit":"sh!t","bitch":"b!tch","asshole":"a**hole",
    "dick":"d*ck","pussy":"p*ssy","cunt":"c#+*","bastard":"b*stard","cock":"c*ck",
    "cum":"c*m","twat":"tw*t","prick":"pr*ck","wanker":"w*nker","slut":"sl*t","whore":"wh*re",
    "nigger":"n*****","nigga":"n****","fag":"f*g","faggot":"f*ggot","spic":"sp*c","chink":"ch*nk","kike":"k*ke",
    "retard":"r*tard"
  };
  let s = String(text || '');
  for (const w in map) s = s.replace(new RegExp(`\\b${w}\\b`, 'gi'), map[w]);
  return s;
}

// --- Submit => save (NO approval flag) ---
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const pick  = (form.color?.value || '#32CD32').trim();
  const color = validHex(pick) ? pick : '#32CD32';

  const data = {
    name:    censor((form.name?.value || '').trim()),
    message: censor((form.message?.value || '').trim()),
    image_url: (form.image_url?.value || '').trim(),
    color,
    createdAt: serverTimestamp()
  };
  if (!data.name || !data.message) return;

  try {
    await addDoc(collection(db, 'fanwall'), data);
    if (statusEl) { statusEl.textContent = 'Thanks! Your post is live.'; }
    form.reset();
  } catch (err) {
    if (statusEl) { statusEl.textContent = 'Couldn’t post right now. Try again.'; }
    console.error(err);
  }
});

// --- Render (graffiti style w/ random angle + position; uses color) ---
function renderPost(doc) {
  const d = doc.data();
  const el = document.createElement('div');
  el.className = 'post graffiti-post';
  el.style.color = d.color || '#32CD32';
  el.innerHTML = `
    <strong>${esc(d.name || 'Fan')}</strong>
    <p style="margin:6px 0 8px 0;">${esc(d.message || '')}</p>
    ${d.image_url ? `<a href="${esc(d.image_url)}" target="_blank" rel="noopener">
      <img src="${esc(d.image_url)}" alt="fan photo">
    </a>` : ''}
  `;

  // append first to measure
  stage.appendChild(el);

  // random tilt & position inside .graffiti-wall
  const angle = (Math.random() * 30 - 15).toFixed(1);
  el.style.transform = `rotate(${angle}deg)`;
  const pad = 16;
  const maxLeft = Math.max(0, stage.clientWidth  - el.offsetWidth  - pad);
  const maxTop  = Math.max(0, stage.clientHeight - el.offsetHeight - pad);
  el.style.left = `${Math.floor(Math.random() * (maxLeft + 1))}px`;
  el.style.top  = `${Math.floor(Math.random() * (maxTop  + 1))}px`;
  el.style.zIndex = String(10 + Math.floor(Math.random() * 90));
}

// Live stream newest first (no approval filter)
const q = query(collection(db, 'fanwall'), orderBy('createdAt', 'desc'));
onSnapshot(q, (snap) => {
  stage.innerHTML = '';
  snap.forEach(renderPost);
});
