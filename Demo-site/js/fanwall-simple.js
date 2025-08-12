// js/fanwall-simple.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Init Firebase using global config
const app = initializeApp(window.FB_CONFIG);
const db = getDatabase(app);

// Elements
const statusEl = document.getElementById('fanStatus');
const stage = document.querySelector('.graffiti-wall');
const form = document.getElementById('fanForm');

// Helper: status messages
const say = (msg, color) => {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.style.color = color || "";
};

// Bad word censor
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

const esc = t => String(t || '').replace(/</g, '&lt;');
const hex = h => /^#([0-9A-F]{6})$/i.test(h);

// Submit handler
form?.addEventListener('submit', e => {
  e.preventDefault();

  const name = censor(form.name.value.trim());
  const message = censor(form.message.value.trim());
  const image_url = (form.image_url.value || '').trim();
  const colorPick = (form.color?.value || '#32CD32').trim();

  if (!name || !message) {
    say('Name and message are required.', 'orange');
    return;
  }

  push(ref(db, 'fanwall'), {
    name,
    message,
    image_url,
    color: hex(colorPick) ? colorPick : '#32CD32',
    createdAt: Date.now()
  })
  .then(() => {
    say('Thanks! Your post is live.', '#2ecc71');
    form.reset();
  })
  .catch(err => {
    console.error(err);
    say('Error sending post. Try again later.', 'tomato');
  });
});

// Render graffiti posts
function renderWall(snapshot) {
  stage.innerHTML = '';
  snapshot.forEach(child => {
    const d = child.val();
    if (!d) return;

    const color = d.color || '#32CD32';

    const el = document.createElement('div');
    el.className = 'graffiti-post';
    el.style.color = color; // message color

    // NOTE: inline style on <strong> overrides CSS gold,
    // so the NAME matches the chosen color too.
    el.innerHTML = `
      <strong style="color:${color}">${esc(d.name || 'Fan')}</strong>
      <p style="margin:6px 0 8px 0;">${esc(d.message || '')}</p>
      ${d.image_url ? `<a href="${esc(d.image_url)}" target="_blank" rel="noopener">
        <img src="${esc(d.image_url)}" alt="fan photo">
      </a>` : ''}
    `;

    stage.appendChild(el);

    // Random placement + rotation
    const angle = (Math.random() * 30 - 15).toFixed(1);
    el.style.transform = `rotate(${angle}deg)`;

    const pad = 16;
    const maxL = Math.max(0, stage.clientWidth - el.offsetWidth - pad);
    const maxT = Math.max(0, stage.clientHeight - el.offsetHeight - pad);
    el.style.left = `${Math.floor(Math.random() * (maxL + 1))}px`;
    el.style.top  = `${Math.floor(Math.random() * (maxT + 1))}px`;
    el.style.zIndex = String(10 + Math.floor(Math.random() * 90));
  });
}

// Live updates from DB (no debug text)
onValue(ref(db, 'fanwall'), snapshot => {
  say('');                 // clear any prior “Listening…” text
  renderWall(snapshot);
});
