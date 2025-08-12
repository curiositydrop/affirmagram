// fanwall-simple.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const statusEl = document.getElementById('fanStatus');
const stage = document.querySelector('.graffiti-wall');
const form  = document.getElementById('fanForm');

// tiny helper
const say = (m,c) => { if(statusEl){ statusEl.textContent=m; if(c) statusEl.style.color=c; } };

// 1) Init (uses window.FB_CONFIG from js/firebase-config.js)
if (!window.FB_CONFIG) { say('FB_CONFIG missing (firebase-config.js not loaded).','orange'); }
const app = initializeApp(window.FB_CONFIG);
const db  = getFirestore(app);

// 2) Profanity masking
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
const isHex = h => /^#([0-9A-F]{6})$/i.test(h);

// 3) Submit → save (NO approval flag)
form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    const pick = (form.color?.value || '#32CD32').trim();
    await addDoc(collection(db,'fanwall'),{
      name:    censor(form.name.value.trim()),
      message: censor(form.message.value.trim()),
      image_url: (form.image_url.value||'').trim(),
      color: isHex(pick) ? pick : '#32CD32',
      createdAt: serverTimestamp()
    });
    say('Thanks! Your post is live.','#2ecc71');
    form.reset();
  }catch(err){
    console.error(err);
    say('Couldn’t send right now. Try again later.','tomato');
  }
});

// 4) Render one note (graffiti style)
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

  // random tilt/position
  const angle = (Math.random()*30-15).toFixed(1);
  el.style.transform = `rotate(${angle}deg)`;
  const pad=16, maxL=Math.max(0, stage.clientWidth - el.offsetWidth - pad), maxT=Math.max(0, stage.clientHeight - el.offsetHeight - pad);
  el.style.left = `${Math.floor(Math.random()*(maxL+1))}px`;
  el.style.top  = `${Math.floor(Math.random()*(maxT+1))}px`;
  el.style.zIndex = String(10 + Math.floor(Math.random()*90));
}

// 5) Live stream (newest first)
const q = query(collection(db,'fanwall'), orderBy('createdAt','desc'));
onSnapshot(q, (snap)=>{
  stage.innerHTML = '';
  say(`Listening… ${snap.size} posts`, '#aaa');
  snap.forEach(render);
});
