const chat = document.getElementById('chat');
const gallery = document.getElementById('gallery');
const grid = document.getElementById('grid');
const actions = document.getElementById('actions');
const statusBox = document.getElementById('status');
const fineprint = document.getElementById('fineprint');
const btnDIY = document.getElementById('buy-diy');
const btnPRO = document.getElementById('buy-pro');

let brief = null;
let prompts = [];
let selectedPrompt = null;

document.getElementById('next1').onclick = () => proceed('brand');

if (fineprint) {
  fineprint.addEventListener('change', () => {
    const ok = fineprint.checked;
    btnDIY.disabled = !ok;
    btnPRO.disabled = !ok;
  });
}

function addBot(text){
  const d = document.createElement('div');
  d.className = 'bot';
  d.innerHTML = text;
  chat.appendChild(d);
  d.scrollIntoView({behavior:'smooth',block:'end'});
}

function addInput(placeholder, id){
  const wrap = document.createElement('div');
  wrap.className = 'input';
  wrap.innerHTML = `<input id="${id}" placeholder="${placeholder}"><button data-for="${id}">Next →</button>`;
  chat.appendChild(wrap);
  wrap.querySelector('button').onclick = () => proceed(id);
  wrap.scrollIntoView({behavior:'smooth',block:'end'});
  wrap.querySelector('input').focus();
}

async function proceed(id){
  if(id==='brand'){
    const brand = document.getElementById('brand').value.trim();
    if(!brand) return;
    addBot(`Nice. What vibe fits <b>${brand}</b>? (e.g., modern, bold, playful, luxury, rustic, edgy)`);
    addInput('Vibe words', 'vibe');
  } else if(id==='vibe'){
    addBot(`Any colors you love or hate? You can use names or hex codes.`);
    addInput('Colors', 'colors');
  } else if(id==='colors'){
    addBot(`Want me to include a symbol or stay abstract? (e.g., drop, bolt, wolf)`);
    addInput('Symbol idea', 'symbol');
  } else if(id==='symbol'){
    // STEP 1: Placeholder preview (no backend yet)
    addBot('Cooking up a brief and prompts… 🍳');
    statusBox.textContent = 'Demo mode: previews are placeholders until we wire the backend in Step 2.';
    // Make 3 placeholder cards so layout looks right
    gallery.hidden = false;
    grid.innerHTML = '';
    for (let i=1;i<=3;i++){
      const card = document.createElement('div');
      card.className = 'card watermark';
      card.innerHTML = `<img src="https://placehold.co/512x512/png?text=Logo+${i}"><button class="choose">Select</button>`;
      grid.appendChild(card);
      card.querySelector('.choose').onclick = () => {
        selectedPrompt = `placeholder-${i}`;
        Array.from(document.querySelectorAll('.card')).forEach(c => c.style.outline = '');
        card.style.outline = '3px solid #22c55e';
        actions.hidden = false;
        statusBox.textContent = 'Great choice. Accept the terms, then pick DIY or Pro Polish.';
      };
    }
  }
}

// Buttons won’t do anything yet — we wire Stripe in Step 3
btnDIY.onclick = () => alert('Checkout will be enabled after we add serverless functions in Step 2 & 3.');
btnPRO.onclick = () => alert('Checkout will be enabled after we add serverless functions in Step 2 & 3.');

// Success URL handling comes later in Step 3
