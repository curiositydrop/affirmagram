// fanwall-simple.js
// Simple, instant-post graffiti wall — keeps your color & censorship.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const statusEl = document.getElementById('fanStatus');
const stage = document.querySelector('.graffiti-wall');
const form  = document.getElementById('fanForm');

// helper for messages
const say = (m,c) => { if(statusEl){ statusEl.textContent=m; if(c) statusEl.style.color=c; } };

// Bad word filter
function censor(text){
  const map = {
    "fuck":"f*#k","fucking":"f*#king","shit":"sh!t","bitch":"b!tch","asshole":"a**hole",
    "dick":"d*ck","pussy":"p*ssy","cunt":"c#+*","bastard":"b*stard","cock":"c*ck",
    "cum":"c*m","twat":"tw*t","prick":"pr*ck","wanker":"w*nker","slut":"sl*t","whore":"wh*re",
    "nigger":"n*****","nigga":"n****","fag":"f*g","faggot":"f*ggot","spic":"sp*c","chink":"ch*nk","kike":"k*ke",
    "retard":"r*tard"
  };
  let s = String(text||'');
  for (const w in map) s = s.replace(new RegExp(`\\b${w}\\b`, 'gi'), map[w]);
  return s;
}

const esc = t => String(t||'').replace(/</g,'&lt;');
const hex = h => /^#([0-9A-F]{6})$/i.test(h);

// Init Firebase
if (!window.FB_CONFIG) {
  say('Firebase config missing.','orange');
} else {
  const app = initializeApp(window.FB_CONFIG);
  const db  = getFirestore(app);

  // Handle form submit
  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    try{
      const colorPick = (form.color?.value || '#32CD32').trim();
      await addDoc(collection(db,'fanwall'),{
        name:    censor(form.name.value.trim()),
        message: censor(form.message.value.trim()),
        image_url: (form.image_url.value||'').trim(),
        color: hex(colorPick) ? colorPick : '#32CD32',
        createdAt: serverTimestamp()
      });
      say('Thanks! Your post is live.','#2ecc71');
      form.reset();
    }catch(err){
      console.error(err);
      say('Couldn’t send right now. Try again later.','tomato');
    }
  });

  // Render one graffiti note
  function render(docSnap){
    const d = docSnap.data();
    if (!d) return;
    const el = document.createElement('div');
    el.className = 'graffiti-post';
    el.style.color = d.color || '#32CD32';
    el.innerHTML = `
      <strong>${esc(d.name||'Fan')}</strong>
      <p style="margin:6px 0 8px 0;">${esc(d.message||'')}</p>
      ${d.image_url ? `<a href="${esc(d.image_url)}" target="_blank" rel="noopener">
        <img src="${esc(d.image_url)}" alt="fan photo">
      </a>` : ''}
    `;
    stage.appendChild(el);
    const angle = (Math.random()*30-15).toFixed(1);
    el.style.transform = `rotate(${angle}deg)`;
    const pad=16, maxL=Math.max(0, stage.clientWidth - el.offsetWidth - pad), maxT=Math.max(0, stage.clientHeight - el.offsetHeight - pad);
    el.style.left = `${Math.floor(Math.random()*(maxL+1))}px`;
    el.style.top  = `${Math.floor(Math.random()*(maxT+1))}px`;
    el.style.zIndex = String(10 + Math.floor(Math.random()*90));
  }

  // Live listener
  const q = query(collection(db,'fanwall'), orderBy('createdAt','desc'));
  onSnapshot(q, (snap)=>{
    stage.innerHTML = '';
    say(`Listening… ${snap.size} posts`, '#aaa');
    snap.forEach(render);
  });
}
