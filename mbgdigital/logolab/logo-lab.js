document.addEventListener('DOMContentLoaded', () => {
  const chat = document.getElementById('chat');
  const gallery = document.getElementById('gallery');
  const grid = document.getElementById('grid');
  const actions = document.getElementById('actions');
  const statusBox = document.getElementById('status');
  const fineprint = document.getElementById('fineprint');
  const btnDIY = document.getElementById('buy-diy');
  const btnPRO = document.getElementById('buy-pro');
  const next1 = document.getElementById('next1');

  window.addEventListener('error', (e) => {
    if (statusBox) statusBox.textContent = 'JS error: ' + (e?.message || 'unknown');
  });

  if (!next1) { statusBox.textContent = 'Setup error: missing #next1 button.'; return; }

  let selectedPrompt = null;
  let busy = false;

  next1.onclick = () => proceed('brand');

  if (fineprint) {
    fineprint.addEventListener('change', () => {
      const ok = fineprint.checked;
      if (btnDIY) btnDIY.disabled = !ok;
      if (btnPRO) btnPRO.disabled = !ok;
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
    if (busy) return;
    busy = true;
    try {
      if (id === 'brand') {
        const brand = document.getElementById('brand').value.trim();
        if (!brand) { busy = false; return; }
        addBot(`Nice. What vibe fits <b>${brand}</b>? (e.g., modern, bold, playful, luxury, rustic, edgy)`);
        addInput('Vibe words', 'vibe');

      } else if (id === 'vibe') {
        addBot(`Any colors you love or hate? You can use names or hex codes.`);
        addInput('Colors', 'colors');

      } else if (id === 'colors') {
        addBot(`Want me to include a symbol or stay abstract? (e.g., drop, bolt, wolf)`);
        addInput('Symbol idea', 'symbol');

      } else if (id === 'symbol') {
        const brand  = document.getElementById('brand').value.trim();
        const vibe   = document.getElementById('vibe').value.trim();
        const colors = document.getElementById('colors').value.trim();
        const symbol = document.getElementById('symbol').value.trim();

        addBot('Cooking up a brief and prompts… 🍳');
        statusBox.textContent = 'Generating brief…';

        const briefRes = await fetch('/.netlify/functions/brief', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ brand, vibe, colors, symbol })
        });
        const briefData = await briefRes.json();
        if (briefData.error) {
          statusBox.textContent = 'Error generating brief.';
          console.error('Brief error:', briefData.error);
          busy = false; return;
        }

        const briefText = (briefData.brief || "").replace(/[#*_`>]/g, "");
        if (!briefText) {
          statusBox.textContent = 'Brief came back empty. Please try again.';
          busy = false; return;
        }
        addBot(`<b>Creative Brief</b><br>${briefText}`);

        const firstPrompt = (briefData.prompts && briefData.prompts[0]) || 'minimal geometric monogram';
        statusBox.textContent = 'Rendering logo concepts…';

        const renderRes = await fetch('/.netlify/functions/render', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ prompt: firstPrompt, size: "1024x1024", n: 3 })
        });

        const raw = await renderRes.text();
        let data; try { data = JSON.parse(raw); } catch { data = null; }

        if (!renderRes.ok || (data && data.error)) {
          const snippet = raw.slice(0, 600);
          statusBox.textContent = 'Error rendering concepts: ' + snippet;
          console.error('Render error (raw):', raw);
          busy = false; return;
        }

        const pngs = (data && data.pngs) || [];
        if (!pngs.length) {
          statusBox.textContent = 'No images returned. Try again in a minute.';
          busy = false; return;
        }

        gallery.hidden = false;
        grid.innerHTML = '';
        pngs.forEach((src) => {
          const card = document.createElement('div');
          card.className = 'card watermark';
          card.innerHTML = `<img src="${src}"><button class="choose">Select</button>`;
          grid.appendChild(card);
          card.querySelector('.choose').onclick = () => {
            selectedPrompt = firstPrompt;
            Array.from(document.querySelectorAll('.card')).forEach(c => c.style.outline = '');
            card.style.outline = '3px solid #22c55e';
            actions.hidden = false;
            statusBox.textContent = 'Great choice. Accept the terms, then pick DIY or Pro Polish.';
          };
        });
      }
    } finally {
      busy = false;
    }
  }

  if (btnDIY) btnDIY.onclick = () => alert('Checkout will be enabled after we add serverless functions in Step 3.');
  if (btnPRO) btnPRO.onclick = () => alert('Checkout will be enabled after we add serverless functions in Step 3.');
});
